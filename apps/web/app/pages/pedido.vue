<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'

definePageMeta({ allowedRoles: ['customer'] })

const ordersStore = useOrdersStore()
const order = computed(() => ordersStore.activeCustomerOrder)

const showLoading = computed(() => (
  (ordersStore.listStatus === 'idle' || ordersStore.listStatus === 'loading') && !order.value
))
const showError = computed(() => ordersStore.listStatus === 'error' && !order.value)
const isFinished = computed(() => order.value?.status === 'delivered')
</script>

<template>
  <div class="mx-auto max-w-2xl px-5 pt-10 pb-20 sm:px-8 lg:pt-14">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-display text-4xl font-semibold tracking-tight font-stretch-semi-condensed sm:text-5xl">
        Tu pedido
      </h1>
      <StreamStatusBadge v-if="order" :state="ordersStore.connectionState" />
    </div>

    <div v-if="showLoading" aria-busy="true" class="mt-8 rounded-lg border border-line bg-surface p-6">
      <span class="sr-only">Cargando tu pedido…</span>
      <span aria-hidden="true" class="block h-8 w-36 rounded-sm bg-ink/10" />
      <span aria-hidden="true" class="mt-6 block h-1.5 rounded-full bg-ink/5" />
      <span aria-hidden="true" class="mt-6 block h-4 w-48 rounded-sm bg-ink/5" />
      <span aria-hidden="true" class="mt-2 block h-4 w-40 rounded-sm bg-ink/5" />
    </div>

    <div v-else-if="showError" role="alert" class="mt-8 border-l-2 border-marigold py-1 pl-4">
      <p class="font-semibold">
        No se pudo cargar tu pedido.
      </p>
      <p class="mt-1 text-muted">
        Revisa tu conexión a internet y vuelve a intentarlo.
      </p>
      <button
        type="button"
        class="mt-3 h-8 rounded-md bg-leaf-soft px-4 text-sm font-semibold text-leaf-strong hover:bg-leaf hover:text-white"
        @click="ordersStore.fetchOrders('customer')"
      >
        Reintentar
      </button>
    </div>

    <div v-else-if="!order" class="mt-8">
      <p class="text-muted">
        Todavía no has hecho ningún pedido. Cuando confirmes uno, aquí verás cómo avanza.
      </p>
      <NuxtLink
        to="/"
        class="mt-4 inline-flex h-10 items-center rounded-md bg-leaf px-4 text-sm font-semibold text-white hover:bg-leaf-strong"
      >
        Ver el menú
      </NuxtLink>
    </div>

    <section
      v-else
      aria-labelledby="order-heading"
      class="mt-8 rounded-lg border bg-surface p-6"
      :class="order.status === 'ready' ? 'border-leaf' : 'border-line'"
    >
      <p class="text-sm text-muted">
        {{ isFinished ? 'Tu último pedido' : 'Pedido en curso' }}
      </p>
      <div class="mt-1 flex flex-wrap items-center gap-3">
        <h2 id="order-heading" class="font-display text-3xl font-semibold tracking-tight tabular-nums">
          Folio #{{ order.id }}
        </h2>
        <OrderStatusBadge :status="order.status" />
      </div>

      <p class="mt-4 font-medium" aria-live="polite">
        {{ customerStatusHint(order.status) }}
      </p>

      <OrderProgress :status="order.status" class="mt-5" />

      <ul class="mt-6 space-y-1 border-t border-line pt-4 text-sm">
        <li v-for="item in order.items" :key="item.productId" class="flex justify-between gap-4">
          <span>{{ item.quantity }} × {{ item.name }}</span>
          <span class="tabular-nums text-muted">{{ formatCents(priceToCents(item.unitPrice) * item.quantity) }}</span>
        </li>
      </ul>

      <div class="mt-4 flex items-baseline justify-between border-t border-line pt-4">
        <span class="text-sm text-muted">Total confirmado</span>
        <span class="font-display text-2xl font-semibold tabular-nums">{{ formatPrice(order.total) }}</span>
      </div>

      <p v-if="ordersStore.errorMessage" role="alert" class="mt-4 border-l-2 border-marigold pl-3 text-sm">
        {{ ordersStore.errorMessage }} El estado puede no estar al día.
      </p>
    </section>

    <NuxtLink v-if="order" to="/" class="mt-6 inline-block text-sm font-semibold text-leaf-strong hover:underline">
      Volver al menú
    </NuxtLink>
  </div>
</template>
