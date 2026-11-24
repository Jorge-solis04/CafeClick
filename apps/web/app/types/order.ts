export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered'

export type OrderStreamState = 'idle' | 'connecting' | 'connected' | 'reconnecting'

export type OrderItem = {
  productId: number
  name: string
  quantity: number
  unitPrice: string
}

export type Order = {
  id: number
  status: OrderStatus
  version: number
  createdAt: string
  total: string
  items: OrderItem[]
}
