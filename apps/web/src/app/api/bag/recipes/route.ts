import { NextRequest, NextResponse } from 'next/server'
import { isGeoBlocked } from '@/lib/bag/server'
import { isValidWallet } from '@/lib/bag/points'
import {
  MAX_RECIPES_PER_WALLET,
  cleanName,
  createMessage,
  isFreshTs,
  isValidSlug,
  validateWeights,
} from '@/lib/bag/recipes'
import { bagDbReady, listRecipes } from '@/lib/bag/recipes-server'
import { verifyWalletSignature } from '@/lib/bag/sig'
import { createServerSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/bag/recipes — community BAGs ranked by volume, then joins. */
export async function GET() {
  const rows = await listRecipes(50)
  return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } })
}

/**
 * POST /api/bag/recipes  { name, slug, weights, wallet, ts, signature }
 *
 * Saves a recipe. The wallet proves ownership with a signMessage signature
 * over `createMessage(...)`; no transaction is involved.
 */
export async function POST(req: NextRequest) {
  if (isGeoBlocked(req)) {
    return NextResponse.json({ error: 'BAG is not available in your region.' }, { status: 451 })
  }
  if (!bagDbReady()) return NextResponse.json({ error: 'Saving is not available right now.' }, { status: 503 })

  let body: { name?: string; slug?: string; weights?: unknown; wallet?: string; ts?: number; signature?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = cleanName(String(body.name ?? ''))
  const slug = String(body.slug ?? '')
  const { wallet, weights, ts, signature } = body

  if (name.length < 2) return NextResponse.json({ error: 'Give your BAG a name (2–32 characters).' }, { status: 400 })
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'Link name must be 3–24 characters: a–z, 0–9 and dashes, and not a reserved word.' }, { status: 400 })
  }
  if (!validateWeights(weights)) {
    return NextResponse.json({ error: 'Weights must be whole percents that add up to 100, with at least two assets.' }, { status: 400 })
  }
  if (!isValidWallet(wallet)) return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  if (!isFreshTs(ts)) return NextResponse.json({ error: 'Signature expired. Try again.' }, { status: 400 })
  if (!signature || !verifyWalletSignature(wallet, createMessage({ slug, name, weights, wallet, ts }), signature)) {
    return NextResponse.json({ error: 'Signature check failed.' }, { status: 401 })
  }

  const db = createServerSupabase()
  const { count } = await db.from('bag_recipes').select('slug', { count: 'exact', head: true }).eq('creator', wallet)
  if ((count ?? 0) >= MAX_RECIPES_PER_WALLET) {
    return NextResponse.json({ error: `Beta limit: ${MAX_RECIPES_PER_WALLET} BAGs per wallet.` }, { status: 409 })
  }

  const { error } = await db.from('bag_recipes').insert({ slug, name, creator: wallet, weights })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That link name is taken. Pick another.' }, { status: 409 })
    console.error('[bag/recipes] insert failed', error)
    return NextResponse.json({ error: 'Could not save your BAG.' }, { status: 500 })
  }

  return NextResponse.json({ slug, name, weights, creator: wallet })
}
