import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkoutErrorMessage, isExpiredSessionError, readApiError } from '../app/utils/apiError.ts'
import { parseStoredCart, toOrderItems } from '../app/utils/storedCart.ts'

const americano = { id: 1, name: 'Café americano', price: '42.50', category: 'drinks' as const }
const croissant = { id: 7, name: 'Croissant', price: '35.00', category: 'food' as const }

test('checkout sends only product ids and quantities', () => {
  assert.deepEqual(toOrderItems([{ product: americano, quantity: 2 }, { product: croissant, quantity: 1 }]), [
    { productId: 1, quantity: 2 },
    { productId: 7, quantity: 1 },
  ])
})

test('a stored cart survives a reload and drops corrupted lines', () => {
  const stored = JSON.stringify([
    { product: americano, quantity: 2 },
    { product: { ...croissant, price: 'gratis' }, quantity: 1 },
    { product: croissant, quantity: 0 },
    { product: null, quantity: 1 },
  ])

  assert.deepEqual(parseStoredCart(stored), [{ product: americano, quantity: 2 }])
  assert.deepEqual(parseStoredCart('not-json'), [])
  assert.deepEqual(parseStoredCart('{"product":1}'), [])
  assert.deepEqual(parseStoredCart(null), [])
})

test('API errors are read from the response body', () => {
  const error = { statusCode: 400, data: { error: { code: 'unknown_product', message: 'Uno de los productos ya no está en el menú.' } } }

  assert.deepEqual(readApiError(error), {
    status: 400,
    code: 'unknown_product',
    message: 'Uno de los productos ya no está en el menú.',
  })
  assert.deepEqual(readApiError(new Error('Network down')), { status: null, code: null, message: null })
  assert.deepEqual(readApiError(undefined), { status: null, code: null, message: null })
})

test('expired or missing sessions are told apart from wrong credentials', () => {
  assert.equal(isExpiredSessionError({ status: 401, code: 'session_expired', message: null }), true)
  assert.equal(isExpiredSessionError({ status: 401, code: 'unauthorized', message: null }), true)
  assert.equal(isExpiredSessionError({ status: 401, code: 'invalid_credentials', message: null }), false)
  assert.equal(isExpiredSessionError({ status: 403, code: 'forbidden', message: null }), false)
})

test('checkout errors show the API reason for invalid carts and a retry hint otherwise', () => {
  assert.equal(
    checkoutErrorMessage({ status: 400, code: 'invalid_order', message: 'Cada producto debe aparecer una sola vez en el pedido.' }),
    'Cada producto debe aparecer una sola vez en el pedido.',
  )
  assert.match(checkoutErrorMessage({ status: 403, code: 'forbidden', message: null }), /cliente/)
  assert.match(checkoutErrorMessage({ status: 500, code: 'internal_error', message: 'Ocurrió un error inesperado.' }), /tu carrito sigue guardado/)
  assert.match(checkoutErrorMessage({ status: null, code: null, message: null }), /tu carrito sigue guardado/)
})
