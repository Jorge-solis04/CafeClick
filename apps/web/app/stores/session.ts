import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SessionUser, StoredSession } from '~/types/session'

const sessionStorageKey = 'cafeclick.session'
const sessionTimeoutMs = 10000

function readStoredSession() {
  try {
    return parseStoredSession(localStorage.getItem(sessionStorageKey))
  } catch {
    return null
  }
}

function writeStoredSession(session: StoredSession | null) {
  try {
    if (session) {
      localStorage.setItem(sessionStorageKey, JSON.stringify(session))
    } else {
      localStorage.removeItem(sessionStorageKey)
    }
  } catch {
    return
  }
}

export const useSessionStore = defineStore('session', () => {
  const session = ref<StoredSession | null>(null)
  const expiredNotice = ref(false)
  let restoring: Promise<void> | undefined

  const user = computed(() => session.value?.user ?? null)
  const token = computed(() => session.value?.token ?? null)
  const isAuthenticated = computed(() => session.value !== null)

  function apiBaseUrl() {
    return useRuntimeConfig().public.apiBase || undefined
  }

  function save(nextSession: StoredSession | null) {
    session.value = nextSession
    writeStoredSession(nextSession)
  }

  async function validateStoredSession(storedSession: StoredSession) {
    session.value = storedSession

    try {
      const response = await $fetch<{ user: SessionUser }>('/api/auth/session', {
        baseURL: apiBaseUrl(),
        headers: { Authorization: `Bearer ${storedSession.token}` },
        timeout: sessionTimeoutMs,
        retry: 0,
      })
      save({ ...storedSession, user: response.user })
    } catch (error) {
      if (isExpiredSessionError(readApiError(error))) {
        expire()
      }
    }
  }

  function restore() {
    restoring ??= (async () => {
      const storedSession = readStoredSession()

      if (storedSession) {
        await validateStoredSession(storedSession)
      } else {
        writeStoredSession(null)
      }
    })()

    return restoring
  }

  async function login(email: string, password: string) {
    const response = await $fetch<StoredSession>('/api/auth/login', {
      method: 'POST',
      baseURL: apiBaseUrl(),
      body: { email, password },
      timeout: sessionTimeoutMs,
      retry: 0,
    })

    expiredNotice.value = false
    save({ token: response.token, expiresAt: response.expiresAt, user: response.user })
    return response.user
  }

  async function logout() {
    const currentToken = token.value
    save(null)

    if (!currentToken) {
      return
    }

    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        baseURL: apiBaseUrl(),
        headers: { Authorization: `Bearer ${currentToken}` },
        timeout: sessionTimeoutMs,
        retry: 0,
      })
    } catch (error) {
      console.error('Failed to revoke the session', error)
    }
  }

  function expire() {
    save(null)
    expiredNotice.value = true
  }

  return { user, token, isAuthenticated, expiredNotice, restore, login, logout, expire }
})
