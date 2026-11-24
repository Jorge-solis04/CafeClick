import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Order } from '../app/types/order.ts'
import { findNewPendingOrderIds } from '../app/utils/orderUpdates.ts'
import { formatWaitingTime, isLongWait, waitingMinutes } from '../app/utils/waitingTime.ts'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    status: 'pending',
    version: 1,
    createdAt: '2026-11-23T18:00:00.000Z',
    total: '42.50',
    items: [{ productId: 1, name: 'Café americano', quantity: 1, unitPrice: '42.50' }],
    ...overrides,
  }
}

test('waitingMinutes counts whole minutes and never goes negative', () => {
  const createdAt = '2026-11-23T18:00:00.000Z'
  const created = Date.parse(createdAt)

  assert.equal(waitingMinutes(createdAt, created + 59_000), 0)
  assert.equal(waitingMinutes(createdAt, created + 12 * 60_000 + 30_000), 12)
  assert.equal(waitingMinutes(createdAt, created - 5 * 60_000), 0)
  assert.equal(waitingMinutes('not a date', created), 0)
})

test('formatWaitingTime reads naturally for minutes and hours', () => {
  assert.equal(formatWaitingTime(0), 'Recién llegado')
  assert.equal(formatWaitingTime(7), 'Esperando 7 min')
  assert.equal(formatWaitingTime(60), 'Esperando 1 h')
  assert.equal(formatWaitingTime(95), 'Esperando 1 h 35 min')
})

test('isLongWait only flags orders the kitchen still has to work on', () => {
  assert.equal(isLongWait(14, 'pending'), false)
  assert.equal(isLongWait(15, 'pending'), true)
  assert.equal(isLongWait(20, 'preparing'), true)
  assert.equal(isLongWait(40, 'ready'), false)
})

test('findNewPendingOrderIds reports only pending orders that were not listed before', () => {
  const previous = [makeOrder({ id: 1 }), makeOrder({ id: 2, status: 'preparing' })]
  const next = [
    ...previous,
    makeOrder({ id: 3 }),
    makeOrder({ id: 4, status: 'preparing' }),
    makeOrder({ id: 5 }),
  ]

  assert.deepEqual(findNewPendingOrderIds(previous, next), [3, 5])
  assert.deepEqual(findNewPendingOrderIds(next, next), [])
})
