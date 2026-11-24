<script setup lang="ts">
import { useSessionStore } from '~/stores/session'

definePageMeta({ guestOnly: true })

const session = useSessionStore()
const route = useRoute()
const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const errorId = useId()

async function submit() {
  if (isSubmitting.value) {
    return
  }

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Escribe tu correo y tu contraseña.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  try {
    const user = await session.login(email.value, password.value)
    const redirect = safeRedirectPath(route.query.redirect)
    await navigateTo(user.role === 'customer' && redirect ? redirect : homePathFor(user.role), { replace: true })
  } catch (error) {
    const apiError = readApiError(error)
    errorMessage.value = apiError.status === 401
      ? 'Credenciales inválidas. Revisa tu correo y tu contraseña.'
      : 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.'
    password.value = ''
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm px-5 pt-14 pb-20 sm:px-8">
    <h1 class="font-display text-4xl font-semibold tracking-tight font-stretch-semi-condensed">
      Inicia sesión
    </h1>
    <p class="mt-3 text-muted">
      Usa la cuenta de cliente para pedir o la de cocina para atender pedidos.
    </p>

    <p
      v-if="session.expiredNotice && !errorMessage"
      role="status"
      class="mt-6 border-l-2 border-marigold py-1 pl-4 text-sm"
    >
      Tu sesión expiró. Inicia sesión de nuevo; tu carrito sigue guardado.
    </p>

    <form class="mt-8 space-y-5" novalidate @submit.prevent="submit">
      <div>
        <label for="login-email" class="text-sm font-semibold">Correo</label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          autocomplete="username"
          required
          class="mt-1.5 h-11 w-full rounded-md border border-line bg-surface px-3"
          :aria-describedby="errorMessage ? errorId : undefined"
          :aria-invalid="errorMessage ? 'true' : undefined"
        >
      </div>
      <div>
        <label for="login-password" class="text-sm font-semibold">Contraseña</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="mt-1.5 h-11 w-full rounded-md border border-line bg-surface px-3"
          :aria-describedby="errorMessage ? errorId : undefined"
          :aria-invalid="errorMessage ? 'true' : undefined"
        >
      </div>

      <p v-if="errorMessage" :id="errorId" role="alert" class="border-l-2 border-marigold py-1 pl-4 text-sm">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="h-11 w-full rounded-md bg-leaf font-semibold text-white hover:bg-leaf-strong disabled:cursor-wait disabled:bg-line disabled:text-muted"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>
