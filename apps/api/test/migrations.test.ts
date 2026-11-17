import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { migrateDatabase } from '../src/database/migrations.js'

const databaseUrl = process.env.TEST_DATABASE_URL
const migrationsDirectory = fileURLToPath(new URL('../../../database/migrations/', import.meta.url))

test('migrations enforce order constraints and preserve existing data on reruns', async (context) => {
  if (!databaseUrl) {
    context.skip('Set TEST_DATABASE_URL to a local PostgreSQL instance')
    return
  }

  const databaseName = `cafeclick_test_${randomUUID().replaceAll('-', '')}`
  const testUrl = new URL(databaseUrl)
  testUrl.pathname = `/${databaseName}`

  const admin = new Client({ connectionString: databaseUrl })
  const client = new Client({ connectionString: testUrl.href })
  await admin.connect()
  context.after(async () => {
    try {
      await client.end()
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`)
    } finally {
      await admin.end()
    }
  })

  await admin.query(`CREATE DATABASE ${databaseName}`)
  await migrateDatabase(testUrl.href, migrationsDirectory)
  await client.connect()

  const { rows: [user] } = await client.query<{ id: number }>(`
    INSERT INTO users (email, password_hash, role) VALUES ('demo@example.com', 'test-hash', 'customer') RETURNING id
  `)
  const { rows: [product] } = await client.query<{ id: number }>(`
    INSERT INTO products (name, price) VALUES ('Coffee', 42.50) RETURNING id
  `)
  await assert.rejects(client.query(`
    INSERT INTO products (name, price) VALUES ('Coffee', 50.00)
  `), { code: '23505' })

  await assert.rejects(client.query(`
    INSERT INTO orders (user_id, status, total) VALUES ($1, 'unknown', 85.00)
  `, [user.id]), { code: '22P02' })
  await assert.rejects(client.query(`
    INSERT INTO orders (user_id, total) VALUES (-1, 85.00)
  `), { code: '23503' })

  const { rows: [order] } = await client.query<{ id: number; status: string }>(`
    INSERT INTO orders (user_id, total) VALUES ($1, 85.00) RETURNING id, status
  `, [user.id])
  assert.equal(order.status, 'pending')

  await assert.rejects(client.query(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, 0, 42.50)
  `, [order.id, product.id]), { code: '23514' })
  await client.query(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, 2, 42.50)
  `, [order.id, product.id])
  await client.query('UPDATE products SET price = 52.00 WHERE id = $1', [product.id])

  await migrateDatabase(testUrl.href, migrationsDirectory)

  const { rows } = await client.query(`
    SELECT orders.total, order_items.quantity, order_items.unit_price
    FROM orders
    JOIN order_items ON order_items.order_id = orders.id
    WHERE orders.id = $1
  `, [order.id])
  assert.deepEqual(rows, [{ total: '85.00', quantity: 2, unit_price: '42.50' }])
})
