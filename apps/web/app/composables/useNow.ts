import { onScopeDispose, ref } from 'vue'

export function useNow(intervalMs = 30000) {
  const now = ref(Date.now())

  if (import.meta.client) {
    const timer = setInterval(() => {
      now.value = Date.now()
    }, intervalMs)

    onScopeDispose(() => clearInterval(timer))
  }

  return now
}
