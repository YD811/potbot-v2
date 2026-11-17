/**
 * BAG Points — rules (Season 0 "Genesis").
 *
 * Points reward buying the BAG through potbot.fun and *holding* it.
 * They have no monetary value, are not a token, and carry no promise of
 * any future token, airdrop or payout. Rules can change during the beta.
 *
 *   Buy points    10 pts per $1 bought via potbot.fun/bag.
 *                 Pending for 7 days; confirmed only if the wallet still
 *                 holds at least half of what it bought through us.
 *   Hold points   1 pt per $1 held per day, counted only up to what the
 *                 wallet bought through us (buying cbBTC elsewhere does
 *                 not earn). ×1.25 when all live legs are within ±10 pp of
 *                 target weight ("Full BAG").
 *   Referrals     +10% of the confirmed points of wallets you referred.
 *                 Referees lose nothing.
 *   Genesis       ×2 on buy points for buys made before GENESIS_END.
 *
 * Pure functions here; persistence lives in the API routes.
 */

export const BUY_POINTS_PER_USD = 10
export const HOLD_POINTS_PER_USD_DAY = 1
export const FULL_BAG_MULTIPLIER = 1.25
export const FULL_BAG_TOLERANCE_PP = 10
export const REFERRAL_SHARE = 0.1
export const BUY_VESTING_DAYS = 7
export const MIN_HOLD_RATIO_FOR_BUY_POINTS = 0.5

export function genesisEnd(): Date {
  return new Date(process.env.BAG_GENESIS_END ?? '2026-12-03T23:59:59Z')
}

export interface BuyRow {
  usdc_in: number | string
  created_at: string
}

export interface SnapshotRow {
  day: string
  held_usd: number | string
  eligible_usd: number | string
  full_bag: boolean
  points: number | string
}

export interface PointsBreakdown {
  boughtUsd: number
  buyConfirmed: number
  buyPending: number
  hold: number
  referral: number
  total: number
}

const n = (v: number | string) => Number(v) || 0

export function buyPointsFor(row: BuyRow, end = genesisEnd()): number {
  const mult = new Date(row.created_at) <= end ? 2 : 1
  return n(row.usdc_in) * BUY_POINTS_PER_USD * mult
}

/** Hold points for one day. */
export function holdPointsForDay(heldUsd: number, boughtUsd: number, fullBag: boolean): {
  eligibleUsd: number
  points: number
} {
  const eligibleUsd = Math.max(0, Math.min(heldUsd, boughtUsd))
  const points = eligibleUsd * HOLD_POINTS_PER_USD_DAY * (fullBag ? FULL_BAG_MULTIPLIER : 1)
  return { eligibleUsd: round2(eligibleUsd), points: round2(points) }
}

/** True when every live leg is within tolerance of its target weight. */
export function isFullBag(valuesUsd: number[], targetBps: number[]): boolean {
  const total = valuesUsd.reduce((s, v) => s + v, 0)
  if (total <= 0 || valuesUsd.length === 0) return false
  const targetSum = targetBps.reduce((s, v) => s + v, 0)
  return valuesUsd.every((v, i) => {
    const actualPp = (v / total) * 100
    const targetPp = (targetBps[i] / targetSum) * 100
    return Math.abs(actualPp - targetPp) <= FULL_BAG_TOLERANCE_PP
  })
}

export function ownPoints(
  buys: BuyRow[],
  snapshots: SnapshotRow[],
  currentHeldUsd: number,
  now = new Date(),
): Omit<PointsBreakdown, 'referral' | 'total'> {
  const boughtUsd = buys.reduce((s, b) => s + n(b.usdc_in), 0)
  const holdsEnough = boughtUsd > 0 && currentHeldUsd >= boughtUsd * MIN_HOLD_RATIO_FOR_BUY_POINTS
  const vestMs = BUY_VESTING_DAYS * 86_400_000
  let buyConfirmed = 0
  let buyPending = 0
  for (const b of buys) {
    const pts = buyPointsFor(b)
    const vested = now.getTime() - new Date(b.created_at).getTime() >= vestMs
    if (vested && holdsEnough) buyConfirmed += pts
    else if (!vested) buyPending += pts
    // vested but sold down: forfeited (not counted)
  }
  const hold = snapshots.reduce((s, r) => s + n(r.points), 0)
  return { boughtUsd: round2(boughtUsd), buyConfirmed: round2(buyConfirmed), buyPending: round2(buyPending), hold: round2(hold) }
}

export function withReferral(own: Omit<PointsBreakdown, 'referral' | 'total'>, refereesConfirmed: number): PointsBreakdown {
  const referral = round2(refereesConfirmed * REFERRAL_SHARE)
  return { ...own, referral, total: round2(own.buyConfirmed + own.hold + referral) }
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}

export function isValidWallet(s: string | null | undefined): s is string {
  return !!s && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)
}
