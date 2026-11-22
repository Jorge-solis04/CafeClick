import { asc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { products } from '../database/schema.js'

export function findAllProducts(database: NodePgDatabase) {
  return database
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      category: products.category,
    })
    .from(products)
    .orderBy(asc(products.id))
}
