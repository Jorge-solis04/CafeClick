import type { ErrorRequestHandler, Response } from 'express'

export function sendError(response: Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } })
}

function isRequestBodyError(error: unknown): error is { status: number } {
  const { status, type } = (error ?? {}) as { status?: unknown, type?: unknown }
  return typeof status === 'number' && status >= 400 && status < 500 && typeof type === 'string'
}

export const handleUnexpectedError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (isRequestBodyError(error)) {
    sendError(response, error.status, 'invalid_request', 'El cuerpo de la solicitud no es válido.')
    return
  }

  console.error(error)
  sendError(response, 500, 'internal_error', 'Ocurrió un error inesperado.')
}
