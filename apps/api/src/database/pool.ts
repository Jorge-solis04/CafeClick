import { Pool } from 'pg'

export function createDatabasePool(connectionString: string) {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
  })

  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error', error)
  })

  return pool
}
