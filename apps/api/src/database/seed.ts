import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedCatalog } from './seeds.js'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the catalog')
}

const databaseDirectory = process.env.DATABASE_DIR ?? fileURLToPath(new URL('../../../../database/', import.meta.url))

const seedFiles = await seedCatalog(connectionString, join(databaseDirectory, 'seeds'))
console.log(`Catalog seed complete (${seedFiles.join(', ')})`)
