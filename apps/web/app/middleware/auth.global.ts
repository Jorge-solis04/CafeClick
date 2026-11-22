import { useSessionStore } from '~/stores/session'
import type { UserRole } from '~/types/session'

declare module '#app' {
  interface PageMeta {
    allowedRoles?: UserRole[]
    allowGuests?: boolean
    guestOnly?: boolean
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSessionStore()
  await session.restore()

  const user = session.user

  if (to.meta.guestOnly) {
    return user ? navigateTo(homePathFor(user.role)) : undefined
  }

  const allowedRoles = to.meta.allowedRoles

  if (!allowedRoles) {
    return
  }

  if (!user) {
    return to.meta.allowGuests ? undefined : navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (!allowedRoles.includes(user.role)) {
    return navigateTo(homePathFor(user.role))
  }
})
