import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Product } from '~/types/catalog'
import { priceToCents } from '~/utils/money'
import { parseStoredCart, type StoredCartLine } from '~/utils/storedCart'

export type CartLine = StoredCartLine

const cartStorageKey = 'cafeclick.cart'

function readStoredCart() {
  try {
    return parseStoredCart(localStorage.getItem(cartStorageKey))
  } catch {
    return []
  }
}

function writeStoredCart(lines: CartLine[]) {
  try {
    if (lines.length) {
      localStorage.setItem(cartStorageKey, JSON.stringify(lines))
    } else {
      localStorage.removeItem(cartStorageKey)
    }
  } catch {
    return
  }
}

export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>(readStoredCart())

  watch(lines, writeStoredCart, { deep: true })

  const itemCount = computed(() => lines.value.reduce((total, line) => total + line.quantity, 0))
  const subtotalCents = computed(() => lines.value.reduce(
    (total, line) => total + priceToCents(line.product.price) * line.quantity,
    0,
  ))

  function findLine(productId: number) {
    return lines.value.find((line) => line.product.id === productId)
  }

  function quantityOf(productId: number) {
    return findLine(productId)?.quantity ?? 0
  }

  function add(product: Product) {
    const line = findLine(product.id)

    if (line) {
      line.quantity += 1
      return
    }

    lines.value.push({ product, quantity: 1 })
  }

  function decrement(productId: number) {
    const line = findLine(productId)

    if (!line) {
      return
    }

    if (line.quantity > 1) {
      line.quantity -= 1
      return
    }

    remove(productId)
  }

  function remove(productId: number) {
    lines.value = lines.value.filter((line) => line.product.id !== productId)
  }

  function clear() {
    lines.value = []
  }

  return { lines, itemCount, subtotalCents, quantityOf, add, decrement, remove, clear }
})
