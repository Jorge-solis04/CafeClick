<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useCheckoutStore } from '~/stores/checkout'
import { useSessionStore } from '~/stores/session'

const cart = useCartStore()
const checkout = useCheckoutStore()
const session = useSessionStore()
const route = useRoute()
const headingId = useId()
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
        :disabled="checkout.isSubmitting"
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

      <p
        v-if="checkout.errorMessage"
        role="alert"
        class="mt-4 border-l-2 border-marigold py-1 pl-3 text-sm"
      >
        {{ checkout.errorMessage }}
      </p>

      <button
        v-if="session.isAuthenticated"
        type="button"
        class="mt-5 h-11 w-full rounded-md bg-leaf font-semibold text-white hover:bg-leaf-strong disabled:cursor-wait disabled:bg-line disabled:text-muted"
        :disabled="checkout.isSubmitting"
        @click="checkout.confirm()"
      >
        {{ checkout.isSubmitting ? 'Confirmando…' : 'Confirmar pedido' }}
      </button>
      <template v-else>
        <NuxtLink
          :to="{ path: '/login', query: { redirect: route.fullPath } }"
          class="mt-5 flex h-11 w-full items-center justify-center rounded-md bg-leaf font-semibold text-white hover:bg-leaf-strong"
        >
          Inicia sesión para confirmar
        </NuxtLink>
        <p class="mt-2 text-center text-xs text-muted">
          Tu carrito se conserva mientras inicias sesión.
        </p>
      </template>
    </template>
  </section>
</template>
