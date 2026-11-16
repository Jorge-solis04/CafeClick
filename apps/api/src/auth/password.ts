import { compare, hash, truncates } from 'bcryptjs'

const costFactor = 12
export const maximumPasswordBytes = 72

function normalizePassword(password: string) {
  return password.normalize('NFKC')
}

export function exceedsPasswordByteLimit(password: string) {
  return truncates(normalizePassword(password))
}

export async function hashPassword(password: string) {
  if (exceedsPasswordByteLimit(password)) {
    throw new Error(`Passwords cannot exceed ${maximumPasswordBytes} bytes`)
  }

  return hash(normalizePassword(password), costFactor)
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (exceedsPasswordByteLimit(password)) {
    return false
  }

  try {
    return await compare(normalizePassword(password), passwordHash)
  } catch {
    return false
  }
}
