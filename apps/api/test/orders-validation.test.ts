import assert from 'node:assert/strict'
import { test } from 'node:test'
import { centsToPrice, priceToCents } from '../src/orders/money.js'
import { maximumLineQuantity, maximumOrderLines, parseOrderId, parseOrderItems, parseOrderStatus } from '../src/orders/validation.js'

test('order items accept positive integer ids and quantities', () => {
  assert.deepEqual(parseOrderItems({ items: [{ productId: 1, quantity: 2, price: '0.01' }] }), {
    ok: true,
    value: [{ productId: 1, quantity: 2 }],
  })
})

test('order items reject empty, malformed, duplicated and oversized carts', () => {
  const invalidBodies = [
    undefined,
    {},
    { items: [] },
    { items: 'not-an-array' },
    { items: [null] },
    { items: [{ productId: '1', quantity: 1 }] },
    { items: [{ productId: 0, quantity: 1 }] },
    { items: [{ productId: 2_147_483_648, quantity: 1 }] },
    { items: [{ productId: 1, quantity: 0 }] },
    { items: [{ productId: 1, quantity: 1.5 }] },
    { items: [{ productId: 1, quantity: maximumLineQuantity + 1 }] },
    { items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }] },
    { items: Array.from({ length: maximumOrderLines + 1 }, (_, index) => ({ productId: index + 1, quantity: 1 })) },
  ]

  for (const body of invalidBodies) {
    assert.equal(parseOrderItems(body).ok, false, JSON.stringify(body))
  }
})

test('order ids must be positive integers that fit in PostgreSQL', () => {
  assert.equal(parseOrderId('12'), 12)

  for (const value of ['0', '-1', '1.5', 'abc', '012', '2147483648']) {
    assert.equal(parseOrderId(value), null, value)
  }
})

test('order status must be a known status', () => {
  assert.equal(parseOrderStatus({ status: 'preparing' }), 'preparing')
  assert.equal(parseOrderStatus({ status: 'cancelled' }), null)
  assert.equal(parseOrderStatus(undefined), null)
})

test('prices convert to cents and back without floating point drift', () => {
  assert.equal(priceToCents('42.50'), 4250)
  assert.equal(priceToCents('7'), 700)
  assert.equal(centsToPrice(4250 * 3), '127.50')
  assert.equal(centsToPrice(5), '0.05')
  assert.equal(centsToPrice(0), '0.00')
})
