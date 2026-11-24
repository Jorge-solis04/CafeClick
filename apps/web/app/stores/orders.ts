import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Order, OrderStatus, OrderStreamState } from '~/types/order'
import type { UserRole } from '~/types/session'
import { useCheckoutStore } from './checkout'

export type OrderListStatus = 'idle' | 'loading' | 'ready' | 'error'

export type OrderArrival = {
  orderIds: number[]
  at: number
}

const highlightDurationMs = 60000

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const listStatus = ref<OrderListStatus>('idle')
  const errorMessage = ref<string | null>(null)
  const advancingIds = ref<number[]>([])
  const advanceErrors = ref<Record<number, string>>({})
  const connectionState = ref<OrderStreamState>('idle')
  const highlightedIds = ref<number[]>([])
  const lastArrival = ref<OrderArrival | null>(null)
  const highlightTimers = new Map<number, ReturnType<typeof setTimeout>>()

  const isLoading = computed(() => listStatus.value === 'loading')

  const activeCustomerOrder = computed(
    () => orders.value.find((order) => order.status !== 'delivered') ?? orders.value[0] ?? null,
  )

  function isAdvancing(orderId: number) {
    return advancingIds.value.includes(orderId)
  }

  function advanceErrorFor(orderId: number) {
    return advanceErrors.value[orderId] ?? null
  }

  function clearAdvanceError(orderId: number) {
    if (orderId in advanceErrors.value) {
      const rest = { ...advanceErrors.value }
      delete rest[orderId]
      advanceErrors.value = rest
    }
  }

  function isHighlighted(orderId: number) {
    return highlightedIds.value.includes(orderId)
  }

  function unhighlight(orderId: number) {
    const timer = highlightTimers.get(orderId)
    if (timer !== undefined) {
      clearTimeout(timer)
      highlightTimers.delete(orderId)
    }

    if (highlightedIds.value.includes(orderId)) {
      highlightedIds.value = highlightedIds.value.filter((id) => id !== orderId)
    }
  }

  function markArrivals(orderIds: number[]) {
    if (orderIds.length === 0) {
      return
    }

    for (const orderId of orderIds) {
      unhighlight(orderId)
      highlightedIds.value = [...highlightedIds.value, orderId]
      highlightTimers.set(orderId, setTimeout(() => unhighlight(orderId), highlightDurationMs))
    }

    lastArrival.value = { orderIds, at: Date.now() }
  }

  function setConnectionState(nextState: OrderStreamState) {
    connectionState.value = nextState
  }

  function applyEvent(incoming: Order, role: UserRole) {
    const previous = orders.value
    orders.value = applyOrderUpdate(orders.value, incoming, role)

    if (orders.value !== previous) {
      clearAdvanceError(incoming.id)

      if (role === 'kitchen') {
        if (incoming.status === 'pending') {
          markArrivals(findNewPendingOrderIds(previous, orders.value))
        } else {
          unhighlight(incoming.id)
        }
      }
    }

    const checkout = useCheckoutStore()
    if (checkout.confirmedOrder?.id === incoming.id && incoming.version > checkout.confirmedOrder.version) {
      checkout.confirmedOrder = incoming
    }
  }

  async function fetchOrders(role: UserRole, options: { silent?: boolean } = {}) {
    const hasLoaded = listStatus.value === 'ready'

    if (!options.silent || !hasLoaded) {
      listStatus.value = 'loading'
    }

    errorMessage.value = null

    try {
      const response = await apiFetch<{ orders: Order[] }>('/api/orders')
      const previous = orders.value
      orders.value = reconcileOrders(previous, response.orders, role)
      listStatus.value = 'ready'

      // Orders that show up while reconnecting also count as new for the kitchen.
      if (role === 'kitchen' && hasLoaded) {
        markArrivals(findNewPendingOrderIds(previous, orders.value))
      }
    } catch (error) {
      const apiError = readApiError(error)

      if (isExpiredSessionError(apiError)) {
        listStatus.value = hasLoaded ? 'ready' : 'idle'
        return
      }

      errorMessage.value = apiError.message ?? 'No se pudieron cargar los pedidos.'
      // Keep showing a list that already loaded; only an empty first load becomes an error screen.
      listStatus.value = hasLoaded ? 'ready' : 'error'
    }
  }

  async function advanceStatus(orderId: number, nextStatus: OrderStatus) {
    if (isAdvancing(orderId)) {
      return
    }

    advancingIds.value = [...advancingIds.value, orderId]
    clearAdvanceError(orderId)

    try {
      const response = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      })
      applyEvent(response.order, 'kitchen')
    } catch (error) {
      const apiError = readApiError(error)

      if (isExpiredSessionError(apiError)) {
        return
      }

      if (shouldRefreshAfterAdvanceError(apiError)) {
        await fetchOrders('kitchen', { silent: true })
      }

      advanceErrors.value = { ...advanceErrors.value, [orderId]: advanceStatusErrorMessage(apiError) }
    } finally {
      advancingIds.value = advancingIds.value.filter((id) => id !== orderId)
    }
  }

  function reset() {
    for (const timer of highlightTimers.values()) {
      clearTimeout(timer)
    }
    highlightTimers.clear()
    highlightedIds.value = []
    lastArrival.value = null
    orders.value = []
    listStatus.value = 'idle'
    errorMessage.value = null
    advancingIds.value = []
    advanceErrors.value = {}
    connectionState.value = 'idle'
  }

  return {
    orders,
    listStatus,
    isLoading,
    errorMessage,
    connectionState,
    activeCustomerOrder,
    highlightedIds,
    lastArrival,
    isAdvancing,
    isHighlighted,
    advanceErrorFor,
    setConnectionState,
    applyEvent,
    fetchOrders,
    advanceStatus,
    reset,
  }
})
