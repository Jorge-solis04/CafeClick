export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered'

export type OrderItem = {
  productId: number
  name: string
  quantity: number
  unitPrice: string
}

export type Order = {
  id: number
  status: OrderStatus
  createdAt: string
  total: string
  items: OrderItem[]
}
