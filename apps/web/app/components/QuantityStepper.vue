<script setup lang="ts">
const props = withDefaults(defineProps<{
  quantity: number
  label: string
  tone?: 'highlight' | 'neutral'
}>(), {
  tone: 'highlight',
})

const emit = defineEmits<{
  increment: []
  decrement: []
}>()

const toneClasses = computed(() => props.tone === 'highlight'
  ? 'border-marigold/50 bg-marigold-soft text-leaf-strong'
  : 'border-ink/20 bg-surface text-ink')
const buttonHoverClass = computed(() => props.tone === 'highlight' ? 'hover:bg-marigold/25' : 'hover:bg-ink/5')

const decrementLabel = computed(() => props.quantity === 1 ? `Quitar ${props.label}` : `Quitar uno de ${props.label}`)
</script>

<template>
  <div
    class="inline-flex h-8 w-26 items-center justify-between rounded-md border"
    :class="toneClasses"
    role="group"
    :aria-label="`Cantidad de ${label}`"
  >
    <button
      type="button"
      class="grid h-full w-8 place-items-center rounded-l-md text-base leading-none"
      :class="buttonHoverClass"
      :aria-label="decrementLabel"
      @click="emit('decrement')"
    >
      −
    </button>
    <output class="min-w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
      {{ quantity }}
    </output>
    <button
      type="button"
      class="grid h-full w-8 place-items-center rounded-r-md text-base leading-none"
      :class="buttonHoverClass"
      :aria-label="`Agregar otro ${label}`"
      @click="emit('increment')"
    >
      +
    </button>
  </div>
</template>
