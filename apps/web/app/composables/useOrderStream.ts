import { onScopeDispose, watch } from 'vue'
import { useOrdersStore } from '~/stores/orders'
import { useSessionStore } from '~/stores/session'
import type { Order } from '~/types/order'
import type { UserRole } from '~/types/session'

type StreamTicketResponse = {
  ticket: string
  expiresAt: string
}

function parseOrderPayload(raw: string): Order | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Order>
    if (typeof parsed.id === 'number' && typeof parsed.version === 'number' && typeof parsed.status === 'string') {
      return parsed as Order
    }
    return null
  } catch {
    return null
  }
}

export function useOrderStream() {
  const session = useSessionStore()
  const ordersStore = useOrdersStore()
  const runtimeConfig = useRuntimeConfig()

  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let needsReconciliation = false
  let activeGeneration = 0

  function closeConnection() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  function stop() {
    activeGeneration += 1
    reconnectAttempt = 0
    needsReconciliation = false
    closeConnection()
    ordersStore.reset()
  }

  function scheduleReconnect(generation: number, role: UserRole) {
    if (generation !== activeGeneration || !session.isAuthenticated) {
      return
    }

    needsReconciliation = true
    ordersStore.setConnectionState('reconnecting')

    const delay = reconnectDelayMs(reconnectAttempt)
    reconnectAttempt += 1

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect(generation, role)
    }, delay)
  }

  async function connect(generation: number, role: UserRole) {
    if (!import.meta.client || generation !== activeGeneration || !session.isAuthenticated) {
      return
    }

    closeConnection()
    ordersStore.setConnectionState(needsReconciliation ? 'reconnecting' : 'connecting')

    let ticketResponse: StreamTicketResponse
    try {
      ticketResponse = await apiFetch<StreamTicketResponse>('/api/orders/stream-ticket', { method: 'POST' })
    } catch (error) {
      if (isExpiredSessionError(readApiError(error))) {
        stop()
        return
      }

      scheduleReconnect(generation, role)
      return
    }

    if (generation !== activeGeneration || !session.isAuthenticated) {
      return
    }

    const url = buildOrderStreamUrl(runtimeConfig.public.apiBase, ticketResponse.ticket)
    const source = new EventSource(url)
    eventSource = source

    const handleOrderEvent = (event: Event) => {
      if (generation !== activeGeneration) {
        return
      }

      const order = parseOrderPayload((event as MessageEvent<string>).data)
      if (order) {
        ordersStore.applyEvent(order, role)
      }
    }

    source.addEventListener('order.created', handleOrderEvent)
    source.addEventListener('order.status.updated', handleOrderEvent)

    source.onopen = () => {
      if (generation !== activeGeneration) {
        source.close()
        return
      }

      const shouldReconcile = needsReconciliation
      reconnectAttempt = 0
      needsReconciliation = false
      ordersStore.setConnectionState('connected')

      if (shouldReconcile) {
        void ordersStore.fetchOrders(role, { silent: true })
      }
    }

    source.onerror = () => {
      if (generation !== activeGeneration) {
        source.close()
        return
      }

      // Close immediately so EventSource never retries with an already-consumed one-time ticket.
      source.close()
      if (eventSource === source) {
        eventSource = null
      }

      scheduleReconnect(generation, role)
    }
  }

  async function start(role: UserRole) {
    if (!import.meta.client) {
      return
    }

    activeGeneration += 1
    const generation = activeGeneration
    reconnectAttempt = 0
    needsReconciliation = false
    closeConnection()

    await ordersStore.fetchOrders(role)

    if (generation !== activeGeneration || !session.isAuthenticated) {
      return
    }

    await connect(generation, role)
  }

  watch(
    () => (session.user ? `${session.user.id}:${session.user.role}` : null),
    (identity) => {
      if (!identity || !session.user) {
        stop()
        return
      }

      void start(session.user.role)
    },
    { immediate: true },
  )

  onScopeDispose(stop)

  return { stop }
}
