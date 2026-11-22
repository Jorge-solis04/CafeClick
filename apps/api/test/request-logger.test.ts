import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import express from 'express'
import { formatRequestLog, requestLogger } from '../src/http/requestLogger.js'
import { fetchWithTimeout, startTestServer } from './helpers.js'

async function startLoggedApp(context: TestContext) {
  const lines: string[] = []
  const app = express()
  app.use(requestLogger((line) => lines.push(line)))
  app.post('/login', express.json(), (_request, response) => {
    response.status(401).json({ error: 'invalid_credentials' })
  })
  app.get('/orders', (_request, response) => {
    response.locals.sessionUser = { id: 7, email: 'cocina@cafeclick.test', role: 'kitchen' }
    response.json({ orders: [] })
  })

  return { baseUrl: await startTestServer(context, app), lines }
}

async function waitForLines(lines: string[], count: number) {
  for (let attempt = 0; lines.length < count && attempt < 50; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

test('request logs include method, path, status, duration and session user', () => {
  assert.equal(
    formatRequestLog({ method: 'PATCH', path: '/api/orders/3/status', status: 200, durationMs: 12.345, user: { id: 7, email: 'cocina@cafeclick.test', role: 'kitchen' }, aborted: false }),
    'PATCH /api/orders/3/status 200 12.3ms user=7(kitchen)',
  )
  assert.equal(
    formatRequestLog({ method: 'GET', path: '/api/products', status: 200, durationMs: 0.04, aborted: true }),
    'GET /api/products aborted 0.0ms',
  )
})

test('every request is logged once without query strings, bodies or tokens', async (context) => {
  const { baseUrl, lines } = await startLoggedApp(context)

  await fetchWithTimeout(`${baseUrl}/login?email=cliente@cafeclick.test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret-token' },
    body: JSON.stringify({ email: 'cliente@cafeclick.test', password: 'super-secret' }),
  })
  await fetchWithTimeout(`${baseUrl}/orders`)
  await fetchWithTimeout(`${baseUrl}/missing`)
  await waitForLines(lines, 3)

  assert.equal(lines.length, 3)
  assert.match(lines[0]!, /^POST \/login 401 \d+\.\dms$/)
  assert.match(lines[1]!, /^GET \/orders 200 \d+\.\dms user=7\(kitchen\)$/)
  assert.match(lines[2]!, /^GET \/missing 404 \d+\.\dms$/)

  for (const secret of ['super-secret', 'secret-token', 'cliente@cafeclick.test']) {
    assert.ok(!lines.join('\n').includes(secret), secret)
  }
})
