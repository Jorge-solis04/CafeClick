import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import express, { type Router } from 'express'
import { getSessionUser, requireRole, requireSession } from '../auth/middleware.js'
import { sendError } from '../http/errors.js'
import { advanceOrderStatus, createOrder, listOrders } from './orders.js'
import { parseOrderId, parseOrderItems, parseOrderStatus } from './validation.js'

const orderBodyLimit = '16kb'

export function createOrdersRouter(database: NodePgDatabase): Router {
  const router = express.Router()

  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store')
    next()
  })

  router.use(requireSession(database))

  router.post('/', requireRole('customer'), express.json({ limit: orderBodyLimit }), async (request, response) => {
    const items = parseOrderItems(request.body)

    if (!items.ok) {
      sendError(response, 400, 'invalid_order', items.message)
      return
    }

    const result = await createOrder(database, getSessionUser(response).id, items.value)

    if (result.outcome === 'unknown_product') {
      sendError(response, 400, 'unknown_product', 'Uno de los productos ya no está en el menú. Actualiza el menú e inténtalo de nuevo.')
      return
    }

    response.status(201).json({ order: result.order })
  })

  router.get('/', async (_request, response) => {
    response.json({ orders: await listOrders(database, getSessionUser(response)) })
  })

  router.patch('/:id/status', requireRole('kitchen'), express.json({ limit: orderBodyLimit }), async (request: express.Request<{ id: string }>, response) => {
    const orderId = parseOrderId(request.params.id)

    if (orderId === null) {
      sendError(response, 404, 'order_not_found', 'El pedido no existe.')
      return
    }

    const nextStatus = parseOrderStatus(request.body)

    if (!nextStatus) {
      sendError(response, 400, 'invalid_request', 'Indica un estado válido: pending, preparing, ready o delivered.')
      return
    }

    const result = await advanceOrderStatus(database, orderId, nextStatus)

    if (result.outcome === 'not_found') {
      sendError(response, 404, 'order_not_found', 'El pedido no existe.')
      return
    }

    if (result.outcome === 'invalid_transition') {
      sendError(response, 409, 'invalid_transition', 'El pedido no puede pasar a ese estado. Actualiza la lista e inténtalo de nuevo.')
      return
    }

    response.json({ order: result.order })
  })

  return router
}
