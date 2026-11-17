import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabasePool } from '../src/database/pool.js'
import { fetchWithTimeout, startTestServer } from './helpers.js'

const unreachableDatabaseUrl = 'postgresql://cafeclick:unused@127.0.0.1:1/cafeclick'

function createAppWithoutDatabase(context: TestContext, webOrigin?: string) {
  const pool = createDatabasePool(unreachableDatabaseUrl)
  context.after(() => pool.end())
  return createApp(pool, webOrigin)
}

test('GET / returns the API startup message', async (context) => {
  const baseUrl = await startTestServer(context, createAppWithoutDatabase(context))

  const response = await fetchWithTimeout(`${baseUrl}/`)

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { message: 'CaféClick API is running' })
})

test('GET /api/health returns 503 when PostgreSQL is unreachable', async (context) => {
  const baseUrl = await startTestServer(context, createAppWithoutDatabase(context))

  const response = await fetchWithTimeout(`${baseUrl}/api/health`)

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    error: { code: 'database_unavailable', message: 'La API no puede consultar PostgreSQL.' },
  })
})

test('GET /api/products returns a JSON error when PostgreSQL is unreachable', async (context) => {
  const baseUrl = await startTestServer(context, createAppWithoutDatabase(context))

  const response = await fetchWithTimeout(`${baseUrl}/api/products`)

  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), {
    error: { code: 'internal_error', message: 'Ocurrió un error inesperado.' },
  })
})

test('GET /api/products shares responses with the configured frontend origin only', async (context) => {
  const webOrigin = 'https://cafeclick.example.com'
  const baseUrl = await startTestServer(context, createAppWithoutDatabase(context, webOrigin))

  const allowed = await fetchWithTimeout(`${baseUrl}/api/products`, { headers: { Origin: webOrigin } })
  const rejected = await fetchWithTimeout(`${baseUrl}/api/products`, {
    headers: { Origin: `${webOrigin}.invalid` },
  })

  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), webOrigin)
  assert.equal(allowed.headers.get('Vary'), 'Origin')
  assert.equal(rejected.headers.get('Access-Control-Allow-Origin'), null)
})

test('a configured frontend origin with a trailing slash still matches the browser origin', async (context) => {
  const webOrigin = 'https://cafeclick.example.com'
  const baseUrl = await startTestServer(context, createAppWithoutDatabase(context, `${webOrigin}/`))

  const response = await fetchWithTimeout(`${baseUrl}/api/products`, { headers: { Origin: webOrigin } })

  assert.equal(response.headers.get('Access-Control-Allow-Origin'), webOrigin)
})

test('createApp rejects a frontend origin that is not a valid URL', (context) => {
  assert.throws(() => createAppWithoutDatabase(context, 'cafeclick.netlify.app'), TypeError)
})

test('OPTIONS /api/products allows the frontend to send API request headers', async (context) => {
  const webOrigin = 'https://cafeclick.example.com'
  const baseUrl = await startTestServer(context, createAppWithoutDatabase(context, webOrigin))

  const response = await fetchWithTimeout(`${baseUrl}/api/products`, {
    method: 'OPTIONS',
    headers: {
      Origin: webOrigin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
  })

  assert.equal(response.status, 204)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), webOrigin)
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET,HEAD')
  assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'Authorization,Content-Type')
})
