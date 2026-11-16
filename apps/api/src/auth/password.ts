import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const hashAlgorithm = 'scrypt'
const keyLength = 64
const saltLength = 16
const defaultOptions = { N: 16384, r: 8, p: 1 }

function deriveKey(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, keyLength, options, (error, key) => {
      if (error) {
        reject(error)
        return
      }

      resolve(key)
    })
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(saltLength)
  const key = await deriveKey(password, salt, defaultOptions)
  const { N, r, p } = defaultOptions

  return [hashAlgorithm, N, r, p, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, N, r, p, salt, expectedKey] = passwordHash.split('$')

  if (algorithm !== hashAlgorithm || !salt || !expectedKey) {
    return false
  }

  const expected = Buffer.from(expectedKey, 'base64')
  const actual = await deriveKey(password, Buffer.from(salt, 'base64'), { N: Number(N), r: Number(r), p: Number(p) })

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
