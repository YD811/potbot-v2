import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

/**
 * POST /api/admin/verify-pot
 * Admin-only endpoint to set trust level on a vault.
 *
 * Body: {
 *   pubkey: string
 *   trustLevel: 'community' | 'audited' | 'institutional' | 'unverified'
 *   verifiedBy?: string
 *   auditUrl?: string
 *   trustNote?: string
 *   adminSecret: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { pubkey, trustLevel, verifiedBy, auditUrl, trustNote, adminSecret } = await req.json()

    // Auth check
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!pubkey || !trustLevel) {
      return NextResponse.json({ error: 'pubkey and trustLevel required' }, { status: 400 })
    }

    const validLevels = ['unverified', 'community', 'audited', 'institutional']
    if (!validLevels.includes(trustLevel)) {
      return NextResponse.json({ error: `trustLevel must be one of: ${validLevels.join(', ')}` }, { status: 400 })
    }

    const db = createServerSupabase()
    const { error } = await db.from('pots').update({
      trust_level: trustLevel,
      verified_by: verifiedBy ?? null,
      verified_at: trustLevel !== 'unverified' ? new Date().toISOString() : null,
      audit_url: auditUrl ?? null,
      trust_note: trustNote ?? null,
      updated_at: new Date().toISOString(),
    }).eq('pubkey', pubkey)

    if (error) throw error

    return NextResponse.json({ ok: true, pubkey, trustLevel })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
