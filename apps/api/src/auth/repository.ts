import { and, eq, gt, lte } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sessions, users } from '../database/schema.js'
import type { AuthAccount, SessionUser } from './types.js'

export function createAuthRepository(database: NodePgDatabase) {
  return {
    async findAccountByEmail(email: string): Promise<AuthAccount | null> {
      const [account] = await database
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      return account ?? null
    },

    async deleteExpiredSessions(userId: number, now: Date) {
      await database
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, now)))
    },

    async insertSession(tokenHash: string, userId: number, expiresAt: Date) {
      await database.insert(sessions).values({ tokenHash, userId, expiresAt })
    },

    async findSessionUser(tokenHash: string, now: Date): Promise<SessionUser | null> {
      const [sessionUser] = await database
        .select({ id: users.id, email: users.email, role: users.role })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
        .limit(1)

      return sessionUser ?? null
    },

    async deleteSession(tokenHash: string) {
      await database.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
    },
  }
}

export type AuthRepository = ReturnType<typeof createAuthRepository>
