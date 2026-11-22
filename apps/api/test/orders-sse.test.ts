import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test, type TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { Request, Response } from 'express'
import { createApp } from '../src/app.js'
import { createDatabasePool } from '../src/database/pool.js'
import { seedCatalog, seedDemoAccounts } from '../src/database/seeds.js'
import { createOrderEventHub, type OrderEventHubOptions } from '../src/orders/events.js'
import type { OrderView } from '../src/orders/orders.js'
import { createCleanupStack, createMigratedDatabase, fetchWithTimeout, startTestServer } from './helpers.js'

const databaseUrl = process.env.TEST_DATABASE_URL
const seedsDirectory = fileURLToPath(new URL('../../../database/seeds/', import.meta.url))
const customer = { email: 'cliente@cafeclick.test', password: 'customer-password', role: 'customer' as const }
const otherCustomer = { email: 'otro@cafeclick.test', password: 'other-password', role: 'customer' as const }
const kitchen = { email: 'cocina@cafeclick.test', password: 'kitchen-password', role: 'kitchen' as const }
const americanoId = 1

type ErrorBody = { error: { code: string } }

type SseMessage = {
  id: string | null
  event: string | null
  data: string | null
}

function createFakeStreamPair() {
  const request = new EventEmitter()
  const chunks: string[] = []
  const headers = new Map<string, string>()

  const response = Object.assign(new EventEmitter(), {
    statusCode: 0,
    writableEnded: false,
    destroyed: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value)
    },
    flushHeaders() {},
    write(chunk: string) {
      chunks.push(chunk)
      return true
    },
    end() {
      this.writableEnded = true
      this.emit('close')
    },
  })

  return {
    request: request as unknown as Request,
    response: response as unknown as Response,
    disconnect() {
      response.destroyed = true
      request.emit('close')
    },
    chunks,
    headers,
  }
}

function parseSseFrame(frame: string): SseMessage | null {
  const lines = frame.split('\n')
  let id: string | null = null
  let event: string | null = null
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue
    }

    if (line.startsWith('id:')) {
      id = line.slice(3).trim()
    } else if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  if (id === null && event === null && dataLines.length === 0) {
    return null
  }

  return { id, event, data: dataLines.length > 0 ? dataLines.join('\n') : null }
}

class SseReader {
  private readonly controller = new AbortController()
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>
  private readonly decoder = new TextDecoder()
  private buffer = ''
  private readonly queue: SseMessage[] = []
  private readonly waiters: Array<{ resolve: (message: SseMessage) => void, reject: (error: Error) => void }> = []
  private closed = false

  constructor(private readonly response: globalThis.Response, controller: AbortController) {
    this.controller = controller
    assert.ok(response.body, 'SSE response must have a readable body')
    this.reader = response.body.getReader()
    void this.pump()
  }

  private async pump() {
    try {
      while (true) {
        const { value, done } = await this.reader.read()
        if (done) {
          break
        }

        this.buffer += this.decoder.decode(value, { stream: true }).replaceAll('\r\n', '\n')
        let boundary = this.buffer.indexOf('\n\n')

        while (boundary !== -1) {
          const frame = this.buffer.slice(0, boundary)
          this.buffer = this.buffer.slice(boundary + 2)
          const parsed = parseSseFrame(frame)

          if (parsed) {
            const waiter = this.waiters.shift()
            if (waiter) {
              waiter.resolve(parsed)
            } else {
              this.queue.push(parsed)
            }
          }

          boundary = this.buffer.indexOf('\n\n')
        }
      }
    } catch {
      // Stream aborted during teardown.
    } finally {
      this.closed = true
      while (this.waiters.length > 0) {
        this.waiters.shift()!.reject(new Error('SSE stream closed before receiving the expected event'))
      }
    }
  }

  nextEvent(timeoutMs = 3000): Promise<SseMessage> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!)
    }

    if (this.closed) {
      return Promise.reject(new Error('SSE stream is already closed'))
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter)
        if (index !== -1) {
          this.waiters.splice(index, 1)
        }
        reject(new Error(`Timed out waiting for SSE event after ${timeoutMs}ms`))
      }, timeoutMs)

      const waiter = {
        resolve: (message: SseMessage) => {
          clearTimeout(timer)
          resolve(message)
        },
        reject: (error: Error) => {
          clearTimeout(timer)
          reject(error)
        },
      }

      this.waiters.push(waiter)
    })
  }

  async expectNoEvent(waitMs = 150) {
    if (this.queue.length > 0) {
      assert.fail(`Expected no SSE event, but received ${JSON.stringify(this.queue[0])}`)
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs))
    assert.equal(this.queue.length, 0, `Expected no SSE event, but received ${JSON.stringify(this.queue[0])}`)
  }

  async close() {
    this.controller.abort()
    try {
      await this.reader.cancel()
    } catch {
      // Ignore abort errors on cancel.
    }
  }
}

async function openSseStream(url: string) {
  const controller = new AbortController()
  const response = await fetch(url, {
    headers: { Accept: 'text/event-stream' },
    signal: controller.signal,
  })
  return { response, reader: response.ok ? new SseReader(response, controller) : null }
}

async function startSseApp(context: TestContext, adminUrl: string, hubOptions?: OrderEventHubOptions) {
  const deferCleanup = createCleanupStack(context)
  const testUrl = await createMigratedDatabase(deferCleanup, adminUrl)
  await seedCatalog(testUrl, seedsDirectory)
  await seedDemoAccounts(testUrl, [customer, otherCustomer, kitchen])

  const pool = createDatabasePool(testUrl)
  deferCleanup(() => pool.end())

  const eventHub = createOrderEventHub(hubOptions)
  deferCleanup(async () => eventHub.close())

  const baseUrl = await startTestServer(context, createApp(pool, undefined, undefined, eventHub))

  async function loginAs(account: { email: string, password: string }) {
    const response = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    })
    assert.equal(response.status, 200)
    return (await response.json() as { token: string }).token
  }

  async function requestStreamTicket(token: string) {
    const response = await fetchWithTimeout(`${baseUrl}/api/orders/stream-ticket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(response.status, 201)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    return await response.json() as { ticket: string, expiresAt: string }
  }

  return { baseUrl, eventHub, loginAs, requestStreamTicket }
}

test('stream tickets are opaque, single-use, and expire after their TTL', () => {
  let currentMs = Date.parse('2026-11-22T12:00:00.000Z')
  const hub = createOrderEventHub({
    ticketLifetimeMs: 30_000,
    heartbeatIntervalMs: 0,
    now: () => new Date(currentMs),
  })

  const user = { id: 1, email: 'cliente@cafeclick.test', role: 'customer' as const }
  const first = hub.issueTicket(user)
  assert.match(first.ticket, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(first.expiresAt.toISOString(), '2026-11-22T12:00:30.000Z')

  assert.deepEqual(hub.consumeTicket(first.ticket), user)
  assert.equal(hub.consumeTicket(first.ticket), null)
  assert.equal(hub.consumeTicket('not-a-valid-ticket'), null)

  const expiring = hub.issueTicket(user)
  currentMs += 30_000
  assert.equal(hub.consumeTicket(expiring.ticket), null)
  hub.close()
})

test('event hub keeps connections alive, routes by role/owner, and cleans up disconnected subscribers', async () => {
  const hub = createOrderEventHub({ heartbeatIntervalMs: 20 })
  const kitchenStream = createFakeStreamPair()
  const ownerStream = createFakeStreamPair()
  const otherStream = createFakeStreamPair()

  hub.subscribe(kitchenStream.request, kitchenStream.response, { id: 10, email: 'cocina@cafeclick.test', role: 'kitchen' })
  hub.subscribe(ownerStream.request, ownerStream.response, { id: 1, email: 'cliente@cafeclick.test', role: 'customer' })
  hub.subscribe(otherStream.request, otherStream.response, { id: 2, email: 'otro@cafeclick.test', role: 'customer' })

  assert.equal(hub.subscriberCount(), 3)
  assert.equal(kitchenStream.headers.get('content-type'), 'text/event-stream; charset=utf-8')
  assert.equal(kitchenStream.headers.get('x-accel-buffering'), 'no')

  const sampleOrder: OrderView = {
    id: 42,
    status: 'pending',
    version: 1,
    createdAt: '2026-11-22T12:00:00.000Z',
    total: '42.50',
    items: [{ productId: 1, name: 'Café americano', quantity: 1, unitPrice: '42.50' }],
  }

  hub.publishOrderCreated(sampleOrder)
  assert.ok(kitchenStream.chunks.some((chunk) => chunk.includes('event: order.created')))
  assert.ok(!ownerStream.chunks.some((chunk) => chunk.includes('event: order.created')))
  assert.ok(!otherStream.chunks.some((chunk) => chunk.includes('event: order.created')))

  hub.publishOrderStatusUpdated({ ...sampleOrder, status: 'preparing', version: 2 }, 1)
  assert.ok(kitchenStream.chunks.some((chunk) => chunk.includes('event: order.status.updated') && chunk.includes('"version":2')))
  assert.ok(ownerStream.chunks.some((chunk) => chunk.includes('event: order.status.updated') && chunk.includes('"version":2')))
  assert.ok(!otherStream.chunks.some((chunk) => chunk.includes('event: order.status.updated')))

  await new Promise((resolve) => setTimeout(resolve, 45))
  assert.ok(kitchenStream.chunks.some((chunk) => chunk === ': keep-alive\n\n'))

  otherStream.disconnect()
  assert.equal(hub.subscriberCount(), 2)

  hub.close()
  assert.equal(hub.subscriberCount(), 0)
})

test('SSE stream enforces one-time tickets and routes post-commit order events with customer isolation', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  let currentMs = Date.parse('2026-11-22T12:00:00.000Z')
  const { baseUrl, eventHub, loginAs, requestStreamTicket } = await startSseApp(context, databaseUrl, {
    ticketLifetimeMs: 30_000,
    heartbeatIntervalMs: 1000,
    now: () => new Date(currentMs),
  })

  const anonymousTicket = await fetchWithTimeout(`${baseUrl}/api/orders/stream-ticket`, { method: 'POST' })
  assert.equal(anonymousTicket.status, 401)

  const missingTicket = await fetchWithTimeout(`${baseUrl}/api/orders/stream`)
  assert.equal(missingTicket.status, 401)
  assert.equal((await missingTicket.json() as ErrorBody).error.code, 'invalid_stream_ticket')

  const customerToken = await loginAs(customer)
  const otherToken = await loginAs(otherCustomer)
  const kitchenToken = await loginAs(kitchen)

  const expiredTicket = await requestStreamTicket(customerToken)
  currentMs += 31_000
  const expiredResponse = await fetchWithTimeout(`${baseUrl}/api/orders/stream?ticket=${encodeURIComponent(expiredTicket.ticket)}`)
  assert.equal(expiredResponse.status, 401)
  assert.equal((await expiredResponse.json() as ErrorBody).error.code, 'invalid_stream_ticket')

  const kitchenTicket = await requestStreamTicket(kitchenToken)
  const customerTicket = await requestStreamTicket(customerToken)
  const otherTicket = await requestStreamTicket(otherToken)

  const kitchenConn = await openSseStream(`${baseUrl}/api/orders/stream?ticket=${encodeURIComponent(kitchenTicket.ticket)}`)
  const customerConn = await openSseStream(`${baseUrl}/api/orders/stream?ticket=${encodeURIComponent(customerTicket.ticket)}`)
  const otherConn = await openSseStream(`${baseUrl}/api/orders/stream?ticket=${encodeURIComponent(otherTicket.ticket)}`)

  assert.equal(kitchenConn.response.status, 200)
  assert.equal(customerConn.response.status, 200)
  assert.equal(otherConn.response.status, 200)
  assert.ok(kitchenConn.reader && customerConn.reader && otherConn.reader)

  context.after(async () => {
    await Promise.all([kitchenConn.reader?.close(), customerConn.reader?.close(), otherConn.reader?.close()])
  })

  const reusedTicket = await fetchWithTimeout(`${baseUrl}/api/orders/stream?ticket=${encodeURIComponent(kitchenTicket.ticket)}`)
  assert.equal(reusedTicket.status, 401)
  assert.equal((await reusedTicket.json() as ErrorBody).error.code, 'invalid_stream_ticket')
  assert.equal(eventHub.subscriberCount(), 3)

  const createResponse = await fetchWithTimeout(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ items: [{ productId: americanoId, quantity: 2 }] }),
  })
  assert.equal(createResponse.status, 201)
  const { order: createdOrder } = await createResponse.json() as { order: OrderView }
  assert.equal(createdOrder.version, 1)

  const kitchenCreatedEvent = await kitchenConn.reader.nextEvent()
  assert.equal(kitchenCreatedEvent.event, 'order.created')
  assert.equal(kitchenCreatedEvent.id, `${createdOrder.id}-1`)
  assert.deepEqual(JSON.parse(kitchenCreatedEvent.data!), createdOrder)

  await Promise.all([customerConn.reader.expectNoEvent(), otherConn.reader.expectNoEvent()])

  const invalidTransition = await fetchWithTimeout(`${baseUrl}/api/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kitchenToken}` },
    body: JSON.stringify({ status: 'ready' }),
  })
  assert.equal(invalidTransition.status, 409)
  await Promise.all([
    kitchenConn.reader.expectNoEvent(),
    customerConn.reader.expectNoEvent(),
    otherConn.reader.expectNoEvent(),
  ])

  const advanceResponse = await fetchWithTimeout(`${baseUrl}/api/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kitchenToken}` },
    body: JSON.stringify({ status: 'preparing' }),
  })
  assert.equal(advanceResponse.status, 200)
  const { order: updatedOrder } = await advanceResponse.json() as { order: OrderView }
  assert.equal(updatedOrder.status, 'preparing')
  assert.equal(updatedOrder.version, 2)

  const [kitchenUpdatedEvent, customerUpdatedEvent] = await Promise.all([
    kitchenConn.reader.nextEvent(),
    customerConn.reader.nextEvent(),
  ])
  assert.equal(kitchenUpdatedEvent.event, 'order.status.updated')
  assert.equal(kitchenUpdatedEvent.id, `${createdOrder.id}-2`)
  assert.deepEqual(JSON.parse(kitchenUpdatedEvent.data!), updatedOrder)

  assert.equal(customerUpdatedEvent.event, 'order.status.updated')
  assert.equal(customerUpdatedEvent.id, `${createdOrder.id}-2`)
  assert.deepEqual(JSON.parse(customerUpdatedEvent.data!), updatedOrder)

  await otherConn.reader.expectNoEvent()

  await otherConn.reader.close()
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.equal(eventHub.subscriberCount(), 2)
})
