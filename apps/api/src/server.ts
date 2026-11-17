import { createServer } from 'node:http'
import { createApp } from './app.js'
import { createDatabasePool } from './database/pool.js'

const port = Number(process.env.PORT ?? 3001)
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to start the API')
}

const app = createApp(createDatabasePool(connectionString), process.env.WEB_ORIGIN)

createServer(app).listen(port, '0.0.0.0', () => {
  console.log(`CaféClick API listening on port ${port}`)
})
