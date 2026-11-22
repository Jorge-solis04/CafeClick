import type { SessionUser, StoredSession, UserRole } from '~/types/session'

const userRoles: UserRole[] = ['customer', 'kitchen']

function isSessionUser(value: unknown): value is SessionUser {
  const user = value as Partial<SessionUser> | null
  return typeof user === 'object'
    && user !== null
    && typeof user.id === 'number'
    && typeof user.email === 'string'
    && userRoles.includes(user.role as UserRole)
}

export function parseStoredSession(serialized: string | null, now = Date.now()): StoredSession | null {
  if (!serialized) {
    return null
  }

  try {
    const session = JSON.parse(serialized) as Partial<StoredSession>

    if (typeof session.token !== 'string' || typeof session.expiresAt !== 'string' || !isSessionUser(session.user)) {
      return null
    }

    const expiresAt = Date.parse(session.expiresAt)

    if (Number.isNaN(expiresAt) || expiresAt <= now) {
      return null
    }

    return { token: session.token, expiresAt: session.expiresAt, user: session.user }
  } catch {
    return null
  }
}

export function homePathFor(role: UserRole) {
  return role === 'kitchen' ? '/cocina' : '/'
}

export function safeRedirectPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null
  }

  return value
}
