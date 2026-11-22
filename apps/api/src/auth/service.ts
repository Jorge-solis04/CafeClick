import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { exceedsPasswordByteLimit, hashPassword, verifyPassword } from './password.js'
import { createAuthRepository } from './repository.js'
import type { LoginSession, SessionUser } from './types.js'

export const sessionLifetimeMs = 8 * 60 * 60 * 1000

const sessionTokenBytes = 32
const sessionTokenPattern = /^[A-Za-z0-9_-]{43}$/

let placeholderPasswordHash: Promise<string> | undefined

export function preparePlaceholderPasswordHash() {
  placeholderPasswordHash ??= hashPassword(randomUUID())
  return placeholderPasswordHash
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function isWellFormedSessionToken(token: string) {
  return sessionTokenPattern.test(token)
}

export function createAuthService(database: NodePgDatabase) {
  const repo = createAuthRepository(database)

  return {
    async login(email: string, password: string, now = new Date()): Promise<LoginSession | null> {
      if (exceedsPasswordByteLimit(password)) {
        return null
      }

      const account = await repo.findAccountByEmail(normalizeEmail(email))

      if (!account) {
        await verifyPassword(password, await preparePlaceholderPasswordHash())
        return null
      }

      if (!(await verifyPassword(password, account.passwordHash))) {
        return null
      }

      const token = randomBytes(sessionTokenBytes).toString('base64url')
      const expiresAt = new Date(now.getTime() + sessionLifetimeMs)

      await repo.deleteExpiredSessions(account.id, now)
      await repo.insertSession(hashSessionToken(token), account.id, expiresAt)

      return {
        token,
        expiresAt,
        user: { id: account.id, email: account.email, role: account.role },
      }
    },

    findSessionUser(token: string, now = new Date()): Promise<SessionUser | null> {
      if (!isWellFormedSessionToken(token)) {
        return Promise.resolve(null)
      }

      return repo.findSessionUser(hashSessionToken(token), now)
    },

    async logout(token: string) {
      if (!isWellFormedSessionToken(token)) {
        return
      }

      await repo.deleteSession(hashSessionToken(token))
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
