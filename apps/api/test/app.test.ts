import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabasePool } from '../src/database/pool.js'
import { fetchWithTimeout, startTestServer } from './helpers.js'

const unreachableDatabaseUrl = 'postgresql://cafeclick:unused@127.0.0.1:1/cafeclick'

function createAppWithoutDatabase(context: TestContext) {
  const pool = createDatabasePool(unreachableDatabaseUrl)
  context.after(() => pool.end())
  return createApp(pool)
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
