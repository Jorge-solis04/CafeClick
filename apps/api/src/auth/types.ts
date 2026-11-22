import type { userRole } from '../database/schema.js'

export type UserRole = (typeof userRole.enumValues)[number]

export type SessionUser = {
  id: number
  email: string
  role: UserRole
}

export type AuthAccount = SessionUser & {
  passwordHash: string
}

export type LoginSession = {
  token: string
  expiresAt: Date
  user: SessionUser
}
