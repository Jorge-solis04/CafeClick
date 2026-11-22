import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import express, { type Router } from 'express'
import { noStore } from '../http/noStore.js'
import { createAuthController } from './controller.js'
import { requireSession } from './middleware.js'
import { createAuthService, preparePlaceholderPasswordHash } from './service.js'

const loginBodyLimit = '4kb'

export function createAuthRouter(database: NodePgDatabase): Router {
  void preparePlaceholderPasswordHash()

  const router = express.Router()
  const service = createAuthService(database)
  const controller = createAuthController(service)

  router.use(noStore)
  router.post('/login', express.json({ limit: loginBodyLimit }), controller.login)
  router.get('/session', requireSession(database), controller.getSession)
  router.post('/logout', requireSession(database), controller.logout)

  return router
}
