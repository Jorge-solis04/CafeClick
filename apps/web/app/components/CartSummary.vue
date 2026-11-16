<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

withDefaults(defineProps<{
  canConfirm?: boolean
}>(), {
  canConfirm: false,
})

const emit = defineEmits<{
  confirm: []
}>()

const cart = useCartStore()
const headingId = useId()
const confirmHintId = useId()
</script>

<template>
  <section :aria-labelledby="headingId">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 :id="headingId" class="font-display text-xl leading-tight font-semibold">
          Tu pedido
        </h2>
        <p v-if="cart.itemCount" class="mt-0.5 text-sm text-muted">
          {{ formatItemCount(cart.itemCount) }}
        </p>
      </div>
      <button
        v-if="cart.itemCount"
        type="button"
        class="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        @click="cart.clear()"
      >
        Vaciar
      </button>
    </div>

    <p v-if="!cart.itemCount" class="mt-3 text-sm leading-relaxed text-muted">
      Agrega productos del menú para armar tu pedido.
    </p>

    <template v-else>
      <ul class="mt-4 border-t border-line">
        <li v-for="line in cart.lines" :key="line.product.id" class="border-b border-line py-3">
          <div class="flex items-baseline justify-between gap-4">
            <span class="leading-snug font-medium">{{ line.product.name }}</span>
            <span class="shrink-0 font-medium tabular-nums">
              {{ formatCents(priceToCents(line.product.price) * line.quantity) }}
            </span>
          </div>
          <div class="mt-2 flex items-center justify-between gap-3">
            <span v-if="line.quantity > 1" class="text-sm text-muted tabular-nums">
              {{ formatPrice(line.product.price) }} c/u
            </span>
            <span v-else />
            <QuantityStepper
              tone="neutral"
              :quantity="line.quantity"
              :label="line.product.name"
              @increment="cart.add(line.product)"
              @decrement="cart.decrement(line.product.id)"
            />
          </div>
        </li>
      </ul>

      <div class="mt-4 flex items-baseline justify-between gap-4">
        <span class="text-sm font-semibold">Subtotal</span>
        <span class="font-display text-2xl font-semibold tabular-nums">
          {{ formatCents(cart.subtotalCents) }}
        </span>
      </div>
      <p class="mt-1 text-xs leading-relaxed text-muted">
        Precio estimado. La cafetería confirma el total al recibir tu pedido.
      </p>

      <button
        type="button"
        class="mt-5 h-11 w-full rounded-md bg-leaf font-semibold text-white hover:bg-leaf-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
        :disabled="!canConfirm"
        :aria-describedby="canConfirm ? undefined : confirmHintId"
        @click="emit('confirm')"
      >
        Confirmar pedido
      </button>
      <p v-if="!canConfirm" :id="confirmHintId" class="mt-2 text-center text-xs text-muted">
        Inicia sesión para confirmar tu pedido.
      </p>
    </template>
  </section>
</template>
