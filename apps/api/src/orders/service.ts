import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { SessionUser } from '../auth/types.js'
import type { OrderEventHub } from './events.js'
import { centsToPrice, priceToCents } from './money.js'
import { createOrdersRepository, type OrdersRepository } from './repository.js'
import type { AdvanceOrderResult, CreateOrderResult, OrderItemView, OrderRow, OrderView } from './types.js'
import type { OrderStatus, RequestedOrderItem } from './validation.js'

const requiredPreviousStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: null,
  preparing: 'pending',
  ready: 'preparing',
  delivered: 'ready',
}

function toOrderView(order: OrderRow, items: OrderItemView[]): OrderView {
  return { ...order, createdAt: order.createdAt.toISOString(), items }
}

function priceOrderItems(
  catalog: { id: number, name: string, price: string }[],
  requestedItems: RequestedOrderItem[],
) {
  const items: OrderItemView[] = requestedItems
    .map((item) => {
      const product = catalog.find((entry) => entry.id === item.productId)!
      return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice: product.price }
    })
    .sort((first, second) => first.productId - second.productId)

  const totalCents = items.reduce((sum, item) => sum + priceToCents(item.unitPrice) * item.quantity, 0)
  return { items, total: centsToPrice(totalCents) }
}

async function attachItems(repo: OrdersRepository, orderRows: OrderRow[]): Promise<OrderView[]> {
  if (orderRows.length === 0) {
    return []
  }

  const itemRows = await repo.findItemsByOrderIds(orderRows.map((order) => order.id))

  return orderRows.map((order) => toOrderView(
    order,
    itemRows
      .filter((item) => item.orderId === order.id)
      .map(({ orderId: _orderId, ...item }) => item),
  ))
}

export function createOrdersService(database: NodePgDatabase, eventHub: OrderEventHub) {
  const repo = createOrdersRepository(database)

  return {
    async createOrder(userId: number, requestedItems: RequestedOrderItem[]): Promise<CreateOrderResult> {
      const result = await repo.inTransaction<CreateOrderResult>(async (tx) => {
        const catalog = await tx.findProducts(requestedItems.map((item) => item.productId))
        if (catalog.length !== requestedItems.length) {
          return { outcome: 'unknown_product' }
        }

        const { items, total } = priceOrderItems(catalog, requestedItems)
        const order = await tx.insertOrder(userId, total, items)
        return { outcome: 'created', order: toOrderView(order, items) }
      })

      if (result.outcome === 'created') {
        eventHub.publishOrderCreated(result.order)
      }

      return result
    },

    async listOrders(user: SessionUser): Promise<OrderView[]> {
      const rows = user.role === 'kitchen'
        ? await repo.findOpenForKitchen()
        : await repo.findByUser(user.id)

      return attachItems(repo, rows)
    },

    async advanceOrderStatus(orderId: number, nextStatus: OrderStatus): Promise<AdvanceOrderResult> {
      const previousStatus = requiredPreviousStatus[nextStatus]

      if (previousStatus) {
        const advanced = await repo.advanceStatus(orderId, previousStatus, nextStatus)

        if (advanced) {
          const { userId, ...orderRow } = advanced
          const [order] = await attachItems(repo, [orderRow])
          eventHub.publishOrderStatusUpdated(order!, userId)
          return { outcome: 'advanced', order: order! }
        }
      }

      return (await repo.exists(orderId))
        ? { outcome: 'invalid_transition' }
        : { outcome: 'not_found' }
    },
  }
}

export type OrdersService = ReturnType<typeof createOrdersService>
