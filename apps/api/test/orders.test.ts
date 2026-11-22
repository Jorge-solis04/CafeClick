import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { createApp } from '../src/app.js'
import { createDatabasePool } from '../src/database/pool.js'
import { seedCatalog, seedDemoAccounts } from '../src/database/seeds.js'
import type { OrderView } from '../src/orders/orders.js'
import { createCleanupStack, createMigratedDatabase, fetchWithTimeout, startTestServer } from './helpers.js'

const databaseUrl = process.env.TEST_DATABASE_URL
const seedsDirectory = fileURLToPath(new URL('../../../database/seeds/', import.meta.url))
const customer = { email: 'cliente@cafeclick.test', password: 'customer-password', role: 'customer' as const }
const otherCustomer = { email: 'otro@cafeclick.test', password: 'other-password', role: 'customer' as const }
const kitchen = { email: 'cocina@cafeclick.test', password: 'kitchen-password', role: 'kitchen' as const }
const americanoId = 1
const croissantId = 7

type ErrorBody = { error: { code: string } }

async function startOrdersApp(context: TestContext, adminUrl: string) {
  const deferCleanup = createCleanupStack(context)
  const testUrl = await createMigratedDatabase(deferCleanup, adminUrl)
  await seedCatalog(testUrl, seedsDirectory)
  await seedDemoAccounts(testUrl, [customer, otherCustomer, kitchen])

  const pool = createDatabasePool(testUrl)
  deferCleanup(() => pool.end())

  const client = new Client({ connectionString: testUrl })
  await client.connect()
  deferCleanup(() => client.end())

  const baseUrl = await startTestServer(context, createApp(pool))

  async function loginAs(account: { email: string, password: string }) {
    const response = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    })
    assert.equal(response.status, 200)
    return (await response.json() as { token: string }).token
  }

  return { baseUrl, client, loginAs }
}

function sendJson(url: string, method: string, token: string, body: unknown) {
  return fetchWithTimeout(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

function listOrders(baseUrl: string, token: string) {
  return fetchWithTimeout(`${baseUrl}/api/orders`, { headers: { Authorization: `Bearer ${token}` } })
}

async function placeOrder(baseUrl: string, token: string, items: unknown) {
  const response = await sendJson(`${baseUrl}/api/orders`, 'POST', token, { items })
  assert.equal(response.status, 201)
  return (await response.json() as { order: OrderView }).order
}

function advance(baseUrl: string, token: string, orderId: number | string, status: string) {
  return sendJson(`${baseUrl}/api/orders/${orderId}/status`, 'PATCH', token, { status })
}

test('customers place orders priced by PostgreSQL, not by the client', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, client, loginAs } = await startOrdersApp(context, databaseUrl)
  const token = await loginAs(customer)

  const response = await sendJson(`${baseUrl}/api/orders`, 'POST', token, {
    total: '0.01',
    items: [
      { productId: croissantId, quantity: 1, unitPrice: '0.01' },
      { productId: americanoId, quantity: 3 },
    ],
  })
  assert.equal(response.status, 201)
  assert.equal(response.headers.get('cache-control'), 'no-store')

  const { order } = await response.json() as { order: OrderView }
  assert.equal(order.status, 'pending')
  assert.equal(order.version, 1)
  assert.equal(order.total, '162.50')
  assert.ok(!Number.isNaN(Date.parse(order.createdAt)))
  assert.deepEqual(order.items, [
    { productId: americanoId, name: 'Café americano', quantity: 3, unitPrice: '42.50' },
    { productId: croissantId, name: 'Croissant', quantity: 1, unitPrice: '35.00' },
  ])

  const { rows } = await client.query<{ total: string }>('SELECT total FROM orders WHERE id = $1', [order.id])
  assert.equal(rows[0]?.total, '162.50')
})

test('invalid carts and unknown products are rejected without saving anything', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, client, loginAs } = await startOrdersApp(context, databaseUrl)
  const token = await loginAs(customer)
  const ordersUrl = `${baseUrl}/api/orders`

  for (const items of [[], [{ productId: americanoId, quantity: 0 }], [{ productId: americanoId, quantity: 1 }, { productId: americanoId, quantity: 1 }]]) {
    const response = await sendJson(ordersUrl, 'POST', token, { items })
    assert.equal(response.status, 400)
    assert.equal((await response.json() as ErrorBody).error.code, 'invalid_order')
  }

  const unknownProduct = await sendJson(ordersUrl, 'POST', token, {
    items: [{ productId: americanoId, quantity: 1 }, { productId: 9999, quantity: 1 }],
  })
  assert.equal(unknownProduct.status, 400)
  assert.equal((await unknownProduct.json() as ErrorBody).error.code, 'unknown_product')

  const malformedJson = await fetchWithTimeout(ordersUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{"items":',
  })
  assert.equal(malformedJson.status, 400)
  assert.equal((await malformedJson.json() as ErrorBody).error.code, 'invalid_request')

  const { rows } = await client.query<{ orders: string, items: string }>(
    'SELECT (SELECT count(*) FROM orders) AS orders, (SELECT count(*) FROM order_items) AS items',
  )
  assert.deepEqual(rows[0], { orders: '0', items: '0' })
})

test('order routes require a session and the right role', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, loginAs } = await startOrdersApp(context, databaseUrl)
  const customerToken = await loginAs(customer)
  const kitchenToken = await loginAs(kitchen)

  const anonymous = await fetchWithTimeout(`${baseUrl}/api/orders`)
  assert.equal(anonymous.status, 401)

  const kitchenPlacing = await sendJson(`${baseUrl}/api/orders`, 'POST', kitchenToken, { items: [{ productId: americanoId, quantity: 1 }] })
  assert.equal(kitchenPlacing.status, 403)

  const order = await placeOrder(baseUrl, customerToken, [{ productId: americanoId, quantity: 1 }])
  const customerAdvancing = await advance(baseUrl, customerToken, order.id, 'preparing')
  assert.equal(customerAdvancing.status, 403)
  assert.equal((await customerAdvancing.json() as ErrorBody).error.code, 'forbidden')
})

test('customers only see their own orders, newest first', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, loginAs } = await startOrdersApp(context, databaseUrl)
  const customerToken = await loginAs(customer)
  const otherToken = await loginAs(otherCustomer)

  const first = await placeOrder(baseUrl, customerToken, [{ productId: americanoId, quantity: 1 }])
  const second = await placeOrder(baseUrl, customerToken, [{ productId: croissantId, quantity: 2 }])
  const foreign = await placeOrder(baseUrl, otherToken, [{ productId: croissantId, quantity: 1 }])

  const response = await listOrders(baseUrl, customerToken)
  assert.equal(response.status, 200)
  const { orders } = await response.json() as { orders: OrderView[] }
  assert.deepEqual(orders.map((order) => order.id), [second.id, first.id])
  assert.ok(!orders.some((order) => order.id === foreign.id))
  assert.deepEqual(orders[0]?.items, second.items)
})

test('kitchen sees open orders oldest first and advances them one step at a time', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, loginAs } = await startOrdersApp(context, databaseUrl)
  const customerToken = await loginAs(customer)
  const otherToken = await loginAs(otherCustomer)
  const kitchenToken = await loginAs(kitchen)

  const first = await placeOrder(baseUrl, customerToken, [{ productId: americanoId, quantity: 1 }])
  const second = await placeOrder(baseUrl, otherToken, [{ productId: croissantId, quantity: 1 }])

  const panel = await listOrders(baseUrl, kitchenToken)
  assert.deepEqual((await panel.json() as { orders: OrderView[] }).orders.map((order) => order.id), [first.id, second.id])

  const skipped = await advance(baseUrl, kitchenToken, first.id, 'ready')
  assert.equal(skipped.status, 409)
  assert.equal((await skipped.json() as ErrorBody).error.code, 'invalid_transition')

  for (const [index, status] of (['preparing', 'ready', 'delivered'] as const).entries()) {
    const response = await advance(baseUrl, kitchenToken, first.id, status)
    assert.equal(response.status, 200)
    const { order } = await response.json() as { order: OrderView }
    assert.equal(order.status, status)
    assert.equal(order.version, index + 2)
    assert.deepEqual(order.items, first.items)
  }

  for (const status of ['pending', 'preparing', 'ready', 'delivered']) {
    assert.equal((await advance(baseUrl, kitchenToken, first.id, status)).status, 409)
  }

  const remaining = await listOrders(baseUrl, kitchenToken)
  assert.deepEqual((await remaining.json() as { orders: OrderView[] }).orders.map((order) => order.id), [second.id])
})

test('concurrent status updates only apply once', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, loginAs } = await startOrdersApp(context, databaseUrl)
  const kitchenToken = await loginAs(kitchen)
  const order = await placeOrder(baseUrl, await loginAs(customer), [{ productId: americanoId, quantity: 1 }])

  const responses = await Promise.all(Array.from({ length: 5 }, () => advance(baseUrl, kitchenToken, order.id, 'preparing')))
  const statuses = responses.map((response) => response.status).sort()
  assert.deepEqual(statuses, [200, 409, 409, 409, 409])
})

test('status updates reject unknown orders and unknown statuses', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, loginAs } = await startOrdersApp(context, databaseUrl)
  const kitchenToken = await loginAs(kitchen)
  const order = await placeOrder(baseUrl, await loginAs(customer), [{ productId: americanoId, quantity: 1 }])

  for (const orderId of [9999, 'abc']) {
    const response = await advance(baseUrl, kitchenToken, orderId, 'preparing')
    assert.equal(response.status, 404)
    assert.equal((await response.json() as ErrorBody).error.code, 'order_not_found')
  }

  const unknownStatus = await advance(baseUrl, kitchenToken, order.id, 'cancelled')
  assert.equal(unknownStatus.status, 400)
  assert.equal((await unknownStatus.json() as ErrorBody).error.code, 'invalid_request')
})
