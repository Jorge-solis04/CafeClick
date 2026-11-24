import type { OrderStatus } from '~/types/order'

export const longWaitMinutes = 15

export function waitingMinutes(createdAt: string, now: number) {
  const created = Date.parse(createdAt)

  if (Number.isNaN(created)) {
    return 0
  }

  return Math.max(0, Math.floor((now - created) / 60000))
}

export function formatWaitingTime(minutes: number) {
  if (minutes < 1) {
    return 'Recién llegado'
  }

  if (minutes < 60) {
    return `Esperando ${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `Esperando ${hours} h` : `Esperando ${hours} h ${rest} min`
}

export function isLongWait(minutes: number, status: OrderStatus) {
  return minutes >= longWaitMinutes && (status === 'pending' || status === 'preparing')
}
