import type { OrderStatus } from '~/types/order'

const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  preparing: 'En preparación',
  ready: 'Listo para recoger',
  delivered: 'Entregado',
}

const nextStatuses: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
}

const nextActionLabels: Record<OrderStatus, string | null> = {
  pending: 'Iniciar preparación',
  preparing: 'Marcar como listo',
  ready: 'Marcar como entregado',
  delivered: null,
}

export function orderStatusLabel(status: OrderStatus) {
  return orderStatusLabels[status]
}

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  return nextStatuses[status]
}

export function nextOrderActionLabel(status: OrderStatus): string | null {
  return nextActionLabels[status]
}
