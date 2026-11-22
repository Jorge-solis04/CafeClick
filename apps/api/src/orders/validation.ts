import { orderStatus } from '../database/schema.js'

export type OrderStatus = (typeof orderStatus.enumValues)[number]

export type RequestedOrderItem = {
  productId: number
  quantity: number
}

type ValidationResult<T> = { ok: true, value: T } | { ok: false, message: string }

export const maximumOrderLines = 50
export const maximumLineQuantity = 50

const maximumDatabaseInteger = 2_147_483_647
const orderIdPattern = /^[1-9]\d{0,9}$/

function isPositiveDatabaseInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= maximumDatabaseInteger
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseOrderItems(body: unknown): ValidationResult<RequestedOrderItem[]> {
  const items = isPlainObject(body) ? body.items : undefined

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: 'El pedido debe incluir al menos un producto.' }
  }

  if (items.length > maximumOrderLines) {
    return { ok: false, message: `El pedido puede incluir hasta ${maximumOrderLines} productos distintos.` }
  }

  const seenProductIds = new Set<number>()
  const parsedItems: RequestedOrderItem[] = []

  for (const item of items) {
    if (!isPlainObject(item) || !isPositiveDatabaseInteger(item.productId)) {
      return { ok: false, message: 'Cada producto debe tener un identificador válido.' }
    }

    if (!isPositiveDatabaseInteger(item.quantity) || item.quantity > maximumLineQuantity) {
      return { ok: false, message: `Cada cantidad debe ser un número entero entre 1 y ${maximumLineQuantity}.` }
    }

    if (seenProductIds.has(item.productId)) {
      return { ok: false, message: 'Cada producto debe aparecer una sola vez en el pedido.' }
    }

    seenProductIds.add(item.productId)
    parsedItems.push({ productId: item.productId, quantity: item.quantity })
  }

  return { ok: true, value: parsedItems }
}

export function parseOrderId(value: string): number | null {
  if (!orderIdPattern.test(value)) {
    return null
  }

  const orderId = Number(value)
  return orderId <= maximumDatabaseInteger ? orderId : null
}

export function parseOrderStatus(body: unknown): OrderStatus | null {
  const status = isPlainObject(body) ? body.status : undefined
  return orderStatus.enumValues.find((value) => value === status) ?? null
}
