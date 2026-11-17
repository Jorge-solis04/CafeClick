import cors from 'cors'
import { asc } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import express, { type ErrorRequestHandler } from 'express'
import type { Pool } from 'pg'
import { products } from './database/schema.js'

const handleUnexpectedError: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({
    error: { code: 'internal_error', message: 'Ocurrió un error inesperado.' },
  })
}

export function createApp(pool: Pool, webOrigin?: string) {
  const database = drizzle(pool)
  const app = express()

  app.disable('x-powered-by')

  if (webOrigin) {
    app.use('/api', cors({
      origin: [new URL(webOrigin).origin],
      methods: ['GET', 'HEAD'],
      allowedHeaders: ['Authorization', 'Content-Type'],
    }))
  }

  app.get('/', (_request, response) => {
    response.json({ message: 'CaféClick API is running' })
  })

  app.get('/api/health', async (_request, response) => {
    try {
      await pool.query('SELECT 1')
      response.json({ status: 'ok' })
    } catch (error) {
      console.error('PostgreSQL health check failed', error)
      response.status(503).json({
        error: { code: 'database_unavailable', message: 'La API no puede consultar PostgreSQL.' },
      })
    }
  })

  app.get('/api/products', async (_request, response) => {
    const catalog = await database
      .select({ id: products.id, name: products.name, price: products.price })
      .from(products)
      .orderBy(asc(products.id))

    response.json({ products: catalog })
  })

  app.use(handleUnexpectedError)

  return app
}
