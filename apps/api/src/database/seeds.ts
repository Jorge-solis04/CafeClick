import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Client } from 'pg'
import { hashPassword } from '../auth/password.js'

export type DemoAccount = {
  email: string
  password: string
  role: 'customer' | 'kitchen'
}

async function withTransaction(connectionString: string, work: (client: Client) => Promise<void>) {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    await client.query('BEGIN')
    await work(client)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}

export async function seedCatalog(connectionString: string, seedsFolder: string) {
  const seedFiles = (await readdir(seedsFolder)).filter((fileName) => fileName.endsWith('.sql')).sort()

  await withTransaction(connectionString, async (client) => {
    for (const fileName of seedFiles) {
      await client.query(await readFile(join(seedsFolder, fileName), 'utf8'))
    }
  })

  return seedFiles
}

export async function seedDemoAccounts(connectionString: string, accounts: DemoAccount[]) {
  const accountRows = await Promise.all(accounts.map(async (account) => ({
    email: account.email.trim().toLowerCase(),
    passwordHash: await hashPassword(account.password),
    role: account.role,
  })))

  await withTransaction(connectionString, async (client) => {
    for (const account of accountRows) {
      await client.query(`
        INSERT INTO users (email, password_hash, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
      `, [account.email, account.passwordHash, account.role])
    }
  })
}
