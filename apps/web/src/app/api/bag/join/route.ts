import { NextRequest, NextResponse } from 'next/server'
import { isGeoBlocked } from '@/lib/bag/server'
import { isValidWallet } from '@/lib/bag/points'
import { isFreshTs, isValidSlug, joinMessage } from '@/lib/bag/recipes'
import { bagDbReady } from '@/lib/bag/recipes-server'
import { verifyWalletSignature } from '@/lib/bag/sig'
import { createServerSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/bag/join  { slug, wallet, ts, signature }
 *
 * A wallet joins a community BAG (one BAG per wallet; joining another one
 * moves it). The BAG's creator becomes the wallet's referrer if it has
 * none yet, so buys made after launch count for the creator.
 */
export async function POST(req: NextRequest) {
  if (isGeoBlocked(req)) {
    return NextResponse.json({ error: 'BAG is not available in your region.' }, { status: 451 })
  }
  if (!bagDbReady()) return NextResponse.json({ error: 'Joining is not available right now.' }, { status: 503 })

  let body: { slug?: string; wallet?: string; ts?: number; signature?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const slug = String(body.slug ?? '')
  const { wallet, ts, signature } = body

  if (!isValidSlug(slug)) return NextResponse.json({ error: 'Unknown BAG' }, { status: 404 })
  if (!isValidWallet(wallet)) return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  if (!isFreshTs(ts)) return NextResponse.json({ error: 'Signature expired. Try again.' }, { status: 400 })
  if (!signature || !verifyWalletSignature(wallet, joinMessage({ slug, wallet, ts }), signature)) {
    return NextResponse.json({ error: 'Signature check failed.' }, { status: 401 })
  }

  const db = createServerSupabase()
  const { data: recipe } = await db.from('bag_recipes').select('slug, creator').eq('slug', slug).maybeSingle()
  if (!recipe) return NextResponse.json({ error: 'Unknown BAG' }, { status: 404 })

  const { error } = await db.from('bag_joins').upsert({ wallet, slug, created_at: new Date().toISOString() }, { onConflict: 'wallet' })
  if (error) {
    console.error('[bag/join] upsert failed', error)
    return NextResponse.json({ error: 'Could not join this BAG.' }, { status: 500 })
  }

  if (recipe.creator !== wallet) {
    // First referrer wins; never overwrite.
    await db.from('bag_referrals').upsert({ wallet, referrer: recipe.creator }, { onConflict: 'wallet', ignoreDuplicates: true })
  }

  const { count } = await db.from('bag_joins').select('wallet', { count: 'exact', head: true }).eq('slug', slug)
  return NextResponse.json({ slug, joins: count ?? 0 })
}
