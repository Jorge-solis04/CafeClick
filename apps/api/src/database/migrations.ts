import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'

const migrationLock = 0x43414645

export async function migrateDatabase(connectionString: string, migrationsFolder: string) {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    await client.query('SELECT pg_advisory_lock($1::bigint)', [migrationLock])
    await migrate(drizzle(client), { migrationsFolder })
  } finally {
    await client.end()
  }
}
