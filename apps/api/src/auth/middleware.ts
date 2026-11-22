import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Request, RequestHandler, Response } from 'express'
import { sendError } from '../http/errors.js'
import { createAuthService } from './service.js'
import type { SessionUser, UserRole } from './types.js'

const bearerTokenPattern = /^Bearer (\S+)$/

export function readBearerToken(request: Request) {
  return bearerTokenPattern.exec(request.get('Authorization') ?? '')?.[1] ?? null
}

export function getSessionUser(response: Response): SessionUser {
  const sessionUser: SessionUser | undefined = response.locals.sessionUser

  if (!sessionUser) {
    throw new Error('getSessionUser requires requireSession to run first')
  }

  return sessionUser
}

export function getSessionToken(response: Response): string {
  const sessionToken: string | undefined = response.locals.sessionToken

  if (!sessionToken) {
    throw new Error('getSessionToken requires requireSession to run first')
  }

  return sessionToken
}

export function requireSession(database: NodePgDatabase): RequestHandler {
  const authService = createAuthService(database)

  return async (request, response, next) => {
    const token = readBearerToken(request)

    if (!token) {
      sendError(response, 401, 'unauthorized', 'Inicia sesión para continuar.')
      return
    }

    const sessionUser = await authService.findSessionUser(token)

    if (!sessionUser) {
      sendError(response, 401, 'session_expired', 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.')
      return
    }

    response.locals.sessionUser = sessionUser
    response.locals.sessionToken = token
    next()
  }
}

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (_request, response, next) => {
    if (!allowedRoles.includes(getSessionUser(response).role)) {
      sendError(response, 403, 'forbidden', 'Tu cuenta no tiene acceso a esta operación.')
      return
    }

    next()
  }
}
