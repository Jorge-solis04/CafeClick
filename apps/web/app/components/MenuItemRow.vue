<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import type { Product } from '~/types/catalog'

const props = defineProps<{
  product: Product
}>()

const cart = useCartStore()
const quantity = computed(() => cart.quantityOf(props.product.id))
</script>

<template>
  <li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-2.5 sm:gap-x-8">
    <div class="flex min-w-0 items-baseline">
      <span class="font-display text-lg leading-snug font-medium sm:text-[1.375rem]">
        {{ product.name }}
      </span>
      <span aria-hidden="true" class="mx-3 min-w-4 flex-1 border-b border-dotted border-ink/55" />
      <span class="shrink-0 font-semibold tabular-nums">
        {{ formatPrice(product.price) }}
      </span>
    </div>

    <div class="flex w-26 justify-end">
      <button
        v-if="quantity === 0"
        type="button"
        class="h-8 w-26 rounded-md bg-leaf-soft text-sm font-semibold text-leaf-strong hover:bg-leaf hover:text-white"
        :aria-label="`Agregar ${product.name}`"
        @click="cart.add(product)"
      >
        Agregar
      </button>
      <QuantityStepper
        v-else
        :quantity="quantity"
        :label="product.name"
        @increment="cart.add(product)"
        @decrement="cart.decrement(product.id)"
      />
    </div>
  </li>
</template>
