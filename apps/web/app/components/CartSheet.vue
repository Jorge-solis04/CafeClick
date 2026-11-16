<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cart = useCartStore()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

function open() {
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

function closeOnBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) {
    close()
  }
}

watch(() => cart.itemCount, (itemCount) => {
  if (itemCount === 0) {
    close()
  }
})
</script>

<template>
  <div
    v-if="cart.itemCount"
    class="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
  >
    <div class="mx-auto flex max-w-xl items-center justify-between gap-4">
      <div>
        <p class="text-sm text-muted">
          {{ formatItemCount(cart.itemCount) }}
        </p>
        <p class="font-display text-xl font-semibold tabular-nums">
          {{ formatCents(cart.subtotalCents) }}
        </p>
      </div>
      <button
        type="button"
        class="h-11 rounded-md bg-leaf px-5 font-semibold text-white hover:bg-leaf-strong"
        aria-haspopup="dialog"
        @click="open"
      >
        Ver pedido
      </button>
    </div>
  </div>

  <dialog
    ref="dialog"
    class="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-lg bg-surface p-0 text-ink"
    aria-label="Tu pedido"
    @click="closeOnBackdropClick"
  >
    <div class="mx-auto max-w-xl px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div class="flex justify-end">
        <button
          type="button"
          class="-mr-2 rounded-md px-2 py-1 text-sm font-medium text-muted hover:text-ink"
          @click="close"
        >
          Cerrar
        </button>
      </div>
      <CartSummary />
    </div>
  </dialog>
</template>
