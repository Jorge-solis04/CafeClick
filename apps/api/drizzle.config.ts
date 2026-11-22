import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: '../../database/migrations',
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
})
