<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import { useSessionStore } from '~/stores/session'

const session = useSessionStore()
const ordersStore = useOrdersStore()

const activeOrder = computed(() => (
  session.user?.role === 'customer' ? ordersStore.activeCustomerOrder : null
))
</script>

<template>
  <section
    v-if="activeOrder"
    aria-label="Seguimiento de tu pedido"
    class="mb-8 rounded-lg border border-line bg-surface p-4 sm:p-5"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-semibold tracking-wide text-muted uppercase">
          Tu pedido actual
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-2.5">
          <h2 class="font-display text-2xl font-semibold tracking-tight tabular-nums">
            Folio #{{ activeOrder.id }}
          </h2>
          <OrderStatusBadge :status="activeOrder.status" />
          <span class="text-xs tabular-nums text-muted">v{{ activeOrder.version }}</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <StreamStatusBadge :state="ordersStore.connectionState" />
        <span class="font-display text-xl font-semibold tabular-nums">
          {{ formatPrice(activeOrder.total) }}
        </span>
      </div>
    </div>

    <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-sm text-muted">
      <li v-for="item in activeOrder.items" :key="item.productId">
        {{ item.quantity }} × {{ item.name }}
      </li>
    </ul>
  </section>
</template>
