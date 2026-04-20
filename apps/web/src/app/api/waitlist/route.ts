import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'

// In-memory fallback when Supabase isn't configured (dev/demo mode)
const devWaitlist = new Set<string>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body.email ?? '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (isSupabaseConfigured) {
      const db = createServerSupabase()
      const { error } = await db
        .from('waitlist')
        .insert({ email })
        .select()
        .single()

      if (error) {
        // Unique violation = already registered
        if (error.code === '23505') {
          return NextResponse.json({ success: true, alreadyRegistered: true })
        }
        console.error('Waitlist insert error:', error)
        return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
      }
    } else {
      // Demo fallback
      if (devWaitlist.has(email)) {
        return NextResponse.json({ success: true, alreadyRegistered: true })
      }
      devWaitlist.add(email)
      console.log('[Waitlist demo] New signup:', email, '| Total:', devWaitlist.size)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Waitlist error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  // Simple count endpoint for admin use
  const secret = process.env.ADMIN_SECRET
  if (!secret) return NextResponse.json({ count: '?' })

  if (isSupabaseConfigured) {
    const db = createServerSupabase()
    const { count } = await db.from('waitlist').select('*', { count: 'exact', head: true })
    return NextResponse.json({ count })
  }

  return NextResponse.json({ count: devWaitlist.size, mode: 'demo' })
}
