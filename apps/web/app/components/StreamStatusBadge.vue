<script setup lang="ts">
import type { OrderStreamState } from '~/types/order'

const props = defineProps<{
  state: OrderStreamState
}>()

const labels: Record<OrderStreamState, string> = {
  idle: 'Sin conexión',
  connecting: 'Conectando…',
  connected: 'En vivo',
  reconnecting: 'Reconectando…',
}

const dotClass = computed(() => {
  if (props.state === 'connected') {
    return 'bg-leaf'
  }
  if (props.state === 'reconnecting' || props.state === 'connecting') {
    return 'bg-marigold animate-pulse'
  }
  return 'bg-muted'
})
</script>

<template>
  <span
    role="status"
    aria-live="polite"
    class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink"
  >
    <span class="size-2 rounded-full" :class="dotClass" aria-hidden="true" />
    <span>{{ labels[state] }}</span>
  </span>
</template>
