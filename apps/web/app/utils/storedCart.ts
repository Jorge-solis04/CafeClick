import type { Product, ProductCategory } from '~/types/catalog'

export type StoredCartLine = {
  product: Product
  quantity: number
}

const productCategories: ProductCategory[] = ['drinks', 'food']
const pricePattern = /^\d+(\.\d{1,2})?$/

function isStoredCartLine(value: unknown): value is StoredCartLine {
  const line = value as Partial<StoredCartLine> | null
  const product = line?.product as Partial<Product> | undefined

  return typeof product === 'object'
    && product !== null
    && Number.isSafeInteger(product.id)
    && typeof product.name === 'string'
    && typeof product.price === 'string'
    && pricePattern.test(product.price)
    && productCategories.includes(product.category as ProductCategory)
    && Number.isSafeInteger(line?.quantity)
    && (line?.quantity as number) > 0
}

export function parseStoredCart(serialized: string | null): StoredCartLine[] {
  if (!serialized) {
    return []
  }

  try {
    const lines: unknown = JSON.parse(serialized)
    return Array.isArray(lines) ? lines.filter(isStoredCartLine) : []
  } catch {
    return []
  }
}

export function toOrderItems(lines: StoredCartLine[]) {
  return lines.map((line) => ({ productId: line.product.id, quantity: line.quantity }))
}
