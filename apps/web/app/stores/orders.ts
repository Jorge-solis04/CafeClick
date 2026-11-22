import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Order, OrderStatus, OrderStreamState } from '~/types/order'
import type { UserRole } from '~/types/session'
import { useCheckoutStore } from './checkout'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const advancingIds = ref<number[]>([])
  const connectionState = ref<OrderStreamState>('idle')

  const activeCustomerOrder = computed(
    () => orders.value.find((order) => order.status !== 'delivered') ?? orders.value[0] ?? null,
  )

  function isAdvancing(orderId: number) {
    return advancingIds.value.includes(orderId)
  }

  function setConnectionState(nextState: OrderStreamState) {
    connectionState.value = nextState
  }

  function applyEvent(incoming: Order, role: UserRole) {
    orders.value = applyOrderUpdate(orders.value, incoming, role)

    const checkout = useCheckoutStore()
    if (checkout.confirmedOrder?.id === incoming.id && incoming.version > checkout.confirmedOrder.version) {
      checkout.confirmedOrder = incoming
    }
  }

  async function fetchOrders(role: UserRole, options: { silent?: boolean } = {}) {
    if (!options.silent) {
      isLoading.value = true
    }

    errorMessage.value = null

    try {
      const response = await apiFetch<{ orders: Order[] }>('/api/orders')
      orders.value = reconcileOrders(orders.value, response.orders, role)
    } catch (error) {
      const apiError = readApiError(error)
      if (!isExpiredSessionError(apiError)) {
        errorMessage.value = apiError.message ?? 'No se pudieron cargar los pedidos.'
      }
    } finally {
      if (!options.silent) {
        isLoading.value = false
      }
    }
  }

  async function advanceStatus(orderId: number, nextStatus: OrderStatus) {
    if (isAdvancing(orderId)) {
      return
    }

    advancingIds.value = [...advancingIds.value, orderId]
    errorMessage.value = null

    try {
      const response = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      })
      applyEvent(response.order, 'kitchen')
    } catch (error) {
      const apiError = readApiError(error)
      if (!isExpiredSessionError(apiError)) {
        errorMessage.value = apiError.message ?? 'No se pudo actualizar el estado del pedido.'
      }
    } finally {
      advancingIds.value = advancingIds.value.filter((id) => id !== orderId)
    }
  }

  function reset() {
    orders.value = []
    isLoading.value = false
    errorMessage.value = null
    advancingIds.value = []
    connectionState.value = 'idle'
  }

  return {
    orders,
    isLoading,
    errorMessage,
    connectionState,
    activeCustomerOrder,
    isAdvancing,
    setConnectionState,
    applyEvent,
    fetchOrders,
    advanceStatus,
    reset,
  }
})
