import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, lte } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sessions, userRole, users } from '../database/schema.js'

export const sessionLifetimeMs = 8 * 60 * 60 * 1000

const sessionTokenBytes = 32
const sessionTokenPattern = /^[A-Za-z0-9_-]{43}$/

export type UserRole = (typeof userRole.enumValues)[number]

export type SessionUser = {
  id: number
  email: string
  role: UserRole
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function isWellFormedSessionToken(token: string) {
  return sessionTokenPattern.test(token)
}

export async function createSession(database: NodePgDatabase, userId: number, now = new Date()) {
  const token = randomBytes(sessionTokenBytes).toString('base64url')
  const expiresAt = new Date(now.getTime() + sessionLifetimeMs)

  await database.delete(sessions).where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, now)))
  await database.insert(sessions).values({ tokenHash: hashSessionToken(token), userId, expiresAt })

  return { token, expiresAt }
}

export async function findSessionUser(database: NodePgDatabase, token: string, now = new Date()): Promise<SessionUser | null> {
  if (!isWellFormedSessionToken(token)) {
    return null
  }

  const [sessionUser] = await database
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, now)))
    .limit(1)

  return sessionUser ?? null
}

export async function revokeSession(database: NodePgDatabase, token: string) {
  if (!isWellFormedSessionToken(token)) {
    return
  }

  await database.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)))
}
