import { sql } from 'drizzle-orm'
import { check, index, integer, numeric, pgEnum, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', ['customer', 'kitchen'])
export const orderStatus = pgEnum('order_status', ['pending', 'preparing', 'ready', 'delivered'])

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text().notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole().notNull(),
})

export const products = pgTable('products', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  price: numeric({ precision: 12, scale: 2 }).notNull(),
}, (table) => [
  check('products_price_valid', sql`${table.price} >= 0 AND ${table.price} <> 'NaN'::numeric`),
])

export const orders = pgTable('orders', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id),
  status: orderStatus().notNull().default('pending'),
  total: numeric({ precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('orders_total_valid', sql`${table.total} >= 0 AND ${table.total} <> 'NaN'::numeric`),
  index('orders_user_id_created_at_idx').on(table.userId, table.createdAt.desc()),
])

export const orderItems = pgTable('order_items', {
  orderId: integer('order_id').notNull().references(() => orders.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer().notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.orderId, table.productId] }),
  check('order_items_quantity_positive', sql`${table.quantity} > 0`),
  check('order_items_unit_price_valid', sql`${table.unitPrice} >= 0 AND ${table.unitPrice} <> 'NaN'::numeric`),
])
