<script setup lang="ts">
defineProps<{
  message: string | null
}>()

const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-4 bottom-4 z-20 flex justify-end sm:inset-x-auto sm:right-6 sm:bottom-6">
    <div role="status" aria-live="polite">
      <div
        v-if="message"
        class="pointer-events-auto flex items-center gap-4 rounded-lg border border-marigold bg-marigold-soft py-3 pr-3 pl-4 text-ink"
      >
        <span class="size-2.5 shrink-0 rounded-full bg-marigold" aria-hidden="true" />
        <p class="font-semibold">
          {{ message }}
        </p>
        <button
          type="button"
          class="h-8 rounded-md px-3 text-sm font-semibold text-ink hover:bg-marigold/25"
          @click="emit('dismiss')"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
</template>
