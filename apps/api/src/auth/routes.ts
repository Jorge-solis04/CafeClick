import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import express, { type Router } from 'express'
import { sendError } from '../http/errors.js'
import { authenticate, preparePlaceholderPasswordHash } from './login.js'
import { getSessionToken, getSessionUser, requireSession } from './middleware.js'
import { createSession, revokeSession } from './sessions.js'

const loginBodyLimit = '4kb'

export function createAuthRouter(database: NodePgDatabase): Router {
  void preparePlaceholderPasswordHash()

  const router = express.Router()

  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store')
    next()
  })

  router.post('/login', express.json({ limit: loginBodyLimit }), async (request, response) => {
    const { email, password } = request.body ?? {}

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      sendError(response, 400, 'invalid_request', 'Escribe tu correo y tu contraseña.')
      return
    }

    const user = await authenticate(database, email, password)

    if (!user) {
      sendError(response, 401, 'invalid_credentials', 'Credenciales inválidas.')
      return
    }

    const session = await createSession(database, user.id)

    response.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user })
  })

  router.get('/session', requireSession(database), (_request, response) => {
    response.json({ user: getSessionUser(response) })
  })

  router.post('/logout', requireSession(database), async (_request, response) => {
    await revokeSession(database, getSessionToken(response))
    response.status(204).end()
  })

  return router
}
