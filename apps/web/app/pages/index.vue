<script setup lang="ts">
import { useCatalog } from '~/composables/useCatalog'

const { products, status, load } = useCatalog()
const placeholderNameWidths = ['11rem', '8rem', '13rem', '9.5rem', '12rem', '7rem']

onMounted(load)
</script>

<template>
  <div class="mx-auto grid max-w-6xl gap-x-16 px-5 pt-10 pb-32 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pt-14 lg:pb-20">
    <section aria-labelledby="menu-heading">
      <h1 id="menu-heading" class="font-display text-4xl font-semibold tracking-tight font-stretch-semi-condensed sm:text-5xl">
        Menú
      </h1>
      <p class="mt-3 max-w-prose text-muted">
        Elige lo que quieras y revisa tu pedido antes de confirmarlo.
      </p>

      <div class="mt-8">
        <ul v-if="status === 'loading'" aria-busy="true" class="-my-3">
          <li class="sr-only">Cargando el menú…</li>
          <li
            v-for="width in placeholderNameWidths"
            :key="width"
            aria-hidden="true"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-2.5 sm:gap-x-8"
          >
            <div class="flex items-center">
              <span class="h-5 rounded-sm bg-ink/10" :style="{ width }" />
              <span class="mx-3 flex-1" />
              <span class="h-4 w-14 rounded-sm bg-ink/10" />
            </div>
            <span class="h-8 w-26 rounded-md bg-ink/5" />
          </li>
        </ul>

        <div v-else-if="status === 'error'" role="alert" class="border-l-2 border-marigold py-1 pl-4">
          <p class="font-semibold">
            No se pudo cargar el menú.
          </p>
          <p class="mt-1 text-muted">
            Revisa tu conexión a internet y vuelve a intentarlo.
          </p>
          <button
            type="button"
            class="mt-3 h-8 rounded-md bg-leaf-soft px-4 text-sm font-semibold text-leaf-strong hover:bg-leaf hover:text-white"
            @click="load"
          >
            Reintentar
          </button>
        </div>

        <p v-else-if="products.length === 0" class="text-muted">
          Todavía no hay productos en el menú. Vuelve a revisar más tarde.
        </p>

        <ul v-else class="-my-3">
          <MenuItemRow v-for="product in products" :key="product.id" :product="product" />
        </ul>
      </div>
    </section>

    <aside class="hidden lg:block">
      <div class="sticky top-6 rounded-lg border border-line bg-surface p-5">
        <CartSummary />
      </div>
    </aside>

    <CartSheet />
  </div>
</template>
