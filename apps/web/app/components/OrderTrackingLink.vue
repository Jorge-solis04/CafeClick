<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import type { OrderStatus } from '~/types/order'

const ordersStore = useOrdersStore()
const route = useRoute()

const activeOrder = computed(() => {
  const order = ordersStore.activeCustomerOrder
  return order && order.status !== 'delivered' ? order : null
})

const dotClasses: Record<OrderStatus, string> = {
  pending: 'bg-marigold',
  preparing: 'bg-leaf motion-safe:animate-pulse',
  ready: 'bg-leaf',
  delivered: 'bg-muted',
}
</script>

<template>
  <NuxtLink
    to="/pedido"
    :aria-current="route.path === '/pedido' ? 'page' : undefined"
    class="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 font-semibold hover:border-leaf"
    :class="activeOrder?.status === 'ready'
      ? 'border-leaf bg-leaf-soft text-leaf-strong'
      : 'border-line bg-surface text-ink'"
  >
    <span
      v-if="activeOrder"
      class="size-2 rounded-full"
      :class="dotClasses[activeOrder.status]"
      aria-hidden="true"
    />
    <span>Seguimiento</span>
    <span v-if="activeOrder" class="hidden font-normal text-muted tabular-nums sm:inline">
      #{{ activeOrder.id }} · {{ orderStatusLabel(activeOrder.status) }}
    </span>
    <span v-if="activeOrder" class="sr-only sm:hidden">
      del folio {{ activeOrder.id }}: {{ orderStatusLabel(activeOrder.status) }}
    </span>
  </NuxtLink>
</template>
