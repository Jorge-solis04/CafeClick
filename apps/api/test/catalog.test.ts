import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { createApp } from '../src/app.js'
import { verifyPassword } from '../src/auth/password.js'
import { migrateDatabase } from '../src/database/migrations.js'
import { createDatabasePool } from '../src/database/pool.js'
import { seedCatalog, seedDemoAccounts } from '../src/database/seeds.js'
import { createCleanupStack, fetchWithTimeout, startTestServer } from './helpers.js'

const databaseUrl = process.env.TEST_DATABASE_URL
const migrationsDirectory = fileURLToPath(new URL('../../../database/migrations/', import.meta.url))
const seedsDirectory = fileURLToPath(new URL('../../../database/seeds/', import.meta.url))

const databaseInUseErrorCode = '55006'

async function dropDatabaseWhenIdle(admin: Client, databaseName: string) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`)
      return
    } catch (error) {
      if ((error as { code?: string }).code !== databaseInUseErrorCode || attempt === 20) {
        throw error
      }

      await setTimeout(100)
    }
  }
}

async function createMigratedDatabase(deferCleanup: (cleanup: () => Promise<void>) => void, adminUrl: string) {
  const databaseName = `cafeclick_test_${randomUUID().replaceAll('-', '')}`
  const testUrl = new URL(adminUrl)
  testUrl.pathname = `/${databaseName}`

  const admin = new Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${databaseName}`)
  deferCleanup(async () => {
    try {
      await dropDatabaseWhenIdle(admin, databaseName)
    } finally {
      await admin.end()
    }
  })

  await migrateDatabase(testUrl.href, migrationsDirectory)
  return testUrl.href
}

test('health and catalog routes read real PostgreSQL data', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const deferCleanup = createCleanupStack(context)
  const testUrl = await createMigratedDatabase(deferCleanup, databaseUrl)
  const pool = createDatabasePool(testUrl)
  deferCleanup(() => pool.end())
  const baseUrl = await startTestServer(context, createApp(pool))

  const healthResponse = await fetchWithTimeout(`${baseUrl}/api/health`)
  assert.equal(healthResponse.status, 200)
  assert.deepEqual(await healthResponse.json(), { status: 'ok' })

  const emptyResponse = await fetchWithTimeout(`${baseUrl}/api/products`)
  assert.equal(emptyResponse.status, 200)
  assert.deepEqual(await emptyResponse.json(), { products: [] })

  await seedCatalog(testUrl, seedsDirectory)
  await seedCatalog(testUrl, seedsDirectory)

  const catalogResponse = await fetchWithTimeout(`${baseUrl}/api/products`)
  assert.equal(catalogResponse.status, 200)
  const { products } = await catalogResponse.json() as { products: { id: number; name: string; price: string; category: string }[] }

  assert.equal(products.length, 10)
  assert.equal(new Set(products.map((product) => product.name)).size, products.length)
  assert.deepEqual(products.map((product) => product.id), [...products.map((product) => product.id)].sort((left, right) => left - right))
  for (const product of products) {
    assert.deepEqual(Object.keys(product).sort(), ['category', 'id', 'name', 'price'])
    assert.ok(Number.isInteger(product.id) && product.id > 0)
    assert.match(product.price, /^\d+\.\d{2}$/)
  }
  assert.deepEqual(products.slice(0, 2), [
    { id: products[0]?.id, name: 'Café americano', price: '42.50', category: 'drinks' },
    { id: products[1]?.id, name: 'Café de olla', price: '38.00', category: 'drinks' },
  ])
  assert.equal(products.at(-1)?.name, 'Sándwich de jamón y queso')
  assert.equal(products.at(-1)?.category, 'food')
  assert.equal(products.filter((product) => product.category === 'drinks').length, 6)
})

test('demo account seed stores hashed passwords and can be rerun', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const deferCleanup = createCleanupStack(context)
  const testUrl = await createMigratedDatabase(deferCleanup, databaseUrl)

  await seedDemoAccounts(testUrl, [
    { email: 'Cliente@CafeClick.test', password: 'first-password', role: 'customer' },
    { email: 'cocina@cafeclick.test', password: 'kitchen-password', role: 'kitchen' },
  ])
  await seedDemoAccounts(testUrl, [
    { email: 'cliente@cafeclick.test', password: 'second-password', role: 'customer' },
  ])

  const client = new Client({ connectionString: testUrl })
  await client.connect()
  deferCleanup(() => client.end())

  const { rows } = await client.query<{ email: string; role: string; password_hash: string }>(
    'SELECT email, role, password_hash FROM users ORDER BY email',
  )

  assert.deepEqual(rows.map(({ email, role }) => ({ email, role })), [
    { email: 'cliente@cafeclick.test', role: 'customer' },
    { email: 'cocina@cafeclick.test', role: 'kitchen' },
  ])
  assert.equal(await verifyPassword('second-password', rows[0].password_hash), true)
  assert.equal(await verifyPassword('first-password', rows[0].password_hash), false)
  assert.equal(await verifyPassword('kitchen-password', rows[1].password_hash), true)
})
