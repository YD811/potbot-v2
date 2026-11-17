/**
 * BAG fee model (single source of truth for the numbers).
 *
 * PotBot charges one integrator fee on every Jupiter swap made through
 * potbot.fun/bag. Jupiter keeps 20% of an integrator fee. What is left is
 * PotBot's net revenue, which is split in the books between the treasury,
 * the creator of the BAG that was bought and the referrer of the buyer.
 *
 * Today the creator and referrer shares are tracked as BAG Points only.
 * Nothing here is a payout promise: cash revenue share needs legal review
 * first. The whole fee lands on PotBot's Jupiter referral account.
 */

/** Jupiter accepts 50–255 bps for a referral fee. */
export const BAG_FEE_BPS_DEFAULT = 100
export const JUPITER_CUT = 0.2

export const NET_SPLIT = { treasury: 0.6, creator: 0.25, referrer: 0.15 } as const

export function bagFeeBps(): number {
  const v = Number(process.env.BAG_JUP_REFERRAL_FEE_BPS ?? BAG_FEE_BPS_DEFAULT)
  return Number.isFinite(v) && v >= 50 && v <= 255 ? v : BAG_FEE_BPS_DEFAULT
}

export interface FeeSplit {
  gross: number
  jupiter: number
  net: number
  treasury: number
  creator: number
  referrer: number
}

/**
 * Split of the fee on `volumeUsd` of buys. A missing creator or referrer
 * share stays with the treasury.
 */
export function feeSplit(
  volumeUsd: number,
  opts: { feeBps?: number; hasCreator?: boolean; hasReferrer?: boolean } = {},
): FeeSplit {
  const feeBps = opts.feeBps ?? BAG_FEE_BPS_DEFAULT
  const gross = (volumeUsd * feeBps) / 10_000
  const jupiter = gross * JUPITER_CUT
  const net = gross - jupiter
  const creator = opts.hasCreator === false ? 0 : net * NET_SPLIT.creator
  const referrer = opts.hasReferrer === false ? 0 : net * NET_SPLIT.referrer
  return { gross, jupiter, net, treasury: net - creator - referrer, creator, referrer }
}
