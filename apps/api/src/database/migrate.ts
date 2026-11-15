import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrateDatabase } from './migrations.js'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations')
}

const databaseDirectory = process.env.DATABASE_DIR ?? fileURLToPath(new URL('../../../../database/', import.meta.url))

await migrateDatabase(connectionString, join(databaseDirectory, 'migrations'))
console.log('Database migrations complete')
