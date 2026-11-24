export type ApiError = {
  status: number | null
  code: string | null
  message: string | null
}

export function readApiError(error: unknown): ApiError {
  const { statusCode, data } = (error ?? {}) as { statusCode?: unknown, data?: unknown }
  const body = (data as { error?: { code?: unknown, message?: unknown } } | null)?.error

  return {
    status: typeof statusCode === 'number' ? statusCode : null,
    code: typeof body?.code === 'string' ? body.code : null,
    message: typeof body?.message === 'string' ? body.message : null,
  }
}

export function isExpiredSessionError(error: ApiError) {
  return error.status === 401 && (error.code === 'session_expired' || error.code === 'unauthorized')
}

export function checkoutErrorMessage(error: ApiError) {
  if (error.status === 400 && error.message) {
    return error.message
  }

  if (error.status === 403) {
    return 'Solo las cuentas de cliente pueden confirmar pedidos.'
  }

  return 'No se pudo confirmar tu pedido. Revisa tu conexión e inténtalo de nuevo; tu carrito sigue guardado.'
}

export function advanceStatusErrorMessage(error: ApiError) {
  if (error.status === 409) {
    return 'Este pedido ya cambió de estado en otra pantalla. La lista se actualizó.'
  }

  if (error.status === 404) {
    return 'Este pedido ya no existe. La lista se actualizó.'
  }

  if (error.status === 403) {
    return 'Solo el personal de cocina puede cambiar el estado de los pedidos.'
  }

  return 'No se pudo actualizar el pedido. Revisa tu conexión e inténtalo de nuevo.'
}

export function shouldRefreshAfterAdvanceError(error: ApiError) {
  return error.status === 409 || error.status === 404
}
