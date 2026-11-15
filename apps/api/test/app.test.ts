import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { app } from '../src/app.js'

test('GET / returns the API startup message', async (context) => {
  const server = createServer(app).listen(0, '127.0.0.1')
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

  const response = await fetch(`http://127.0.0.1:${address.port}/`, { signal: AbortSignal.timeout(5000) })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { message: 'CaféClick API is running' })
})
