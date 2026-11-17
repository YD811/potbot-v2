/**
 * BAG — Bitcoin · Anthropic · Gold.
 *
 * MVP model: a one-click, non-custodial buy. The user pays USDC, Jupiter
 * Swap V2 buys each leg straight into the user's own wallet. No PotBot
 * program, no vault, no index token. PotBot never holds user funds.
 *
 * Mints are an explicit allowlist. Never resolve a leg by symbol: on
 * 17.11.2026 Jupiter search already returned several fake "ANTX" /
 * "Anthropic" tokens. The real tokenized ANT mint is set via env on IPO
 * day (19.11.2026) after checking it against the issuer's official list.
 */

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const USDC_DECIMALS = 6

export type BagLegKey = 'btc' | 'ant' | 'gold'

export interface BagLeg {
  key: BagLegKey
  symbol: string
  name: string
  /** Empty string = leg not live yet. */
  mint: string
  decimals: number
  /** Target weight in basis points. All legs sum to 10_000. */
  weightBps: number
  issuer: string
  tokenProgram: 'spl-token' | 'token-2022'
  /** Short issuer-risk badges shown on the card. */
  risks: string[]
  color: string
}

const ANT_MINT = (process.env.NEXT_PUBLIC_BAG_ANT_MINT ?? '').trim()
const ANT_SYMBOL = (process.env.NEXT_PUBLIC_BAG_ANT_SYMBOL ?? 'ANTx').trim()
const ANT_ISSUER = (process.env.NEXT_PUBLIC_BAG_ANT_ISSUER ?? 'xStocks (Backed Assets, Jersey)').trim()
const ANT_DECIMALS = Number(process.env.NEXT_PUBLIC_BAG_ANT_DECIMALS ?? '8')

/**
 * Gold leg. Default is XAUt0 (classic SPL, deepest AMM liquidity on Solana
 * as of 17.11.2026). PAXG (Token-2022) is the alternative:
 *   NEXT_PUBLIC_BAG_GOLD=paxg
 */
const GOLD_VARIANT = (process.env.NEXT_PUBLIC_BAG_GOLD ?? 'xaut0').trim().toLowerCase()

const GOLD_LEGS: Record<string, Omit<BagLeg, 'key' | 'weightBps' | 'color'>> = {
  xaut0: {
    symbol: 'XAUt0',
    name: 'Tether Gold',
    mint: 'AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P',
    decimals: 6,
    issuer: 'Tether (via LayerZero OFT)',
    tokenProgram: 'spl-token',
    risks: ['Issuer can freeze', 'Issuer can mint'],
  },
  paxg: {
    symbol: 'PAXG',
    name: 'PAX Gold',
    mint: '5GgRAEmv8ZxF2PR5hY72Qs5x1bnQ6UK2RbTPoqJ3wSwW',
    decimals: 6,
    issuer: 'Paxos (OCC-regulated)',
    tokenProgram: 'token-2022',
    risks: ['Issuer can freeze', 'Permanent delegate', 'Transfer fee can be enabled'],
  },
}

export const BAG_LEGS: BagLeg[] = [
  {
    key: 'btc',
    symbol: 'cbBTC',
    name: 'Bitcoin',
    mint: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
    decimals: 8,
    weightBps: 3334,
    issuer: 'Coinbase (custodial)',
    tokenProgram: 'spl-token',
    risks: ['Custodial', 'Issuer can freeze'],
    color: '#F7931A',
  },
  {
    key: 'ant',
    symbol: ANT_SYMBOL,
    name: 'Anthropic',
    mint: ANT_MINT,
    decimals: ANT_DECIMALS,
    weightBps: 3333,
    issuer: ANT_ISSUER,
    tokenProgram: 'token-2022',
    risks: ['Tokenized stock note', 'Issuer can freeze or claw back', 'No shareholder rights', 'Not available in the US'],
    color: '#D97757',
  },
  {
    key: 'gold',
    ...(GOLD_LEGS[GOLD_VARIANT] ?? GOLD_LEGS.xaut0),
    weightBps: 3333,
    color: '#E6C35C',
  },
]

export function getLeg(key: string): BagLeg | undefined {
  return BAG_LEGS.find(l => l.key === key)
}

export function isLegLive(leg: BagLeg): boolean {
  return leg.mint.length >= 32
}

export function liveLegs(): BagLeg[] {
  return BAG_LEGS.filter(isLegLive)
}

/** Split a USDC amount (raw units) across live legs, renormalising weights. */
export function splitUsdc(totalRaw: bigint, legs: BagLeg[] = liveLegs()): Map<BagLegKey, bigint> {
  const out = new Map<BagLegKey, bigint>()
  if (legs.length === 0) return out
  const sum = legs.reduce((s, l) => s + l.weightBps, 0)
  let allocated = 0n
  legs.forEach((leg, i) => {
    const part = i === legs.length - 1
      ? totalRaw - allocated
      : (totalRaw * BigInt(leg.weightBps)) / BigInt(sum)
    out.set(leg.key, part)
    allocated += part
  })
  return out
}

/**
 * Rebalance-by-buying: route new USDC to underweight legs first, the rest
 * by target weight. Never sells. `currentUsd` is keyed by leg.
 */
export function smartSplitUsdc(
  totalRaw: bigint,
  currentUsd: Partial<Record<BagLegKey, number>>,
  legs: BagLeg[] = liveLegs(),
): Map<BagLegKey, bigint> {
  const held = legs.map(l => Math.max(0, currentUsd[l.key] ?? 0))
  const heldSum = held.reduce((s, v) => s + v, 0)
  if (heldSum <= 0) return splitUsdc(totalRaw, legs)

  const amount = Number(totalRaw) / 10 ** USDC_DECIMALS
  const wSum = legs.reduce((s, l) => s + l.weightBps, 0)
  const targets = legs.map(l => ((heldSum + amount) * l.weightBps) / wSum)
  const deficits = targets.map((t, i) => Math.max(0, t - held[i]))
  const dSum = deficits.reduce((s, v) => s + v, 0)

  const usd = dSum >= amount
    ? deficits.map(d => (amount * d) / dSum)
    : deficits.map((d, i) => d + ((amount - dSum) * legs[i].weightBps) / wSum)

  const out = new Map<BagLegKey, bigint>()
  let allocated = 0n
  legs.forEach((leg, i) => {
    const part = i === legs.length - 1
      ? totalRaw - allocated
      : BigInt(Math.floor(usd[i] * 10 ** USDC_DECIMALS))
    out.set(leg.key, part < 0n ? 0n : part)
    allocated += part
  })
  return out
}

// ── Limits (beta) ────────────────────────────────────────────────────────────
export const BAG_MIN_BUY_USDC = Number(process.env.NEXT_PUBLIC_BAG_MIN_BUY_USDC ?? '10')
export const BAG_MAX_BUY_USDC = Number(process.env.NEXT_PUBLIC_BAG_MAX_BUY_USDC ?? '500')
export const BAG_SLIPPAGE_BPS = Number(process.env.NEXT_PUBLIC_BAG_SLIPPAGE_BPS ?? '100')
/** Block an order when Jupiter reports a price impact above this. */
export const BAG_MAX_PRICE_IMPACT_PCT = Number(process.env.NEXT_PUBLIC_BAG_MAX_PRICE_IMPACT_PCT ?? '2')

/**
 * Jurisdictions that cannot use the BAG page. Tokenized stocks are not
 * offered to US persons; the rest are sanctioned. This is a product
 * guardrail, not a legal opinion — review with counsel.
 * Override: BAG_BLOCKED_COUNTRIES="US,CU,IR,KP,SY,RU,BY"
 */
export function blockedCountries(): Set<string> {
  const raw = process.env.BAG_BLOCKED_COUNTRIES ?? 'US,CU,IR,KP,SY,RU,BY'
  return new Set(raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))
}
