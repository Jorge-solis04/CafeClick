import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import type { SessionUser } from '../auth/sessions.js'
import type { OrderView } from './orders.js'

export const defaultStreamTicketLifetimeMs = 60 * 1000
export const defaultStreamHeartbeatIntervalMs = 25 * 1000

const streamTicketBytes = 32
const streamTicketPattern = /^[A-Za-z0-9_-]{43}$/

type StreamTicketRecord = {
  user: SessionUser
  expiresAt: Date
}

type Subscriber = {
  user: SessionUser
  response: Response
  cleanup: () => void
}

export type StreamTicket = {
  ticket: string
  expiresAt: Date
}

export type OrderEventHubOptions = {
  ticketLifetimeMs?: number
  heartbeatIntervalMs?: number
  now?: () => Date
}

export type OrderEventHub = {
  issueTicket: (user: SessionUser) => StreamTicket
  consumeTicket: (ticket: string) => SessionUser | null
  subscribe: (request: Request, response: Response, user: SessionUser) => void
  publishOrderCreated: (order: OrderView) => void
  publishOrderStatusUpdated: (order: OrderView, ownerUserId: number) => void
  subscriberCount: () => number
  close: () => void
}

function hashTicket(ticket: string) {
  return createHash('sha256').update(ticket).digest('hex')
}

function formatSseEvent(eventName: string, order: OrderView) {
  return `id: ${order.id}-${order.version}\nevent: ${eventName}\ndata: ${JSON.stringify(order)}\n\n`
}

export function createOrderEventHub(options: OrderEventHubOptions = {}): OrderEventHub {
  const ticketLifetimeMs = options.ticketLifetimeMs ?? defaultStreamTicketLifetimeMs
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? defaultStreamHeartbeatIntervalMs
  const now = options.now ?? (() => new Date())

  const tickets = new Map<string, StreamTicketRecord>()
  const subscribers = new Set<Subscriber>()
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  function purgeExpiredTickets(currentTime: Date) {
    for (const [key, record] of tickets) {
      if (record.expiresAt <= currentTime) {
        tickets.delete(key)
      }
    }
  }

  function stopHeartbeatIfIdle() {
    if (subscribers.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function removeSubscriber(subscriber: Subscriber) {
    if (!subscribers.delete(subscriber)) {
      return
    }

    subscriber.cleanup()
    stopHeartbeatIfIdle()
  }

  function writeChunk(subscriber: Subscriber, chunk: string) {
    if (subscriber.response.writableEnded || subscriber.response.destroyed) {
      removeSubscriber(subscriber)
      return
    }

    try {
      subscriber.response.write(chunk)
    } catch {
      removeSubscriber(subscriber)
    }
  }

  function ensureHeartbeat() {
    if (heartbeatTimer || heartbeatIntervalMs <= 0) {
      return
    }

    heartbeatTimer = setInterval(() => {
      for (const subscriber of [...subscribers]) {
        writeChunk(subscriber, ': keep-alive\n\n')
      }
    }, heartbeatIntervalMs)
    heartbeatTimer.unref()
  }

  function issueTicket(user: SessionUser): StreamTicket {
    const currentTime = now()
    purgeExpiredTickets(currentTime)

    const ticket = randomBytes(streamTicketBytes).toString('base64url')
    const expiresAt = new Date(currentTime.getTime() + ticketLifetimeMs)
    tickets.set(hashTicket(ticket), { user, expiresAt })

    return { ticket, expiresAt }
  }

  function consumeTicket(ticket: string): SessionUser | null {
    if (!streamTicketPattern.test(ticket)) {
      return null
    }

    const key = hashTicket(ticket)
    const record = tickets.get(key)

    if (!record) {
      return null
    }

    tickets.delete(key)

    if (record.expiresAt <= now()) {
      return null
    }

    return record.user
  }

  function subscribe(request: Request, response: Response, user: SessionUser) {
    response.status(200)
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    response.setHeader('Cache-Control', 'no-cache, no-transform')
    response.setHeader('Connection', 'keep-alive')
    response.setHeader('X-Accel-Buffering', 'no')
    response.flushHeaders()

    const subscriber: Subscriber = {
      user,
      response,
      cleanup: () => {
        request.off('close', onDisconnect)
        response.off('close', onDisconnect)
        response.off('error', onDisconnect)
      },
    }

    function onDisconnect() {
      removeSubscriber(subscriber)
    }

    request.once('close', onDisconnect)
    response.once('close', onDisconnect)
    response.once('error', onDisconnect)

    subscribers.add(subscriber)
    ensureHeartbeat()
    writeChunk(subscriber, ': connected\n\n')
  }

  function publishOrderCreated(order: OrderView) {
    const payload = formatSseEvent('order.created', order)

    for (const subscriber of [...subscribers]) {
      if (subscriber.user.role === 'kitchen') {
        writeChunk(subscriber, payload)
      }
    }
  }

  function publishOrderStatusUpdated(order: OrderView, ownerUserId: number) {
    const payload = formatSseEvent('order.status.updated', order)

    for (const subscriber of [...subscribers]) {
      if (subscriber.user.role === 'kitchen' || subscriber.user.id === ownerUserId) {
        writeChunk(subscriber, payload)
      }
    }
  }

  function subscriberCount() {
    return subscribers.size
  }

  function close() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    for (const subscriber of [...subscribers]) {
      removeSubscriber(subscriber)
      if (!subscriber.response.writableEnded && !subscriber.response.destroyed) {
        subscriber.response.end()
      }
    }

    tickets.clear()
  }

  return {
    issueTicket,
    consumeTicket,
    subscribe,
    publishOrderCreated,
    publishOrderStatusUpdated,
    subscriberCount,
    close,
  }
}
