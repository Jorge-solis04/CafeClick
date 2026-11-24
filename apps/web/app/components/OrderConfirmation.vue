<script setup lang="ts">
import { useCheckoutStore } from '~/stores/checkout'

const checkout = useCheckoutStore()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const headingId = useId()

watch(() => checkout.confirmedOrder, async (order) => {
  if (order) {
    await nextTick()
    dialog.value?.showModal()
    return
  }

  dialog.value?.close()
})

function close() {
  dialog.value?.close()
}

async function track() {
  close()
  await navigateTo('/pedido')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-lg bg-surface p-0 text-ink"
    :aria-labelledby="headingId"
    @close="checkout.dismissConfirmation()"
  >
    <div v-if="checkout.confirmedOrder" class="p-6">
      <p class="text-sm font-semibold text-leaf-strong">
        Pedido confirmado
      </p>
      <h2 :id="headingId" class="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums">
        Folio #{{ checkout.confirmedOrder.id }}
      </h2>

      <dl class="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-4">
        <dt class="text-sm text-muted">
          Estado
        </dt>
        <dd class="text-right font-medium">
          {{ orderStatusLabel(checkout.confirmedOrder.status) }}
        </dd>
        <dt class="text-sm text-muted">
          Total
        </dt>
        <dd class="text-right font-display text-xl font-semibold tabular-nums">
          {{ formatPrice(checkout.confirmedOrder.total) }}
        </dd>
      </dl>

      <ul class="mt-4 space-y-1 border-t border-line pt-4 text-sm">
        <li
          v-for="item in checkout.confirmedOrder.items"
          :key="item.productId"
          class="flex justify-between gap-4"
        >
          <span>{{ item.quantity }} × {{ item.name }}</span>
          <span class="tabular-nums text-muted">{{ formatCents(priceToCents(item.unitPrice) * item.quantity) }}</span>
        </li>
      </ul>

      <p class="mt-5 text-sm text-muted">
        Muestra tu folio al recoger tu pedido.
      </p>

      <div class="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          class="h-11 rounded-md bg-leaf font-semibold text-white hover:bg-leaf-strong"
          @click="track"
        >
          Seguir mi pedido
        </button>
        <button
          type="button"
          class="h-11 rounded-md bg-leaf-soft font-semibold text-leaf-strong hover:bg-leaf hover:text-white"
          @click="close"
        >
          Seguir en el menú
        </button>
      </div>
    </div>
  </dialog>
</template>
