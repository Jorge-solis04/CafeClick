import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createServer, type RequestListener } from 'node:http'
import type { TestContext } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { migrateDatabase } from '../src/database/migrations.js'

const migrationsDirectory = fileURLToPath(new URL('../../../database/migrations/', import.meta.url))
const databaseInUseErrorCode = '55006'

export async function startTestServer(context: TestContext, listener: RequestListener) {
  const server = createServer(listener).listen(0, '127.0.0.1')
  context.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  }))
  await once(server, 'listening')

  const address = server.address()
  assert.ok(address && typeof address !== 'string')

  return `http://127.0.0.1:${address.port}`
}

export function fetchWithTimeout(url: string, options?: RequestInit) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
}

export function createCleanupStack(context: TestContext) {
  const cleanups: (() => Promise<void>)[] = []

  context.after(async () => {
    for (const cleanup of cleanups.reverse()) {
      await cleanup()
    }
  })

  return (cleanup: () => Promise<void>) => {
    cleanups.push(cleanup)
  }
}

async function dropDatabaseWhenIdle(admin: Client, databaseName: string) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`)
      return
    } catch (error) {
      if ((error as { code?: string }).code !== databaseInUseErrorCode || attempt === 20) {
        throw error
      }

      await setTimeout(100)
    }
  }
}

export async function createMigratedDatabase(deferCleanup: (cleanup: () => Promise<void>) => void, adminUrl: string) {
  const databaseName = `cafeclick_test_${randomUUID().replaceAll('-', '')}`
  const testUrl = new URL(adminUrl)
  testUrl.pathname = `/${databaseName}`

  const admin = new Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${databaseName}`)
  deferCleanup(async () => {
    try {
      await dropDatabaseWhenIdle(admin, databaseName)
    } finally {
      await admin.end()
    }
  })

  await migrateDatabase(testUrl.href, migrationsDirectory)
  return testUrl.href
}
