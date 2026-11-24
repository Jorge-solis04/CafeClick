import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Order } from '../app/types/order.ts'
import { advanceStatusErrorMessage, shouldRefreshAfterAdvanceError } from '../app/utils/apiError.ts'
import { customerStatusHint, nextOrderActionLabel, nextOrderStatus, orderProgressSteps } from '../app/utils/orderStatus.ts'
import { applyOrderUpdate, buildOrderStreamUrl, reconnectDelayMs, reconcileOrders } from '../app/utils/orderUpdates.ts'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    status: 'pending',
    version: 1,
    createdAt: '2026-11-22T12:00:00.000Z',
    total: '42.50',
    items: [{ productId: 1, name: 'Café americano', quantity: 1, unitPrice: '42.50' }],
    ...overrides,
  }
}

test('applyOrderUpdate applies newer versions and ignores duplicates or regressions', () => {
  const initial = [makeOrder({ id: 10, status: 'preparing', version: 2 })]

  const duplicate = applyOrderUpdate(initial, makeOrder({ id: 10, status: 'preparing', version: 2 }), 'customer')
  assert.equal(duplicate, initial)

  const regression = applyOrderUpdate(initial, makeOrder({ id: 10, status: 'pending', version: 1 }), 'customer')
  assert.equal(regression, initial)

  const advanced = applyOrderUpdate(initial, makeOrder({ id: 10, status: 'ready', version: 3 }), 'customer')
  assert.equal(advanced[0]?.status, 'ready')
  assert.equal(advanced[0]?.version, 3)
})

test('applyOrderUpdate orders kitchen oldest-first, customer newest-first, and removes delivered from kitchen', () => {
  const older = makeOrder({ id: 1, createdAt: '2026-11-22T12:00:00.000Z' })
  const newer = makeOrder({ id: 2, createdAt: '2026-11-22T12:05:00.000Z' })

  const kitchenList = applyOrderUpdate([newer], older, 'kitchen')
  assert.deepEqual(kitchenList.map((order) => order.id), [1, 2])

  const customerList = applyOrderUpdate([older], newer, 'customer')
  assert.deepEqual(customerList.map((order) => order.id), [2, 1])

  const afterDelivered = applyOrderUpdate(kitchenList, { ...older, status: 'delivered', version: 4 }, 'kitchen')
  assert.deepEqual(afterDelivered.map((order) => order.id), [2])

  const customerDelivered = applyOrderUpdate(customerList, { ...older, status: 'delivered', version: 4 }, 'customer')
  assert.equal(customerDelivered.find((order) => order.id === 1)?.status, 'delivered')
})

test('reconcileOrders merges REST snapshot without reverting newer local SSE revisions', () => {
  const local = [makeOrder({ id: 5, status: 'ready', version: 3 })]
  const staleSnapshot = [
    makeOrder({ id: 5, status: 'preparing', version: 2 }),
    makeOrder({ id: 6, status: 'pending', version: 1, createdAt: '2026-11-22T12:10:00.000Z' }),
  ]

  const reconciled = reconcileOrders(local, staleSnapshot, 'kitchen')
  assert.deepEqual(reconciled.map((order) => ({ id: order.id, status: order.status, version: order.version })), [
    { id: 5, status: 'ready', version: 3 },
    { id: 6, status: 'pending', version: 1 },
  ])
})

test('reconnectDelayMs backs off smoothly and buildOrderStreamUrl encodes tickets', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 10].map(reconnectDelayMs), [1000, 2000, 4000, 8000, 15000, 15000])
  assert.equal(buildOrderStreamUrl('', 'abc+123'), '/api/orders/stream?ticket=abc%2B123')
  assert.equal(buildOrderStreamUrl('https://api.cafeclick.test/', 'tok'), 'https://api.cafeclick.test/api/orders/stream?ticket=tok')
  assert.equal(nextOrderStatus('pending'), 'preparing')
  assert.equal(nextOrderStatus('delivered'), null)
  assert.equal(nextOrderActionLabel('ready'), 'Marcar como entregado')
})

test('orderProgressSteps marks finished, current and upcoming steps in order', () => {
  assert.deepEqual(
    orderProgressSteps('pending').map((step) => step.state),
    ['current', 'upcoming', 'upcoming', 'upcoming'],
  )
  assert.deepEqual(
    orderProgressSteps('ready').map((step) => [step.status, step.state]),
    [['pending', 'done'], ['preparing', 'done'], ['ready', 'current'], ['delivered', 'upcoming']],
  )
  assert.deepEqual(
    orderProgressSteps('delivered').map((step) => step.state),
    ['done', 'done', 'done', 'current'],
  )
  assert.equal(orderProgressSteps('preparing')[1]?.label, 'En preparación')
})

test('every status has a customer hint', () => {
  for (const status of ['pending', 'preparing', 'ready', 'delivered'] as const) {
    assert.ok(customerStatusHint(status).length > 0)
  }
})

test('advance errors explain conflicts and only refresh when the order changed elsewhere', () => {
  const conflict = { status: 409, code: 'invalid_transition', message: null }
  const missing = { status: 404, code: 'order_not_found', message: null }
  const offline = { status: null, code: null, message: null }

  assert.match(advanceStatusErrorMessage(conflict), /otra pantalla/)
  assert.match(advanceStatusErrorMessage(missing), /ya no existe/)
  assert.match(advanceStatusErrorMessage(offline), /conexión/)
  assert.match(advanceStatusErrorMessage({ status: 403, code: 'forbidden', message: null }), /cocina/)

  assert.equal(shouldRefreshAfterAdvanceError(conflict), true)
  assert.equal(shouldRefreshAfterAdvanceError(missing), true)
  assert.equal(shouldRefreshAfterAdvanceError(offline), false)
})
