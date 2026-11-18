import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Server-side gate for /admin. The only secret is ADMIN_SECRET (server env,
 * never NEXT_PUBLIC). The browser gets an httpOnly cookie holding an HMAC
 * derived from it, so the secret itself never reaches the client.
 * With ADMIN_SECRET unset everything fails closed.
 */
export const ADMIN_COOKIE = 'potbot_admin'
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_SECRET
}

/** Cookie value for the current ADMIN_SECRET, or null when it is unset. */
export function adminSessionToken(): string | null {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return null
  return createHmac('sha256', secret).update('potbot-admin-session-v1').digest('hex')
}

export function isAdminSecret(candidate: string | null | undefined): boolean {
  const secret = process.env.ADMIN_SECRET
  return !!secret && !!candidate && safeEqual(candidate, secret)
}

/** True for a valid session cookie or a valid `Authorization: Bearer <ADMIN_SECRET>`. */
export function isAdminRequest(cookieValue: string | undefined, authorization: string | null): boolean {
  const token = adminSessionToken()
  if (!token) return false
  if (cookieValue && safeEqual(cookieValue, token)) return true
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null
  return isAdminSecret(bearer)
}
