import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exceedsPasswordByteLimit, hashPassword, maximumPasswordBytes, verifyPassword } from '../src/auth/password.js'

test('hashPassword produces salted bcrypt hashes that verifyPassword accepts', async () => {
  const firstHash = await hashPassword('demo-password')
  const secondHash = await hashPassword('demo-password')

  assert.notEqual(firstHash, secondHash)
  assert.match(firstHash, /^\$2b\$12\$/)
  assert.ok(!firstHash.includes('demo-password'))
  assert.equal(await verifyPassword('demo-password', firstHash), true)
  assert.equal(await verifyPassword('wrong-password', firstHash), false)
})

test('verifyPassword returns false for malformed hashes instead of throwing', async () => {
  assert.equal(await verifyPassword('demo-password', 'not-a-valid-hash'), false)
  assert.equal(await verifyPassword('demo-password', `$2b$12$${'!'.repeat(53)}`), false)
  assert.equal(await verifyPassword('demo-password', ''), false)
})

test('passwords longer than the bcrypt byte limit are rejected', async () => {
  const longestAllowed = 'a'.repeat(maximumPasswordBytes)
  const tooLong = 'a'.repeat(maximumPasswordBytes + 1)
  const tooLongInBytesOnly = 'ñ'.repeat(maximumPasswordBytes / 2 + 1)

  assert.equal(exceedsPasswordByteLimit(longestAllowed), false)
  assert.equal(exceedsPasswordByteLimit(tooLong), true)
  assert.equal(exceedsPasswordByteLimit(tooLongInBytesOnly), true)
  await assert.rejects(hashPassword(tooLong))

  const hashOfLongestAllowed = await hashPassword(longestAllowed)
  assert.equal(await verifyPassword(tooLong, hashOfLongestAllowed), false)
})
