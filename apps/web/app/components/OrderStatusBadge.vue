<script setup lang="ts">
import type { OrderStatus } from '~/types/order'

const props = defineProps<{
  status: OrderStatus
}>()

const badgeClasses: Record<OrderStatus, string> = {
  pending: 'border-marigold/40 bg-marigold/15 text-ink',
  preparing: 'border-leaf/40 bg-leaf-soft text-leaf-strong',
  ready: 'border-leaf bg-leaf text-white',
  delivered: 'border-line bg-ink/5 text-muted',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
    :class="badgeClasses[props.status]"
  >
    {{ orderStatusLabel(props.status) }}
  </span>
</template>
