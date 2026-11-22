import type { OrderStatus } from '~/types/order'

const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  preparing: 'En preparación',
  ready: 'Listo para recoger',
  delivered: 'Entregado',
}

export function orderStatusLabel(status: OrderStatus) {
  return orderStatusLabels[status]
}
