import type { RequestHandler } from 'express'
import { sendError } from '../http/errors.js'
import { getSessionToken, getSessionUser } from './middleware.js'
import type { AuthService } from './service.js'

export function createAuthController(service: AuthService) {
  const login: RequestHandler = async (request, response) => {
    const { email, password } = request.body ?? {}

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      sendError(response, 400, 'invalid_request', 'Escribe tu correo y tu contraseña.')
      return
    }

    const session = await service.login(email, password)

    if (!session) {
      sendError(response, 401, 'invalid_credentials', 'Credenciales inválidas.')
      return
    }

    response.json({
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: session.user,
    })
  }

  const getSession: RequestHandler = (_request, response) => {
    response.json({ user: getSessionUser(response) })
  }

  const logout: RequestHandler = async (_request, response) => {
    await service.logout(getSessionToken(response))
    response.status(204).end()
  }

  return { login, getSession, logout }
}
