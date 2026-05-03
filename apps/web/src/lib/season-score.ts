/**
 * Season Score — transparent ranking formula for the leaderboard.
 *
 * Formula: seasonVolume × memberCount × (petHealth / 100)
 *
 * This rewards:
 *   - Activity (volume = executed proposals × avg swap size)
 *   - Growth (member count)
 *   - Engagement (pet health = community participation score)
 *
 * NOT based on raw trading P&L — deliberately.
 * Full formula shown on the leaderboard page.
 */

export interface SeasonScoreInput {
  /** USD-equivalent trading volume this season */
  seasonVolumeUsd: number
  /** Number of members at season snapshot */
  memberCount: number
  /** Pet health score 0-100 */
  petHealth: number
}

export function computeSeasonScore(input: SeasonScoreInput): number {
  const { seasonVolumeUsd, memberCount, petHealth } = input
  // Normalise volume: log10 scale so $100K and $100M aren't 1000x apart
  const volumeFactor = Math.log10(Math.max(seasonVolumeUsd, 10)) * 10
  const score = Math.floor(volumeFactor * memberCount * (petHealth / 100))
  return score
}

/** Format season score for display */
export function fmtSeasonScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`
  if (score >= 1_000) return `${(score / 1_000).toFixed(1)}K`
  return String(score)
}

/** Derive from a mock pot (no live analytics available) */
export function seasonScoreFromMockPot(pot: {
  totalVolume: number
  memberCount: number
  tradeCount: number
  balance: number
  createdAt?: number
}, petHealth: number, solPrice = 100): number {
  const volumeUsd = (pot.totalVolume ?? pot.tradeCount * pot.balance * 2) * solPrice
  return computeSeasonScore({
    seasonVolumeUsd: Math.max(volumeUsd, 10),
    memberCount: pot.memberCount,
    petHealth,
  })
}
