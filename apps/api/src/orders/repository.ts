import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { orderItems, orders, products } from '../database/schema.js'
import type { OrderItemRow, OrderItemView, OrderRow } from './types.js'
import type { OrderStatus } from './validation.js'

type QueryExecutor = Pick<NodePgDatabase, 'select' | 'insert' | 'update'>

const orderColumns = {
  id: orders.id,
  status: orders.status,
  version: orders.version,
  createdAt: orders.createdAt,
  total: orders.total,
}

function createOrderQueries(executor: QueryExecutor) {
  return {
    findProducts(productIds: number[]) {
      return executor
        .select({ id: products.id, name: products.name, price: products.price })
        .from(products)
        .where(inArray(products.id, productIds))
    },

    async insertOrder(userId: number, total: string, items: OrderItemView[]): Promise<OrderRow> {
      const [order] = await executor
        .insert(orders)
        .values({ userId, total })
        .returning(orderColumns)

      await executor.insert(orderItems).values(items.map((item) => ({
        orderId: order!.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })))

      return order!
    },
  }
}

export function createOrdersRepository(database: NodePgDatabase) {
  return {
    inTransaction<T>(run: (tx: ReturnType<typeof createOrderQueries>) => Promise<T>): Promise<T> {
      return database.transaction((transaction) => run(createOrderQueries(transaction)))
    },

    findOpenForKitchen(): Promise<OrderRow[]> {
      return database
        .select(orderColumns)
        .from(orders)
        .where(ne(orders.status, 'delivered'))
        .orderBy(asc(orders.createdAt), asc(orders.id))
    },

    findByUser(userId: number): Promise<OrderRow[]> {
      return database
        .select(orderColumns)
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt), desc(orders.id))
    },

    findItemsByOrderIds(orderIds: number[]): Promise<OrderItemRow[]> {
      if (orderIds.length === 0) {
        return Promise.resolve([])
      }

      return database
        .select({
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          name: products.name,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .where(inArray(orderItems.orderId, orderIds))
        .orderBy(asc(orderItems.productId))
    },

    async advanceStatus(
      orderId: number,
      previousStatus: OrderStatus,
      nextStatus: OrderStatus,
    ): Promise<(OrderRow & { userId: number }) | null> {
      const [advanced] = await database
        .update(orders)
        .set({ status: nextStatus, version: sql`${orders.version} + 1` })
        .where(and(eq(orders.id, orderId), eq(orders.status, previousStatus)))
        .returning({ ...orderColumns, userId: orders.userId })

      return advanced ?? null
    },

    async exists(orderId: number): Promise<boolean> {
      const [existing] = await database
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1)

      return Boolean(existing)
    },
  }
}

export type OrdersRepository = ReturnType<typeof createOrdersRepository>
