import { performance } from 'node:perf_hooks'
import type { RequestHandler } from 'express'
import type { SessionUser } from '../auth/sessions.js'

export type RequestLogEntry = {
  method: string
  path: string
  status: number
  durationMs: number
  user?: SessionUser
  aborted: boolean
}

export type WriteRequestLog = (line: string) => void

export function formatRequestLog(entry: RequestLogEntry) {
  const parts = [entry.method, entry.path, entry.aborted ? 'aborted' : String(entry.status), `${entry.durationMs.toFixed(1)}ms`]

  if (entry.user) {
    parts.push(`user=${entry.user.id}(${entry.user.role})`)
  }

  return parts.join(' ')
}

export function requestLogger(write: WriteRequestLog): RequestHandler {
  return (request, response, next) => {
    const startedAt = performance.now()
    const path = request.originalUrl.split('?')[0] ?? request.originalUrl
    let logged = false

    function log(aborted: boolean) {
      if (logged) {
        return
      }

      logged = true
      write(formatRequestLog({
        method: request.method,
        path,
        status: response.statusCode,
        durationMs: performance.now() - startedAt,
        user: response.locals.sessionUser,
        aborted,
      }))
    }

    response.once('finish', () => log(false))
    response.once('close', () => log(!response.writableFinished))
    next()
  }
}
