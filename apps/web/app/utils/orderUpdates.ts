import type { Order } from '~/types/order'
import type { UserRole } from '~/types/session'

const reconnectDelaysMs = [1000, 2000, 4000, 8000, 15000]

function compareOrdersForRole(first: Order, second: Order, role: UserRole) {
  const firstTime = Date.parse(first.createdAt)
  const secondTime = Date.parse(second.createdAt)
  const timeDiff = firstTime - secondTime

  if (role === 'kitchen') {
    return timeDiff !== 0 ? timeDiff : first.id - second.id
  }

  return timeDiff !== 0 ? -timeDiff : second.id - first.id
}

export function applyOrderUpdate(current: Order[], incoming: Order, role: UserRole): Order[] {
  const existing = current.find((order) => order.id === incoming.id)

  if (existing && incoming.version <= existing.version) {
    return current
  }

  if (role === 'kitchen' && incoming.status === 'delivered') {
    return existing ? current.filter((order) => order.id !== incoming.id) : current
  }

  const next = existing
    ? current.map((order) => (order.id === incoming.id ? incoming : order))
    : [...current, incoming]

  return next.sort((first, second) => compareOrdersForRole(first, second, role))
}

export function reconcileOrders(current: Order[], snapshot: Order[], role: UserRole): Order[] {
  const byId = new Map(current.map((order) => [order.id, order]))

  const merged = snapshot
    .map((order) => {
      const local = byId.get(order.id)
      return local && local.version > order.version ? local : order
    })
    .filter((order) => role !== 'kitchen' || order.status !== 'delivered')

  return merged.sort((first, second) => compareOrdersForRole(first, second, role))
}

export function reconnectDelayMs(attempt: number) {
  const index = Math.min(Math.max(attempt, 0), reconnectDelaysMs.length - 1)
  return reconnectDelaysMs[index]!
}

export function buildOrderStreamUrl(apiBase: string, ticket: string) {
  const base = apiBase.replace(/\/+$/, '')
  return `${base}/api/orders/stream?ticket=${encodeURIComponent(ticket)}`
}
