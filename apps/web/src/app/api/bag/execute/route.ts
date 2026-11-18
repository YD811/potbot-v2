import { NextRequest, NextResponse } from 'next/server'
import { VersionedTransaction } from '@solana/web3.js'
import { USDC_MINT, getLeg, isLegLive } from '@/lib/bag/config'
import { bagConnection, isGeoBlocked, jupExecute } from '@/lib/bag/server'
import { isValidWallet } from '@/lib/bag/points'
import { isKnownSlug } from '@/lib/bag/recipes'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/bag/execute  { signedTransaction, requestId, leg, ref?, bag? }
 *
 * Forwards a user-signed leg to Jupiter /execute, then — independently of
 * what the client claims — reads the landed transaction from mainnet and
 * records the buy for BAG Points only if the signer really spent USDC and
 * received the leg's allowlisted mint.
 */
export async function POST(req: NextRequest) {
  if (isGeoBlocked(req)) {
    return NextResponse.json({ error: 'BAG is not available in your region.' }, { status: 451 })
  }

  let body: { signedTransaction?: string; requestId?: string; leg?: string; ref?: string; bag?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leg = getLeg(body.leg ?? '')
  if (!leg || !isLegLive(leg)) return NextResponse.json({ error: 'Unknown leg' }, { status: 400 })
  if (!body.signedTransaction || !body.requestId) {
    return NextResponse.json({ error: 'Missing signedTransaction or requestId' }, { status: 400 })
  }

  let payer: string
  try {
    const tx = VersionedTransaction.deserialize(Buffer.from(body.signedTransaction, 'base64'))
    payer = tx.message.staticAccountKeys[0].toBase58()
  } catch {
    return NextResponse.json({ error: 'Invalid transaction' }, { status: 400 })
  }

  const result = await jupExecute(body.signedTransaction, body.requestId)
  if (result.status !== 'Success' || !result.signature) {
    return NextResponse.json(
      { status: 'Failed', step: 'send', code: result.code ?? null, signature: result.signature, error: result.error ?? 'Swap failed' },
      { status: 502 },
    )
  }

  let recorded = false
  try {
    recorded = await recordBuy(result.signature, payer, leg.key, leg.mint, body.ref, body.bag)
  } catch (err) {
    console.error('[bag/execute] points record failed', err)
  }

  return NextResponse.json({ status: 'Success', signature: result.signature, recorded })
}

async function recordBuy(
  signature: string,
  payer: string,
  legKey: string,
  legMint: string,
  ref: string | undefined,
  bag: string | undefined,
): Promise<boolean> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false

  const conn = bagConnection()
  let tx = null
  for (let i = 0; i < 6 && !tx; i++) {
    tx = await conn.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })
    if (!tx) await new Promise(r => setTimeout(r, 1500))
  }
  if (!tx || tx.meta?.err) return false

  const signer = tx.transaction.message.staticAccountKeys[0]?.toBase58()
  if (signer !== payer) return false

  const meta = tx.meta
  if (!meta) return false
  type Bal = NonNullable<typeof meta.preTokenBalances>
  const delta = (mint: string) => {
    const sum = (rows: Bal | null | undefined) =>
      (rows ?? [])
        .filter(r => r.owner === payer && r.mint === mint)
        .reduce((s, r) => s + BigInt(r.uiTokenAmount.amount), 0n)
    return sum(meta.postTokenBalances) - sum(meta.preTokenBalances)
  }

  const usdcDelta = delta(USDC_MINT)
  const legDelta = delta(legMint)
  // Buy: USDC out, asset in. Sell: asset out, USDC in. Anything else is not ours.
  const side: 'buy' | 'sell' | null = usdcDelta < 0n && legDelta > 0n ? 'buy' : usdcDelta > 0n && legDelta < 0n ? 'sell' : null
  if (!side) return false
  const usdcSpent = usdcDelta < 0n ? -usdcDelta : usdcDelta
  const legReceived = legDelta < 0n ? -legDelta : legDelta

  const db = createServerSupabase()

  // Attribute the buy to a community BAG only if that recipe exists.
  let recipe: { slug: string; creator: string } | null = null
  if (bag && isKnownSlug(bag)) {
    const { data } = await db.from('bag_recipes').select('slug, creator').eq('slug', bag).maybeSingle()
    recipe = data ?? null
  }

  const { error } = await db.from('bag_buys').upsert(
    {
      signature,
      wallet: payer,
      leg: legKey,
      output_mint: legMint,
      usdc_in: Number(usdcSpent) / 1e6,
      out_amount: legReceived.toString(),
      bag_slug: recipe?.slug ?? null,
      side,
      created_at: new Date((tx.blockTime ?? Date.now() / 1000) * 1000).toISOString(),
    },
    { onConflict: 'signature', ignoreDuplicates: true },
  )
  if (error) throw error

  if (side === 'sell') return true

  // Buying a BAG joins it. A wallet can be in several BAGs.
  if (recipe) {
    await db.from('bag_joins').upsert({ wallet: payer, slug: recipe.slug }, { onConflict: 'wallet,slug', ignoreDuplicates: true })
  }

  // First referrer wins; never overwrite. An explicit ?ref= link beats the
  // creator of the BAG the buy was made on.
  const referrer = isValidWallet(ref) && ref !== payer ? ref : recipe && isValidWallet(recipe.creator) && recipe.creator !== payer ? recipe.creator : null
  if (referrer) {
    await db.from('bag_referrals').upsert({ wallet: payer, referrer }, { onConflict: 'wallet', ignoreDuplicates: true })
  }
  return true
}
