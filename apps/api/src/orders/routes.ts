import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import express, { type Router } from 'express'
import { requireRole, requireSession } from '../auth/middleware.js'
import { noStore } from '../http/noStore.js'
import { createOrdersController } from './controller.js'
import { createOrderEventHub, type OrderEventHub } from './events.js'
import { createOrdersService } from './service.js'

const orderBodyLimit = '16kb'

export function createOrdersRouter(database: NodePgDatabase, eventHub: OrderEventHub = createOrderEventHub()): Router {
  const router = express.Router()
  const service = createOrdersService(database, eventHub)
  const controller = createOrdersController(service, eventHub)

  router.use(noStore)
  router.get('/stream', controller.openStream)

  router.use(requireSession(database))
  router.post('/stream-ticket', controller.createStreamTicket)
  router.post('/', requireRole('customer'), express.json({ limit: orderBodyLimit }), controller.create)
  router.get('/', controller.list)
  router.patch('/:id/status', requireRole('kitchen'), express.json({ limit: orderBodyLimit }), controller.advanceStatus)

  return router
}
