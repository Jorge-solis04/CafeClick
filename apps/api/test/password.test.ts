import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hashPassword, verifyPassword } from '../src/auth/password.js'

test('hashPassword produces salted hashes that verifyPassword accepts', async () => {
  const firstHash = await hashPassword('demo-password')
  const secondHash = await hashPassword('demo-password')

  assert.notEqual(firstHash, secondHash)
  assert.ok(!firstHash.includes('demo-password'))
  assert.equal(await verifyPassword('demo-password', firstHash), true)
  assert.equal(await verifyPassword('wrong-password', firstHash), false)
  assert.equal(await verifyPassword('demo-password', 'not-a-valid-hash'), false)
})
