import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { RequestHandler } from 'express'
import { findAllProducts } from './repository.js'

export function createProductsController(database: NodePgDatabase) {
  const list: RequestHandler = async (_request, response) => {
    const catalog = await findAllProducts(database)
    response.json({ products: catalog })
  }

  return { list }
}
