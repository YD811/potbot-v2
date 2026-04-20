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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
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

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[waitlist] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
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
