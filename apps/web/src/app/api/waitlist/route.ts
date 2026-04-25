import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'

// In-memory fallback when Supabase isn't configured (dev/demo mode)
interface DevEntry {
  email: string
  twitter?: string | null
  telegram?: string | null
  solana_wallet?: string | null
  source: string
  created_at: string
}
const devWaitlist = new Map<string, DevEntry>()
const waitlistWindows = new Map<string, { count: number; windowStart: number }>()
const WAITLIST_WINDOW_MS = 60_000
const WAITLIST_MAX_PER_MINUTE = 8
const WAITLIST_SWEEP_FLAG = '__potbotWaitlistSweepStarted'

// Source values we expect from the front-end. Anything else is coerced to 'other'.
const ALLOWED_SOURCES = new Set(['landing', 'signup', 'telegram', 'twitter', 'referral'])

function cleanHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/^@+/, '')
  if (!trimmed) return null
  if (trimmed.length > 64) return null
  // Basic sanity: alphanumeric + underscore for x/tg handles
  if (!/^[a-zA-Z0-9_.\-]+$/.test(trimmed)) return null
  return trimmed
}

function cleanWallet(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    // Throws if not a valid base58 32-byte pubkey
    // eslint-disable-next-line no-new
    new PublicKey(trimmed)
    return trimmed
  } catch {
    return null
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function isRateLimited(req: NextRequest, maxPerMinute = 8): boolean {
  const ip = getClientIp(req)
  const key = `wl:${ip}`
  const now = Date.now()
  const windowMs = WAITLIST_WINDOW_MS
  const entry = waitlistWindows.get(key)

  if (!entry || now - entry.windowStart > windowMs) {
    waitlistWindows.set(key, { count: 1, windowStart: now })
    return false
  }

  entry.count += 1
  return entry.count > maxPerMinute
}

function isTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  const referer = req.headers.get('referer')

  const allowed = new Set<string>([
    'http://localhost:3000',
    'https://potbot.fun',
    'https://www.potbot.fun',
  ])

  if (host) {
    allowed.add(`https://${host}`)
    allowed.add(`http://${host}`)
  }

  if (origin && allowed.has(origin)) return true
  if (!origin && referer) {
    try {
      return allowed.has(new URL(referer).origin)
    } catch {
      return false
    }
  }

  // Allow non-browser requests without origin/referer (server-to-server).
  return !origin && !referer
}

function withRateHeaders(res: NextResponse, req: NextRequest): NextResponse {
  const ip = getClientIp(req)
  const key = `wl:${ip}`
  const entry = waitlistWindows.get(key)
  const remaining = entry ? Math.max(0, WAITLIST_MAX_PER_MINUTE - entry.count) : WAITLIST_MAX_PER_MINUTE
  const resetAt = entry ? Math.ceil((entry.windowStart + WAITLIST_WINDOW_MS) / 1000) : Math.ceil((Date.now() + WAITLIST_WINDOW_MS) / 1000)
  res.headers.set('X-RateLimit-Limit', String(WAITLIST_MAX_PER_MINUTE))
  res.headers.set('X-RateLimit-Remaining', String(remaining))
  res.headers.set('X-RateLimit-Reset', String(resetAt))
  return res
}

export async function POST(req: NextRequest) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (isRateLimited(req)) {
      return withRateHeaders(
        NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 }),
        req,
      )
    }

    const body = await req.json().catch(() => ({}))

    // Honeypot field for basic bot filtering. Real UI does not send it.
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      return withRateHeaders(NextResponse.json({ success: true }), req)
    }

    const email = (body.email ?? '').toString().trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // All extra fields are OPTIONAL. Invalid input is silently nulled rather than
    // failing the whole signup — email is the only hard requirement.
    const twitter = cleanHandle(body.twitter)
    const telegram = cleanHandle(body.telegram)
    const solana_wallet = cleanWallet(body.solana_wallet ?? body.wallet)

    const rawSource = (body.source ?? 'landing').toString().trim().toLowerCase()
    const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : 'other'

    // Optional strict mode: when the request explicitly asks for the full form
    // (source === 'signup'), validate that at least one extra contact is present.
    if (source === 'signup' && !twitter && !telegram && !solana_wallet) {
      return NextResponse.json(
        { error: 'Provide at least one of: Twitter, Telegram, or Solana wallet.' },
        { status: 400 },
      )
    }

    if (isSupabaseConfigured) {
      const db = createServerSupabase()

      // Upsert on email so users can fill in extra fields later without errors.
      const { error } = await db
        .from('waitlist')
        .upsert(
          {
            email,
            twitter,
            telegram,
            solana_wallet,
            source,
          },
          { onConflict: 'email' },
        )
        .select()
        .single()

      if (error) {
        // Unique violation on upsert shouldn't happen, but just in case:
        if (error.code === '23505') {
          return NextResponse.json({ success: true, alreadyRegistered: true })
        }
        console.error('[waitlist] insert error:', error)
        return NextResponse.json({ error: 'Failed to save signup' }, { status: 500 })
      }
    } else {
      // Demo fallback
      const alreadyRegistered = devWaitlist.has(email)
      devWaitlist.set(email, {
        email,
        twitter,
        telegram,
        solana_wallet,
        source,
        created_at: new Date().toISOString(),
      })
      console.log(
        '[waitlist demo] signup:',
        { email, twitter, telegram, solana_wallet, source },
        '| total:',
        devWaitlist.size,
      )
      if (alreadyRegistered) {
        return NextResponse.json({ success: true, alreadyRegistered: true })
      }
    }

    return withRateHeaders(NextResponse.json({ success: true }), req)
  } catch (e) {
    console.error('[waitlist] error:', e)
    return withRateHeaders(NextResponse.json({ error: 'Server error' }, { status: 500 }), req)
  }
}

export async function GET(req: NextRequest) {
  // Admin count endpoint — requires ADMIN_SECRET bearer token
  const secret = process.env.ADMIN_SECRET
  const auth = req.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (!secret) return NextResponse.json({ count: '?', note: 'ADMIN_SECRET not set' })
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isSupabaseConfigured) {
    const db = createServerSupabase()
    const { count } = await db.from('waitlist').select('*', { count: 'exact', head: true })
    return NextResponse.json({ count })
  }
  return NextResponse.json({ count: devWaitlist.size, mode: 'demo' })
}

const globalForWaitlist = globalThis as typeof globalThis & Record<string, unknown>
if (!globalForWaitlist[WAITLIST_SWEEP_FLAG]) {
  globalForWaitlist[WAITLIST_SWEEP_FLAG] = true
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of waitlistWindows) {
      if (now - value.windowStart > WAITLIST_WINDOW_MS * 2) {
        waitlistWindows.delete(key)
      }
    }
  }, 5 * 60_000)
}
