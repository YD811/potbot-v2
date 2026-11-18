import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminSessionToken, isAdminSecret } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Best-effort brake on guessing: 5 attempts a minute per IP, per server instance.
const attempts = new Map<string, { n: number; reset: number }>()
function tooMany(ip: string): boolean {
  const now = Date.now()
  const row = attempts.get(ip)
  if (!row || row.reset < now) {
    attempts.set(ip, { n: 1, reset: now + 60_000 })
    return false
  }
  row.n += 1
  return row.n > 5
}

/** POST /api/admin/login { secret } → sets the httpOnly admin session cookie. */
export async function POST(req: NextRequest) {
  const token = adminSessionToken()
  if (!token) return new NextResponse(null, { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (tooMany(ip)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })

  const body = (await req.json().catch(() => ({}))) as { secret?: unknown }
  if (typeof body.secret !== 'string' || !isAdminSecret(body.secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  })
  return res
}

/** DELETE /api/admin/login → sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
