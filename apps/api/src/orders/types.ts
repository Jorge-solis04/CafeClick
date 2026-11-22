import type { OrderStatus } from './validation.js'

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

export type OrderRow = {
  id: number
  status: OrderStatus
  version: number
  createdAt: Date
  total: string
}

export type OrderItemRow = OrderItemView & {
  orderId: number
}

export type CreateOrderResult =
  | { outcome: 'created', order: OrderView }
  | { outcome: 'unknown_product' }

export type AdvanceOrderResult =
  | { outcome: 'advanced', order: OrderView }
  | { outcome: 'not_found' }
  | { outcome: 'invalid_transition' }
