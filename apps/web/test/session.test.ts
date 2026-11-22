import assert from 'node:assert/strict'
import { test } from 'node:test'
import { homePathFor, parseStoredSession, safeRedirectPath } from '../app/utils/storedSession.ts'

const now = Date.parse('2026-11-21T12:00:00.000Z')
const validSession = {
  token: 'Ws0x1Cq8E3Vd6vY9m2rTqP0kZb4LhGcN7uJfA5sKe1o',
  expiresAt: '2026-11-21T20:00:00.000Z',
  user: { id: 1, email: 'cliente@cafeclick.test', role: 'customer' },
}

test('a stored session that has not expired is restored', () => {
  assert.deepEqual(parseStoredSession(JSON.stringify(validSession), now), validSession)
})

test('expired, corrupted or incomplete stored sessions are discarded', () => {
  const invalidValues = [
    null,
    '',
    'not-json',
    JSON.stringify({ ...validSession, expiresAt: '2026-11-21T11:59:59.000Z' }),
    JSON.stringify({ ...validSession, expiresAt: 'tomorrow' }),
    JSON.stringify({ ...validSession, token: 42 }),
    JSON.stringify({ ...validSession, user: { ...validSession.user, role: 'admin' } }),
    JSON.stringify({ token: validSession.token }),
  ]

  for (const value of invalidValues) {
    assert.equal(parseStoredSession(value, now), null, String(value))
  }
})

test('each role has its own home view', () => {
  assert.equal(homePathFor('customer'), '/')
  assert.equal(homePathFor('kitchen'), '/cocina')
})

test('login redirects only to paths inside the app', () => {
  assert.equal(safeRedirectPath('/'), '/')
  assert.equal(safeRedirectPath('/?categoria=drinks'), '/?categoria=drinks')

  for (const value of [undefined, ['/'], 'https://example.com', '//example.com', '/\\example.com', 'cocina']) {
    assert.equal(safeRedirectPath(value), null, String(value))
  }
})
