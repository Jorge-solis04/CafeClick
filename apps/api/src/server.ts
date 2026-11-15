import { createServer } from 'node:http'
import { app } from './app.js'

const port = Number(process.env.PORT ?? 3001)

createServer(app).listen(port, '0.0.0.0', () => {
  console.log(`CaféClick API listening on port ${port}`)
})
