<script setup lang="ts">
import type { OrderStatus } from '~/types/order'

const props = defineProps<{
  status: OrderStatus
}>()

const steps = computed(() => orderProgressSteps(props.status))
</script>

<template>
  <ol class="grid grid-cols-4 gap-2" aria-label="Avance del pedido">
    <li
      v-for="step in steps"
      :key="step.status"
      :aria-current="step.state === 'current' ? 'step' : undefined"
      class="min-w-0"
    >
      <span
        class="block h-1.5 rounded-full"
        :class="step.state === 'upcoming' ? 'bg-ink/10' : 'bg-leaf'"
        aria-hidden="true"
      />
      <span
        class="mt-2 block text-xs leading-tight"
        :class="step.state === 'current' ? 'font-semibold text-ink' : 'text-muted'"
      >
        {{ step.label }}
        <span v-if="step.state === 'done'" class="sr-only">(completado)</span>
      </span>
    </li>
  </ol>
</template>
