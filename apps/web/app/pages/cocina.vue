<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import type { Order } from '~/types/order'

definePageMeta({ allowedRoles: ['kitchen'] })

const ordersStore = useOrdersStore()

async function advance(order: Order) {
  const next = nextOrderStatus(order.status)
  if (!next) {
    return
  }

  await ordersStore.advanceStatus(order.id, next)
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-5 pt-10 pb-20 sm:px-8 lg:pt-14">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl font-semibold tracking-tight font-stretch-semi-condensed sm:text-5xl">
          Cocina
        </h1>
        <p class="mt-2 max-w-prose text-muted">
          Pedidos activos actualizados en tiempo real.
        </p>
      </div>

      <StreamStatusBadge :state="ordersStore.connectionState" />
    </div>

    <div
      v-if="ordersStore.errorMessage"
      role="alert"
      class="mt-6 border-l-2 border-marigold py-1 pl-4 text-sm"
    >
      <p class="font-semibold">
        {{ ordersStore.errorMessage }}
      </p>
      <button
        type="button"
        class="mt-2 h-8 rounded-md bg-leaf-soft px-3 text-xs font-semibold text-leaf-strong hover:bg-leaf hover:text-white"
        @click="ordersStore.fetchOrders('kitchen')"
      >
        Recargar lista
      </button>
    </div>

    <p v-if="ordersStore.isLoading && ordersStore.orders.length === 0" class="mt-8 text-muted">
      Cargando pedidos…
    </p>

    <p v-else-if="ordersStore.orders.length === 0" class="mt-8 text-muted">
      No hay pedidos pendientes por ahora. Los nuevos aparecerán aquí automáticamente.
    </p>

    <ul v-else class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="order in ordersStore.orders"
        :key="order.id"
        class="flex flex-col justify-between rounded-lg border border-line bg-surface p-5"
      >
        <div>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-display text-2xl font-semibold tracking-tight tabular-nums">
                Folio #{{ order.id }}
              </h2>
              <p class="text-xs tabular-nums text-muted">
                v{{ order.version }}
              </p>
            </div>
            <OrderStatusBadge :status="order.status" />
          </div>

          <ul class="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <li v-for="item in order.items" :key="item.productId" class="flex justify-between gap-3">
              <span>{{ item.quantity }} × {{ item.name }}</span>
              <span class="tabular-nums text-muted">{{ formatCents(priceToCents(item.unitPrice) * item.quantity) }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-5 border-t border-line pt-4">
          <div class="flex items-baseline justify-between">
            <span class="text-sm text-muted">Total</span>
            <span class="font-display text-lg font-semibold tabular-nums">{{ formatPrice(order.total) }}</span>
          </div>

          <button
            v-if="nextOrderActionLabel(order.status)"
            type="button"
            :disabled="ordersStore.isAdvancing(order.id)"
            class="mt-4 h-10 w-full rounded-md bg-leaf px-4 text-sm font-semibold text-white hover:bg-leaf-strong disabled:cursor-not-allowed disabled:opacity-60"
            @click="advance(order)"
          >
            {{ ordersStore.isAdvancing(order.id) ? 'Actualizando…' : nextOrderActionLabel(order.status) }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
