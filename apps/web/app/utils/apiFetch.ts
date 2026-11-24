import { useSessionStore } from '~/stores/session'

const apiTimeoutMs = 10000

type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: Record<string, unknown>
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const session = useSessionStore()
  const { public: { apiBase } } = useRuntimeConfig()

  try {
    return await $fetch<T>(path, {
      method: options.method ?? 'GET',
      body: options.body,
      headers: session.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      baseURL: apiBase || undefined,
      timeout: apiTimeoutMs,
      retry: 0,
    })
  } catch (error) {
    if (isExpiredSessionError(readApiError(error))) {
      session.expire()
      await navigateTo({ path: '/login', query: { redirect: useRoute().fullPath } })
    }

    throw error
  }
}
