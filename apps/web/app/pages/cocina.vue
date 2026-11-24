<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import type { Order, OrderStatus } from '~/types/order'

definePageMeta({ allowedRoles: ['kitchen'] })

const ordersStore = useOrdersStore()
const now = useNow()
const placeholderTickets = [1, 2, 3]
const confirmWindowMs = 5000
const toastDurationMs = 8000

const kitchenColumns: { status: OrderStatus, title: string, empty: string }[] = [
  { status: 'pending', title: 'Por preparar', empty: 'Sin pedidos nuevos.' },
  { status: 'preparing', title: 'En preparación', empty: 'Nada en preparación.' },
  { status: 'ready', title: 'Listos para entregar', empty: 'Nada esperando a ser recogido.' },
]

const confirmingDeliveryId = ref<number | null>(null)
const toastMessage = ref<string | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

const showInitialLoading = computed(() => (
  (ordersStore.listStatus === 'idle' || ordersStore.listStatus === 'loading') && ordersStore.orders.length === 0
))
const showLoadError = computed(() => ordersStore.listStatus === 'error' && ordersStore.orders.length === 0)
const showEmpty = computed(() => ordersStore.listStatus === 'ready' && ordersStore.orders.length === 0)
const showStaleNotice = computed(() => ordersStore.errorMessage !== null && ordersStore.orders.length > 0)

const columns = computed(() => kitchenColumns.map((column) => ({
  ...column,
  orders: ordersStore.orders.filter((order) => order.status === column.status),
})))

useHead({
  title: computed(() => {
    const count = ordersStore.highlightedIds.length
    return count > 0 ? `(${count}) Cocina · CaféClick` : 'Cocina · CaféClick'
  }),
})

function clearConfirmation() {
  if (confirmTimer !== null) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
  confirmingDeliveryId.value = null
}

async function advance(order: Order) {
  const next = nextOrderStatus(order.status)
  if (!next) {
    return
  }

  // Delivery can't be undone, so it takes a second click within a few seconds.
  if (next === 'delivered' && confirmingDeliveryId.value !== order.id) {
    clearConfirmation()
    confirmingDeliveryId.value = order.id
    confirmTimer = setTimeout(clearConfirmation, confirmWindowMs)
    return
  }

  clearConfirmation()
  await ordersStore.advanceStatus(order.id, next)
}

function reload() {
  void ordersStore.fetchOrders('kitchen')
}

function dismissToast() {
  if (toastTimer !== null) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
  toastMessage.value = null
}

watch(() => ordersStore.lastArrival, (arrival) => {
  if (!arrival) {
    return
  }

  const [firstId] = arrival.orderIds
  toastMessage.value = arrival.orderIds.length === 1
    ? `Nuevo pedido: folio #${firstId}`
    : `${arrival.orderIds.length} pedidos nuevos`

  if (toastTimer !== null) {
    clearTimeout(toastTimer)
  }
  toastTimer = setTimeout(dismissToast, toastDurationMs)
})

watch(() => ordersStore.orders, (orders) => {
  const confirming = orders.find((order) => order.id === confirmingDeliveryId.value)
  if (confirmingDeliveryId.value !== null && confirming?.status !== 'ready') {
    clearConfirmation()
  }
})

onBeforeUnmount(() => {
  clearConfirmation()
  dismissToast()
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 pt-10 pb-20 sm:px-8 lg:pt-14">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl font-semibold tracking-tight font-stretch-semi-condensed sm:text-5xl">
          Cocina
        </h1>
        <p class="mt-2 max-w-prose text-muted">
          En cada columna, el pedido que lleva más tiempo esperando va primero.
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

    <div v-if="showInitialLoading" aria-busy="true" class="mt-8 grid gap-6 lg:grid-cols-3">
      <span class="sr-only">Cargando pedidos…</span>
      <div v-for="ticket in placeholderTickets" :key="ticket" aria-hidden="true" class="ticket-shadow">
        <div class="ticket-edge h-72 bg-surface p-5">
          <span class="block h-12 w-24 rounded-sm bg-ink/10" />
          <span class="mt-8 block h-5 w-48 rounded-sm bg-ink/5" />
          <span class="mt-3 block h-5 w-40 rounded-sm bg-ink/5" />
          <span class="mt-12 block h-12 rounded-md bg-ink/5" />
        </div>
      </div>
    </div>

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

    <div v-else class="mt-8 grid items-start gap-x-6 gap-y-10 lg:grid-cols-3">
      <section
        v-for="column in columns"
        :key="column.status"
        :aria-labelledby="`column-${column.status}`"
        class="rounded-lg bg-ink/[0.04] p-3 sm:p-4"
      >
        <h2
          :id="`column-${column.status}`"
          class="flex items-baseline justify-between border-b-4 border-ink/80 px-1 pb-2 font-display text-2xl font-semibold tracking-tight font-stretch-semi-condensed"
        >
          {{ column.title }}
          <span class="text-lg tabular-nums text-muted">{{ column.orders.length }}</span>
        </h2>

        <p v-if="column.orders.length === 0" class="px-1 py-6 text-sm text-muted">
          {{ column.empty }}
        </p>

        <ul v-else class="mt-4 space-y-5">
          <li v-for="order in column.orders" :key="order.id">
            <KitchenTicket
              :order="order"
              :now="now"
              :highlighted="ordersStore.isHighlighted(order.id)"
              :advancing="ordersStore.isAdvancing(order.id)"
              :confirming="confirmingDeliveryId === order.id"
              :error="ordersStore.advanceErrorFor(order.id)"
              @advance="advance(order)"
              @cancel="clearConfirmation"
            />
          </li>
        </ul>
      </section>
    </div>

    <NewOrderToast :message="toastMessage" @dismiss="dismissToast" />
  </div>
</template>
