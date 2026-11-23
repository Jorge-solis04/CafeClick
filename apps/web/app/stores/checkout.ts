import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Order } from '~/types/order'
import { useCartStore } from './cart'
import { useOrdersStore } from './orders'

export const useCheckoutStore = defineStore('checkout', () => {
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)
  const confirmedOrder = ref<Order | null>(null)

  async function confirm() {
    const cart = useCartStore()

    if (isSubmitting.value || cart.lines.length === 0) {
      return
    }

    isSubmitting.value = true
    errorMessage.value = null

    try {
      const response = await apiFetch<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: { items: toOrderItems(cart.lines) },
      })
      confirmedOrder.value = response.order
      useOrdersStore().applyEvent(response.order, 'customer')
      cart.clear()
    } catch (error) {
      const apiError = readApiError(error)

      if (!isExpiredSessionError(apiError)) {
        errorMessage.value = checkoutErrorMessage(apiError)
      }
    } finally {
      isSubmitting.value = false
    }
  }

  function dismissConfirmation() {
    confirmedOrder.value = null
  }

  return { isSubmitting, errorMessage, confirmedOrder, confirm, dismissConfirmation }
})
