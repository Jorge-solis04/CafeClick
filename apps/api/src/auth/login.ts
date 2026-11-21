import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { users } from '../database/schema.js'
import { exceedsPasswordByteLimit, hashPassword, verifyPassword } from './password.js'
import type { SessionUser } from './sessions.js'

let placeholderPasswordHash: Promise<string> | undefined

export function preparePlaceholderPasswordHash() {
  placeholderPasswordHash ??= hashPassword(randomUUID())
  return placeholderPasswordHash
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function authenticate(database: NodePgDatabase, email: string, password: string): Promise<SessionUser | null> {
  if (exceedsPasswordByteLimit(password)) {
    return null
  }

  const [account] = await database
    .select({ id: users.id, email: users.email, role: users.role, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1)

  if (!account) {
    await verifyPassword(password, await preparePlaceholderPasswordHash())
    return null
  }

  if (!(await verifyPassword(password, account.passwordHash))) {
    return null
  }

  return { id: account.id, email: account.email, role: account.role }
}
