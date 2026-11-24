export type UserRole = 'customer' | 'kitchen'

export type SessionUser = {
  id: number
  email: string
  role: UserRole
}

export type StoredSession = {
  token: string
  expiresAt: string
  user: SessionUser
}
