<script setup lang="ts">
import type { Order } from '~/types/order'

const props = defineProps<{
  order: Order
  now: number
  highlighted: boolean
  advancing: boolean
  confirming: boolean
  error: string | null
}>()

const emit = defineEmits<{
  advance: []
  cancel: []
}>()

const timeFormatter = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' })

const minutes = computed(() => waitingMinutes(props.order.createdAt, props.now))
const longWait = computed(() => isLongWait(minutes.value, props.order.status))
const receivedAt = computed(() => timeFormatter.format(new Date(props.order.createdAt)))
const itemCount = computed(() => props.order.items.reduce((sum, item) => sum + item.quantity, 0))
const actionLabel = computed(() => {
  if (props.advancing) {
    return 'Actualizando…'
  }
  if (props.confirming) {
    return '¿Confirmar entrega?'
  }
  return nextOrderActionLabel(props.order.status)
})
</script>

<template>
  <article class="ticket-shadow" :aria-labelledby="`ticket-${order.id}`">
    <div class="ticket-edge bg-surface pb-5">
      <header
        class="relative px-5 pt-6 pb-4"
        :class="highlighted ? 'bg-marigold-soft' : ''"
      >
        <span
          class="absolute top-2 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-paper ring-1 ring-ink/15"
          aria-hidden="true"
        />
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs text-muted">
              Folio
            </p>
            <h3 :id="`ticket-${order.id}`" class="font-display text-5xl leading-none font-bold tracking-tight tabular-nums font-stretch-semi-condensed">
              #{{ order.id }}
            </h3>
          </div>
          <div class="text-right">
            <span
              v-if="highlighted"
              class="mb-1 inline-block rounded-full bg-marigold px-2 py-0.5 text-xs font-semibold text-ink"
            >
              Nuevo
            </span>
            <p class="text-lg font-semibold tabular-nums">
              {{ receivedAt }}
            </p>
            <p class="text-sm tabular-nums" :class="longWait ? 'font-bold text-ink' : 'text-muted'">
              {{ formatWaitingTime(minutes) }}
            </p>
          </div>
        </div>
      </header>

      <ul class="mx-5 space-y-2 border-y-2 border-dashed border-ink/25 py-4">
        <li v-for="item in order.items" :key="item.productId" class="grid grid-cols-[2.75rem_1fr] items-baseline">
          <span class="font-display text-2xl font-bold tabular-nums">{{ item.quantity }}×</span>
          <span class="text-lg leading-snug font-semibold">{{ item.name }}</span>
        </li>
      </ul>

      <div class="mx-5 mt-3 flex items-baseline justify-between text-sm text-muted">
        <span>{{ formatItemCount(itemCount) }}</span>
        <span class="tabular-nums">{{ formatPrice(order.total) }}</span>
      </div>

      <div class="mx-5 mt-4">
        <button
          v-if="actionLabel"
          type="button"
          :disabled="advancing"
          :aria-busy="advancing"
          class="h-12 w-full rounded-md px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          :class="confirming
            ? 'bg-marigold text-ink hover:bg-marigold/85'
            : 'bg-leaf text-white hover:bg-leaf-strong'"
          @click="emit('advance')"
        >
          {{ actionLabel }}
        </button>

        <button
          v-if="confirming"
          type="button"
          class="mt-2 h-9 w-full rounded-md text-sm font-semibold text-muted hover:bg-ink/5 hover:text-ink"
          @click="emit('cancel')"
        >
          Cancelar
        </button>

        <p v-if="error" role="alert" class="mt-3 border-l-2 border-marigold pl-3 text-sm">
          {{ error }}
        </p>
      </div>
    </div>
  </article>
</template>
