import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { drizzle } from 'drizzle-orm/node-postgres'
import express from 'express'
import { Client } from 'pg'
import { createApp } from '../src/app.js'
import { getSessionUser, requireRole, requireSession } from '../src/auth/middleware.js'
import { createDatabasePool } from '../src/database/pool.js'
import { seedDemoAccounts } from '../src/database/seeds.js'
import { createCleanupStack, createMigratedDatabase, fetchWithTimeout, startTestServer } from './helpers.js'

const databaseUrl = process.env.TEST_DATABASE_URL
const customer = { email: 'cliente@cafeclick.test', password: 'customer-password', role: 'customer' as const }
const kitchen = { email: 'cocina@cafeclick.test', password: 'kitchen-password', role: 'kitchen' as const }
const invalidCredentials = { error: { code: 'invalid_credentials', message: 'Credenciales inválidas.' } }

type LoginResponse = {
  token: string
  expiresAt: string
  user: { id: number; email: string; role: string }
}

async function startAuthApp(context: TestContext, adminUrl: string) {
  const deferCleanup = createCleanupStack(context)
  const testUrl = await createMigratedDatabase(deferCleanup, adminUrl)
  await seedDemoAccounts(testUrl, [customer, kitchen])

  const pool = createDatabasePool(testUrl)
  deferCleanup(() => pool.end())

  const app = createApp(pool)
  const kitchenOnlyApp = express()
  const database = drizzle(pool)
  kitchenOnlyApp.get('/kitchen-only', requireSession(database), requireRole('kitchen'), (_request, response) => {
    response.json({ role: getSessionUser(response).role })
  })

  const client = new Client({ connectionString: testUrl })
  await client.connect()
  deferCleanup(() => client.end())

  return {
    baseUrl: await startTestServer(context, app),
    kitchenOnlyUrl: `${await startTestServer(context, kitchenOnlyApp)}/kitchen-only`,
    client,
  }
}

function login(baseUrl: string, body: unknown) {
  return fetchWithTimeout(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function authorizedGet(url: string, token: string) {
  return fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } })
}

test('valid credentials open a session that identifies the user and role', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl } = await startAuthApp(context, databaseUrl)

  const response = await login(baseUrl, { email: '  Cliente@CafeClick.test ', password: customer.password })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')

  const session = await response.json() as LoginResponse
  assert.match(session.token, /^[A-Za-z0-9_-]{43}$/)
  assert.deepEqual({ email: session.user.email, role: session.user.role }, { email: customer.email, role: 'customer' })
  assert.ok(new Date(session.expiresAt).getTime() > Date.now())

  const sessionResponse = await authorizedGet(`${baseUrl}/api/auth/session`, session.token)
  assert.equal(sessionResponse.status, 200)
  assert.deepEqual(await sessionResponse.json(), { user: session.user })
})

test('unknown emails and wrong passwords get the same 401 response', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, client } = await startAuthApp(context, databaseUrl)

  const wrongPassword = await login(baseUrl, { email: customer.email, password: 'not-the-password' })
  const unknownEmail = await login(baseUrl, { email: 'nadie@cafeclick.test', password: customer.password })
  const oversizedPassword = await login(baseUrl, { email: customer.email, password: 'a'.repeat(73) })

  for (const response of [wrongPassword, unknownEmail, oversizedPassword]) {
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), invalidCredentials)
  }

  await client.query(`UPDATE users SET password_hash = 'not-a-bcrypt-hash' WHERE email = $1`, [kitchen.email])
  const malformedHash = await login(baseUrl, { email: kitchen.email, password: kitchen.password })
  assert.equal(malformedHash.status, 401)
  assert.deepEqual(await malformedHash.json(), invalidCredentials)
})

test('login rejects malformed bodies without opening a session', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, client } = await startAuthApp(context, databaseUrl)

  const missingPassword = await login(baseUrl, { email: customer.email })
  assert.equal(missingPassword.status, 400)
  assert.equal((await missingPassword.json() as { error: { code: string } }).error.code, 'invalid_request')

  const invalidJson = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email":',
  })
  assert.equal(invalidJson.status, 400)
  assert.equal((await invalidJson.json() as { error: { code: string } }).error.code, 'invalid_request')

  const { rows } = await client.query<{ count: string }>('SELECT count(*) FROM sessions')
  assert.equal(rows[0]?.count, '0')
})

test('private routes reject missing, invalid, expired and revoked sessions', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, client } = await startAuthApp(context, databaseUrl)
  const sessionUrl = `${baseUrl}/api/auth/session`

  const missingToken = await fetchWithTimeout(sessionUrl)
  assert.equal(missingToken.status, 401)
  assert.equal((await missingToken.json() as { error: { code: string } }).error.code, 'unauthorized')

  const invalidToken = await authorizedGet(sessionUrl, 'not-a-real-token')
  assert.equal(invalidToken.status, 401)
  assert.equal((await invalidToken.json() as { error: { code: string } }).error.code, 'session_expired')

  const expiring = await (await login(baseUrl, customer)).json() as LoginResponse
  await client.query(`UPDATE sessions SET expires_at = now() - interval '1 minute'`)
  assert.equal((await authorizedGet(sessionUrl, expiring.token)).status, 401)

  const revoked = await (await login(baseUrl, customer)).json() as LoginResponse
  const logout = await fetchWithTimeout(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${revoked.token}` },
  })
  assert.equal(logout.status, 204)
  assert.equal((await authorizedGet(sessionUrl, revoked.token)).status, 401)
})

test('kitchen routes reject customers and accept kitchen staff', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const { baseUrl, kitchenOnlyUrl } = await startAuthApp(context, databaseUrl)
  const customerSession = await (await login(baseUrl, customer)).json() as LoginResponse
  const kitchenSession = await (await login(baseUrl, kitchen)).json() as LoginResponse

  const asCustomer = await authorizedGet(kitchenOnlyUrl, customerSession.token)
  assert.equal(asCustomer.status, 403)
  assert.deepEqual(await asCustomer.json(), {
    error: { code: 'forbidden', message: 'Tu cuenta no tiene acceso a esta operación.' },
  })

  const asKitchen = await authorizedGet(kitchenOnlyUrl, kitchenSession.token)
  assert.equal(asKitchen.status, 200)
  assert.deepEqual(await asKitchen.json(), { role: 'kitchen' })
})
