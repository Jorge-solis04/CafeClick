import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, type RequestListener } from 'node:http'
import type { TestContext } from 'node:test'

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

export function fetchWithTimeout(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(10000) })
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
