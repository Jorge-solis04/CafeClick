<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import type { Order } from '~/types/order'

definePageMeta({ allowedRoles: ['kitchen'] })

const ordersStore = useOrdersStore()
const timeFormatter = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' })
const placeholderCards = [1, 2, 3]

const showInitialLoading = computed(() => (
  (ordersStore.listStatus === 'idle' || ordersStore.listStatus === 'loading') && ordersStore.orders.length === 0
))
const showLoadError = computed(() => ordersStore.listStatus === 'error' && ordersStore.orders.length === 0)
const showEmpty = computed(() => ordersStore.listStatus === 'ready' && ordersStore.orders.length === 0)
const showStaleNotice = computed(() => ordersStore.errorMessage !== null && ordersStore.orders.length > 0)

function receivedAt(order: Order) {
  return timeFormatter.format(new Date(order.createdAt))
}

async function advance(order: Order) {
  const next = nextOrderStatus(order.status)
  if (!next) {
    return
  }

  await ordersStore.advanceStatus(order.id, next)
}

function reload() {
  void ordersStore.fetchOrders('kitchen')
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
          Pedidos por entregar, del que lleva más tiempo esperando al más reciente.
        </p>
      </div>

      <StreamStatusBadge :state="ordersStore.connectionState" />
    </div>

    <div
      v-if="showStaleNotice"
      role="alert"
      class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-marigold py-1 pl-4 text-sm"
    >
      <p>
        <span class="font-semibold">{{ ordersStore.errorMessage }}</span>
        La lista puede no estar al día.
      </p>
      <button
        type="button"
        class="h-8 rounded-md bg-leaf-soft px-3 text-xs font-semibold text-leaf-strong hover:bg-leaf hover:text-white"
        @click="reload"
      >
        Recargar lista
      </button>
    </div>

    <ul v-if="showInitialLoading" aria-busy="true" class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li class="sr-only">
        Cargando pedidos…
      </li>
      <li
        v-for="card in placeholderCards"
        :key="card"
        aria-hidden="true"
        class="h-56 rounded-lg border border-line bg-surface p-5"
      >
        <span class="block h-7 w-28 rounded-sm bg-ink/10" />
        <span class="mt-5 block h-4 w-40 rounded-sm bg-ink/5" />
        <span class="mt-2 block h-4 w-32 rounded-sm bg-ink/5" />
        <span class="mt-10 block h-10 rounded-md bg-ink/5" />
      </li>
    </ul>

    <div v-else-if="showLoadError" role="alert" class="mt-8 border-l-2 border-marigold py-1 pl-4">
      <p class="font-semibold">
        No se pudieron cargar los pedidos.
      </p>
      <p class="mt-1 text-muted">
        Revisa tu conexión a internet y vuelve a intentarlo.
      </p>
      <button
        type="button"
        class="mt-3 h-8 rounded-md bg-leaf-soft px-4 text-sm font-semibold text-leaf-strong hover:bg-leaf hover:text-white"
        @click="reload"
      >
        Reintentar
      </button>
    </div>

    <p v-else-if="showEmpty" class="mt-8 text-muted">
      No hay pedidos por atender. Los nuevos aparecerán aquí automáticamente.
    </p>

    <ul v-else class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="order in ordersStore.orders"
        :key="order.id"
        class="flex flex-col justify-between rounded-lg border bg-surface p-5"
        :class="order.status === 'ready' ? 'border-leaf' : 'border-line'"
      >
        <div>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-display text-2xl font-semibold tracking-tight tabular-nums">
                Folio #{{ order.id }}
              </h2>
              <p class="text-xs tabular-nums text-muted">
                Recibido a las {{ receivedAt(order) }}
                <span class="ml-2">v{{ order.version }}</span>
              </p>
            </div>
            <OrderStatusBadge :status="order.status" />
          </div>

          <ul class="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <li v-for="item in order.items" :key="item.productId" class="flex justify-between gap-3">
              <span><span class="font-semibold tabular-nums">{{ item.quantity }} ×</span> {{ item.name }}</span>
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
            :aria-busy="ordersStore.isAdvancing(order.id)"
            class="mt-4 h-10 w-full rounded-md bg-leaf px-4 text-sm font-semibold text-white hover:bg-leaf-strong disabled:cursor-not-allowed disabled:opacity-60"
            @click="advance(order)"
          >
            {{ ordersStore.isAdvancing(order.id) ? 'Actualizando…' : nextOrderActionLabel(order.status) }}
          </button>

          <p
            v-if="ordersStore.advanceErrorFor(order.id)"
            role="alert"
            class="mt-3 border-l-2 border-marigold pl-3 text-sm"
          >
            {{ ordersStore.advanceErrorFor(order.id) }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
