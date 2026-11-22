import { drizzle } from 'drizzle-orm/node-postgres'
import express from 'express'
import type { Pool } from 'pg'
import { createAuthRouter } from './auth/routes.js'
import { createApiCors } from './http/cors.js'
import { handleUnexpectedError } from './http/errors.js'
import { requestLogger, type WriteRequestLog } from './http/requestLogger.js'
import { createOrderEventHub, type OrderEventHub } from './orders/events.js'
import { createOrdersRouter } from './orders/routes.js'
import { createProductsRouter } from './products/routes.js'
import { createSystemRouter } from './system/routes.js'

export function createApp(
  pool: Pool,
  webOrigin?: string,
  writeRequestLog?: WriteRequestLog,
  orderEvents: OrderEventHub = createOrderEventHub(),
) {
  const database = drizzle(pool)
  const app = express()

  app.disable('x-powered-by')

  if (writeRequestLog) {
    app.use(requestLogger(writeRequestLog))
  }

  if (webOrigin) {
    app.use('/api', createApiCors(webOrigin))
  }

  app.use('/', createSystemRouter(pool))
  app.use('/api/products', createProductsRouter(database))
  app.use('/api/auth', createAuthRouter(database))
  app.use('/api/orders', createOrdersRouter(database, orderEvents))

  app.use(handleUnexpectedError)

  return app
}
