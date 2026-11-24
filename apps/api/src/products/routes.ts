import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import express, { type Router } from 'express'
import { createProductsController } from './controller.js'

export function createProductsRouter(database: NodePgDatabase): Router {
  const router = express.Router()
  const controller = createProductsController(database)

  router.get('/', controller.list)

  return router
}
