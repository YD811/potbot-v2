import { NextRequest, NextResponse } from 'next/server'
import {
  BAG_MAX_BUY_USDC,
  BAG_MAX_PRICE_IMPACT_PCT,
  BAG_MIN_BUY_USDC,
  BAG_SLIPPAGE_BPS,
  BAG_RETRY_SLIPPAGE_BPS,
  USDC_DECIMALS,
  USDC_MINT,
  getLeg,
  isLegLive,
  isLegRestricted,
} from '@/lib/bag/config'
import { VersionedTransaction } from '@solana/web3.js'
import { bagConnection, isGeoBlocked, jupOrder, requestCountry, usdPrices } from '@/lib/bag/server'
import { isValidWallet } from '@/lib/bag/points'
import { bagFeeBps } from '@/lib/bag/fees'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/bag/order?leg=btc|ant|gold&amount=<raw USDC>&taker=<wallet>[&total=<raw USDC>]
 * GET /api/bag/order?side=sell&leg=…&amount=<raw token units>&taker=<wallet>  (asset → USDC, no size limit)
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
  if (sp.get('side') !== 'sell' && isLegRestricted(leg, requestCountry(req))) {
    return NextResponse.json({ error: `${leg.name} is not available in your region.` }, { status: 451 })
  }
  if (!isValidWallet(taker)) return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  if (!/^\d+$/.test(amountRaw) || !/^\d+$/.test(totalRaw)) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const sell = sp.get('side') === 'sell'
  const amount = Number(amountRaw) / 10 ** USDC_DECIMALS
  const total = Number(totalRaw) / 10 ** USDC_DECIMALS
  if (!sell && (amount <= 0 || amount > total)) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (sell && BigInt(amountRaw) <= 0n) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (!sell && (total < BAG_MIN_BUY_USDC || total > BAG_MAX_BUY_USDC)) {
    return NextResponse.json(
      { error: `Beta limit: $${BAG_MIN_BUY_USDC}–$${BAG_MAX_BUY_USDC} per buy` },
      { status: 400 },
    )
  }

  // Thin new tokens (ANTx) can move more than 1% between quote and simulation.
  // A slippage failure re-quotes once with a wider tolerance; the price-impact
  // guard still checks the new quote against the market price.
  const slippageTiers = [BAG_SLIPPAGE_BPS, Math.max(BAG_SLIPPAGE_BPS, BAG_RETRY_SLIPPAGE_BPS)]
  let order!: Awaited<ReturnType<typeof jupOrder>>
  let impactPct = 0
  for (let attempt = 0; attempt < slippageTiers.length; attempt++) {
    const slippageBps = slippageTiers[attempt]
    order = await jupOrder({
      inputMint: sell ? leg.mint : USDC_MINT,
      outputMint: sell ? USDC_MINT : leg.mint,
      amount: amountRaw,
      taker,
      slippageBps,
    })

    if (!order.transaction) {
      return NextResponse.json(
        { step: 'quote', code: order.errorCode ?? null, error: order.errorMessage ?? order.error ?? 'No route for this leg right now' },
        { status: 502 },
      )
    }

    // Price impact, measured by us: what the user really gets against Jupiter's
    // market price, minus our own fee. Jupiter Ultra's own impact figure is
    // unreliable for thin new tokens (it showed 1 to 4% on a $3 ANTx buy whose
    // real price matched the market), so it is only a fallback.
    const jupImpact = Math.abs(
      typeof order.priceImpact === 'number' ? order.priceImpact : Number(order.priceImpactPct ?? 0) * 100,
    )
    impactPct = await measuredImpact({
      sell,
      mint: leg.mint,
      decimals: leg.decimals,
      inRaw: order.inAmount,
      outRaw: order.outAmount,
      // The fee Jupiter actually put into this order (ours when the referral is set).
      feeBps: typeof order.feeBps === 'number' ? order.feeBps : bagFeeBps(),
    }).then(m => (m === null ? jupImpact : m)).catch(() => jupImpact)
    if (impactPct !== jupImpact) console.info(`[bag/order] impact leg=${leg.key} measured=${impactPct.toFixed(2)}% jupiter=${jupImpact.toFixed(2)}%`)
    if (impactPct > BAG_MAX_PRICE_IMPACT_PCT) {
      return NextResponse.json(
        { step: 'quote', error: `${leg.symbol}: price impact ${impactPct.toFixed(2)}% is above the ${BAG_MAX_PRICE_IMPACT_PCT}% limit. Try a smaller amount.` },
        { status: 422 },
      )
    }

    // Simulate on our own RPC before the wallet sees the transaction. A swap
    // that would fail is stopped here with a readable reason, instead of the
    // wallet showing a "could be malicious" warning or the user paying a fee
    // for a failed transaction. An RPC outage does not block the buy.
    try {
      const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'))
      const sim = await bagConnection().simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: false, commitment: 'confirmed' })
      if (sim.value.err) {
        const logs = sim.value.logs ?? []
        const hint = logs.find(l => /insufficient|slippage|exceeds|frozen|error/i.test(l)) ?? logs[logs.length - 1] ?? ''
        console.warn(`[bag/order] simulation failed leg=${leg.key} err=${JSON.stringify(sim.value.err)} hint=${hint}`)
        // Jupiter 6001 = slippage tolerance exceeded: the price moved. Re-quote once, wider.
        if ((JSON.stringify(sim.value.err).includes('6001') || /slippage/i.test(hint)) && attempt < slippageTiers.length - 1) {
          console.info(`[bag/order] retry leg=${leg.key} slippage ${slippageBps} -> ${slippageTiers[attempt + 1]} bps`)
          continue
        }
        return NextResponse.json(
          { step: 'simulate', error: `${leg.symbol}: this swap would fail right now${/insufficient/i.test(hint) ? ' (not enough USDC or SOL)' : /slippage|exceeds/i.test(hint) || JSON.stringify(sim.value.err).includes('6001') ? ' (price moved, try again)' : /frozen/i.test(hint) ? ' (token account is frozen by the issuer)' : ''}.`, detail: JSON.stringify(sim.value.err) },
          { status: 422 },
        )
      }
    } catch (err) {
      console.warn('[bag/order] simulation skipped', err instanceof Error ? err.message : err)
    }
    break
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

/**
 * Loss against the market price, in percent, after taking out the PotBot fee.
 * Null when there is no market price to compare with.
 */
async function measuredImpact(p: { sell: boolean; mint: string; decimals: number; inRaw: string; outRaw: string; feeBps: number }): Promise<number | null> {
  const price = (await usdPrices([p.mint]))[p.mint]
  const inN = Number(p.inRaw)
  const outN = Number(p.outRaw)
  if (!price || !(inN > 0) || !(outN > 0)) return null
  const fee = p.feeBps / 100
  // Buy: USDC in, token out. Sell: token in, USDC out.
  const paidUsd = p.sell ? (inN / 10 ** p.decimals) * price : inN / 10 ** USDC_DECIMALS
  const gotUsd = p.sell ? outN / 10 ** USDC_DECIMALS : (outN / 10 ** p.decimals) * price
  const lossPct = (1 - gotUsd / paidUsd) * 100 - fee
  return Math.max(0, lossPct)
}
