import { ref } from 'vue'
import type { Product } from '~/types/catalog'

type CatalogStatus = 'loading' | 'error' | 'ready'

const catalogTimeoutMs = 10000

function isCatalogResponse(response: unknown): response is { products: Product[] } {
  return typeof response === 'object'
    && response !== null
    && Array.isArray((response as { products?: unknown }).products)
}

export function useCatalog() {
  const { public: { apiBase } } = useRuntimeConfig()
  const products = ref<Product[]>([])
  const status = ref<CatalogStatus>('loading')

  async function load() {
    status.value = 'loading'

    try {
      const response = await $fetch<unknown>('/api/products', {
        baseURL: apiBase || undefined,
        timeout: catalogTimeoutMs,
        retry: 0,
      })

      if (!isCatalogResponse(response)) {
        throw new Error('Unexpected catalog response')
      }

      products.value = response.products
      status.value = 'ready'
    } catch (error) {
      console.error('Failed to load the catalog', error)
      status.value = 'error'
    }
  }

  return { products, status, load }
}
