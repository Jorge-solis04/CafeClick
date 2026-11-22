import express, { type Router } from 'express'
import type { Pool } from 'pg'
import { sendError } from '../http/errors.js'

export function createSystemRouter(pool: Pool): Router {
  const router = express.Router()

  router.get('/', (_request, response) => {
    response.json({ message: 'CaféClick API is running' })
  })

  router.get('/api/health', async (_request, response) => {
    try {
      await pool.query('SELECT 1')
      response.json({ status: 'ok' })
    } catch (error) {
      console.error('PostgreSQL health check failed', error)
      sendError(response, 503, 'database_unavailable', 'La API no puede consultar PostgreSQL.')
    }
  })

  return router
}
