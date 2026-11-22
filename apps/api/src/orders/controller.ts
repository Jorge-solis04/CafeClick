import type { Request, RequestHandler } from 'express'
import { getSessionUser } from '../auth/middleware.js'
import { sendError } from '../http/errors.js'
import type { OrderEventHub } from './events.js'
import type { OrdersService } from './service.js'
import { parseOrderId, parseOrderItems, parseOrderStatus } from './validation.js'

export function createOrdersController(service: OrdersService, eventHub: OrderEventHub) {
  const openStream: RequestHandler = (request, response) => {
    const ticket = typeof request.query.ticket === 'string' ? request.query.ticket : ''
    const user = eventHub.consumeTicket(ticket)

    if (!user) {
      sendError(response, 401, 'invalid_stream_ticket', 'El ticket del stream no es válido o expiró. Solicita uno nuevo.')
      return
    }

    response.locals.sessionUser = user
    eventHub.subscribe(request, response, user)
  }

  const createStreamTicket: RequestHandler = (_request, response) => {
    const { ticket, expiresAt } = eventHub.issueTicket(getSessionUser(response))
    response.status(201).json({ ticket, expiresAt: expiresAt.toISOString() })
  }

  const create: RequestHandler = async (request, response) => {
    const items = parseOrderItems(request.body)

    if (!items.ok) {
      sendError(response, 400, 'invalid_order', items.message)
      return
    }

    const result = await service.createOrder(getSessionUser(response).id, items.value)

    if (result.outcome === 'unknown_product') {
      sendError(response, 400, 'unknown_product', 'Uno de los productos ya no está en el menú. Actualiza el menú e inténtalo de nuevo.')
      return
    }

    response.status(201).json({ order: result.order })
  }

  const list: RequestHandler = async (_request, response) => {
    const orders = await service.listOrders(getSessionUser(response))
    response.json({ orders })
  }

  const advanceStatus = async (request: Request<{ id: string }>, response: Parameters<RequestHandler>[1]) => {
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

    const result = await service.advanceOrderStatus(orderId, nextStatus)

    if (result.outcome === 'not_found') {
      sendError(response, 404, 'order_not_found', 'El pedido no existe.')
      return
    }

    if (result.outcome === 'invalid_transition') {
      sendError(response, 409, 'invalid_transition', 'El pedido no puede pasar a ese estado. Actualiza la lista e inténtalo de nuevo.')
      return
    }

    response.json({ order: result.order })
  }

  return {
    openStream,
    createStreamTicket,
    create,
    list,
    advanceStatus,
  }
}
