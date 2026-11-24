<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useOrdersStore } from '~/stores/orders'

const ordersStore = useOrdersStore()
const cart = useCartStore()

const order = computed(() => {
  const active = ordersStore.activeCustomerOrder
  return active && active.status !== 'delivered' ? active : null
})
const steps = computed(() => (order.value ? orderProgressSteps(order.value.status).slice(0, 3) : []))
const isReady = computed(() => order.value?.status === 'ready')
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 z-10 px-4 lg:right-auto lg:left-8"
    :class="cart.itemCount ? 'bottom-24 lg:bottom-6' : 'bottom-[max(1rem,env(safe-area-inset-bottom))] lg:bottom-6'"
  >
    <div class="mx-auto max-w-md lg:mx-0 lg:w-96" aria-live="polite">
      <NuxtLink
        v-if="order"
        to="/pedido"
        class="pointer-events-auto block rounded-xl px-4 py-3.5 shadow-lg shadow-ink/20 focus-visible:outline-offset-4"
        :class="isReady ? 'bg-leaf text-white' : 'bg-ink text-paper'"
      >
        <span class="flex items-center justify-between gap-4">
          <span class="min-w-0">
            <span class="block font-display text-xl leading-tight font-semibold tracking-tight">
              {{ customerStatusTitle(order.status) }}
            </span>
            <span class="mt-0.5 block truncate text-sm opacity-80">
              Folio #{{ order.id }}
            </span>
          </span>
          <span class="shrink-0 text-sm font-semibold underline-offset-4">Ver seguimiento</span>
        </span>

        <span class="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
          <span
            v-for="step in steps"
            :key="step.status"
            class="h-1.5 overflow-hidden rounded-full bg-current/20"
          >
            <span
              v-if="step.state !== 'upcoming'"
              class="block h-full rounded-full bg-current"
              :class="step.state === 'current' && !isReady ? 'tracker-progress' : 'w-full'"
            />
          </span>
        </span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.tracker-progress {
  width: 100%;
  transform-origin: left;
  animation: tracker-fill 2.4s ease-in-out infinite;
}

@keyframes tracker-fill {
  0% { transform: scaleX(0.15); opacity: 0.7; }
  60% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0.4; }
}

@media (prefers-reduced-motion: reduce) {
  .tracker-progress {
    animation: none;
    transform: scaleX(0.5);
  }
}
</style>
