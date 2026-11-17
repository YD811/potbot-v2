import { NextRequest, NextResponse } from 'next/server'
import {
  BAG_MAX_BUY_USDC,
  BAG_MAX_PRICE_IMPACT_PCT,
  BAG_MIN_BUY_USDC,
  BAG_SLIPPAGE_BPS,
  USDC_DECIMALS,
  USDC_MINT,
  getLeg,
  isLegLive,
} from '@/lib/bag/config'
import { isGeoBlocked, jupOrder } from '@/lib/bag/server'
import { isValidWallet } from '@/lib/bag/points'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/bag/order?leg=btc|ant|gold&amount=<raw USDC>&taker=<wallet>[&total=<raw USDC>]
 *
 * Builds one leg of a BAG buy: USDC → leg mint via Jupiter Swap V2.
 * Output mint comes from the server allowlist only. `total` is the whole
 * BAG buy (all legs) and is what the per-buy limits apply to.
 */
export async function GET(req: NextRequest) {
  if (isGeoBlocked(req)) {
    return NextResponse.json({ error: 'BAG is not available in your region.' }, { status: 451 })
  }

  const sp = req.nextUrl.searchParams
  const leg = getLeg(sp.get('leg') ?? '')
  const taker = sp.get('taker')
  const amountRaw = sp.get('amount') ?? ''
  const totalRaw = sp.get('total') ?? amountRaw

  if (!leg) return NextResponse.json({ error: 'Unknown leg' }, { status: 400 })
  if (!isLegLive(leg)) return NextResponse.json({ error: `${leg.name} leg is not live yet` }, { status: 409 })
  if (!isValidWallet(taker)) return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  if (!/^\d+$/.test(amountRaw) || !/^\d+$/.test(totalRaw)) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const amount = Number(amountRaw) / 10 ** USDC_DECIMALS
  const total = Number(totalRaw) / 10 ** USDC_DECIMALS
  if (amount <= 0 || amount > total) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (total < BAG_MIN_BUY_USDC || total > BAG_MAX_BUY_USDC) {
    return NextResponse.json(
      { error: `Beta limit: $${BAG_MIN_BUY_USDC}–$${BAG_MAX_BUY_USDC} per buy` },
      { status: 400 },
    )
  }

  const order = await jupOrder({
    inputMint: USDC_MINT,
    outputMint: leg.mint,
    amount: amountRaw,
    taker,
    slippageBps: BAG_SLIPPAGE_BPS,
  })

  if (!order.transaction) {
    return NextResponse.json(
      { error: order.errorMessage ?? order.error ?? 'No route for this leg right now' },
      { status: 502 },
    )
  }

  const impactPct = Math.abs(
    typeof order.priceImpact === 'number' ? order.priceImpact : Number(order.priceImpactPct ?? 0) * 100,
  )
  if (impactPct > BAG_MAX_PRICE_IMPACT_PCT) {
    return NextResponse.json(
      { error: `${leg.symbol}: price impact ${impactPct.toFixed(2)}% is above the ${BAG_MAX_PRICE_IMPACT_PCT}% limit. Try a smaller amount.` },
      { status: 422 },
    )
  }

  return NextResponse.json(
    {
      leg: leg.key,
      transaction: order.transaction,
      requestId: order.requestId,
      inAmount: order.inAmount,
      outAmount: order.outAmount,
      priceImpactPct: impactPct,
      feeBps: order.feeBps ?? 0,
      feeMint: order.feeMint ?? null,
      referralAccount: order.referralAccount ?? null,
      router: order.router,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
