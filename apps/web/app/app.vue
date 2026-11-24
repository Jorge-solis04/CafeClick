<script setup lang="ts">
import { useSessionStore } from '~/stores/session'

const session = useSessionStore()
const route = useRoute()

useOrderStream()

async function logout() {
  await session.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh">
    <header class="border-b border-line">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <NuxtLink
          :to="session.user ? homePathFor(session.user.role) : '/'"
          class="font-display text-2xl font-bold tracking-tight font-stretch-semi-condensed"
        >
          CaféClick
        </NuxtLink>
        <div v-if="session.user" class="flex min-w-0 items-center gap-4 text-sm">
          <OrderTrackingLink v-if="session.user.role === 'customer'" />
          <span class="hidden truncate text-muted sm:inline">{{ session.user.email }}</span>
          <button type="button" class="shrink-0 font-semibold text-leaf-strong hover:underline" @click="logout">
            Cerrar sesión
          </button>
        </div>
        <NuxtLink
          v-else-if="route.path !== '/login'"
          :to="{ path: '/login', query: { redirect: route.fullPath } }"
          class="text-sm font-semibold text-leaf-strong hover:underline"
        >
          Iniciar sesión
        </NuxtLink>
        <p v-else class="text-sm text-muted">
          Cafetería universitaria
        </p>
      </div>
    </header>

    <main>
      <NuxtPage />
    </main>
  </div>
</template>
