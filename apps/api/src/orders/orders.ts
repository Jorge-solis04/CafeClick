import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { orderItems, orders, products } from '../database/schema.js'
import type { SessionUser } from '../auth/sessions.js'
import { centsToPrice, priceToCents } from './money.js'
import type { OrderStatus, RequestedOrderItem } from './validation.js'

export type OrderItemView = {
  productId: number
  name: string
  quantity: number
  unitPrice: string
}

export type OrderView = {
  id: number
  status: OrderStatus
  version: number
  createdAt: string
  total: string
  items: OrderItemView[]
}

type OrderRow = {
  id: number
  status: OrderStatus
  version: number
  createdAt: Date
  total: string
}

export type CreateOrderResult =
  | { outcome: 'created', order: OrderView }
  | { outcome: 'unknown_product' }

export type AdvanceOrderResult =
  | { outcome: 'advanced', order: OrderView, ownerUserId: number }
  | { outcome: 'not_found' }
  | { outcome: 'invalid_transition' }

const requiredPreviousStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: null,
  preparing: 'pending',
  ready: 'preparing',
  delivered: 'ready',
}

const orderColumns = {
  id: orders.id,
  status: orders.status,
  version: orders.version,
  createdAt: orders.createdAt,
  total: orders.total,
}

function toOrderView(order: OrderRow, items: OrderItemView[]): OrderView {
  return { ...order, createdAt: order.createdAt.toISOString(), items }
}

async function attachItems(database: NodePgDatabase, orderRows: OrderRow[]): Promise<OrderView[]> {
  if (orderRows.length === 0) {
    return []
  }

  const itemRows = await database
    .select({
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      name: products.name,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(inArray(orderItems.orderId, orderRows.map((order) => order.id)))
    .orderBy(asc(orderItems.productId))

  return orderRows.map((order) => toOrderView(
    order,
    itemRows
      .filter((item) => item.orderId === order.id)
      .map(({ orderId: _orderId, ...item }) => item),
  ))
}

export async function createOrder(database: NodePgDatabase, userId: number, requestedItems: RequestedOrderItem[]): Promise<CreateOrderResult> {
  return database.transaction(async (transaction) => {
    const catalog = await transaction
      .select({ id: products.id, name: products.name, price: products.price })
      .from(products)
      .where(inArray(products.id, requestedItems.map((item) => item.productId)))

    if (catalog.length !== requestedItems.length) {
      return { outcome: 'unknown_product' }
    }

    const items = requestedItems
      .map((item) => {
        const product = catalog.find((entry) => entry.id === item.productId)!
        return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice: product.price }
      })
      .sort((first, second) => first.productId - second.productId)

    const totalCents = items.reduce((total, item) => total + priceToCents(item.unitPrice) * item.quantity, 0)

    const [order] = await transaction
      .insert(orders)
      .values({ userId, total: centsToPrice(totalCents) })
      .returning(orderColumns)

    await transaction.insert(orderItems).values(items.map((item) => ({
      orderId: order!.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })))

    return { outcome: 'created', order: toOrderView(order!, items) }
  })
}

export async function listOrders(database: NodePgDatabase, user: SessionUser): Promise<OrderView[]> {
  const orderRows = user.role === 'kitchen'
    ? await database
      .select(orderColumns)
      .from(orders)
      .where(ne(orders.status, 'delivered'))
      .orderBy(asc(orders.createdAt), asc(orders.id))
    : await database
      .select(orderColumns)
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt), desc(orders.id))

  return attachItems(database, orderRows)
}

export async function advanceOrderStatus(database: NodePgDatabase, orderId: number, nextStatus: OrderStatus): Promise<AdvanceOrderResult> {
  const previousStatus = requiredPreviousStatus[nextStatus]

  if (previousStatus) {
    const [advanced] = await database
      .update(orders)
      .set({ status: nextStatus, version: sql`${orders.version} + 1` })
      .where(and(eq(orders.id, orderId), eq(orders.status, previousStatus)))
      .returning({ ...orderColumns, userId: orders.userId })

    if (advanced) {
      const { userId, ...orderRow } = advanced
      const [order] = await attachItems(database, [orderRow])
      return { outcome: 'advanced', order: order!, ownerUserId: userId }
    }
  }

  const [existing] = await database.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1)
  return existing ? { outcome: 'invalid_transition' } : { outcome: 'not_found' }
}
