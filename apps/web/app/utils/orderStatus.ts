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

export type OrderProgressStep = {
  status: OrderStatus
  label: string
  state: 'done' | 'current' | 'upcoming'
}

const statusSequence: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered']

const customerStatusHints: Record<OrderStatus, string> = {
  pending: 'Recibimos tu pedido. Cocina lo empezará en breve.',
  preparing: 'Cocina está preparando tu pedido.',
  ready: 'Tu pedido está listo. Pasa a recogerlo y muestra tu folio.',
  delivered: 'Ya recogiste este pedido. ¡Buen provecho!',
}

export function orderProgressSteps(status: OrderStatus): OrderProgressStep[] {
  const currentIndex = statusSequence.indexOf(status)

  return statusSequence.map((step, index) => ({
    status: step,
    label: orderStatusLabels[step],
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

export function customerStatusHint(status: OrderStatus) {
  return customerStatusHints[status]
}
