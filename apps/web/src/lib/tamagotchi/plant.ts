/**
 * Season 1 — Plant (Tamagotchi) system
 *
 * Purely activity-based. NOT tied to financial performance.
 * Health is a 0-100 score updated by member actions.
 *
 * Stages (5):
 *   🌰 Seed     — pot created
 *   🌱 Sprout   — first deposit
 *   🪴 Seedling — first executed swap
 *   🌿 Plant    — 5+ members AND 10+ executed proposals
 *   🌳 Tree     — top 10 leaderboard rank
 */

export interface PlantInput {
  /** Total number of members who have ever deposited */
  memberCount: number
  /** Total executed proposals (swaps) */
  executedProposals: number
  /** Total proposals created (including failed) */
  totalProposals: number
  /** Total votes cast across all proposals */
  totalVotes: number
  /** Total deposits ever made (count, not amount) */
  depositCount: number
  /** Days since last any activity (vote/deposit/proposal) */
  daysSinceLastActivity: number
  /** Net deposit balance (deposits - withdrawals) in SOL */
  netDepositSol: number
  /** Season leaderboard rank (1 = first). 0 = unranked. */
  leaderboardRank: number
  /** Unix ms when pot was created */
  createdAt: number
}

export interface PlantStage {
  id: number
  name: string
  emoji: string
  /** Short description for the UI */
  description: string
  /** CSS class for background gradient on the pet page */
  bgClass: string
}

export interface PlantStats {
  stage: PlantStage
  /** 0-100 health score */
  health: number
  /** Textual health label */
  healthLabel: string
  /** Days pot has been active */
  daysActive: number
  /** Total interaction events (votes + deposits + proposals) */
  totalInteractions: number
  /** List of what's helping / hurting health */
  healthFactors: { icon: string; label: string; delta: number }[]
  /** Season score for leaderboard ranking */
  seasonScore: number
}

export const PLANT_STAGES: PlantStage[] = [
  {
    id: 0,
    name: 'Seed',
    emoji: '🌰',
    description: 'Just planted — waiting for the first deposit.',
    bgClass: 'from-amber-900/20 to-pot-dark',
  },
  {
    id: 1,
    name: 'Sprout',
    emoji: '🌱',
    description: 'First deposit received — it\'s alive!',
    bgClass: 'from-green-900/20 to-pot-dark',
  },
  {
    id: 2,
    name: 'Seedling',
    emoji: '🪴',
    description: 'First trade executed — learning to grow.',
    bgClass: 'from-emerald-800/20 to-pot-dark',
  },
  {
    id: 3,
    name: 'Plant',
    emoji: '🌿',
    description: '5+ members, 10+ trades — a thriving community.',
    bgClass: 'from-green-700/20 to-pot-dark',
  },
  {
    id: 4,
    name: 'Tree',
    emoji: '🌳',
    description: 'Top 10 on the leaderboard — a true Season 1 champion.',
    bgClass: 'from-green-600/20 to-emerald-900/20',
  },
]

/** Health gains / losses per event type */
const HEALTH_GAINS = {
  deposit:          +3,
  vote:             +2,
  proposalCreated:  +4,
  memberJoined:     +5,
}

const HEALTH_LOSSES = {
  inactiveDayPenalty: -2,   // per day after 7 days idle
  failedQuorum:       -3,   // per proposal that failed quorum
  netNegativeDeposit: -5,   // if withdrawals > deposits in last week
}

export function calculatePlantStats(input: PlantInput): PlantStats {
  const {
    memberCount,
    executedProposals,
    totalProposals,
    totalVotes,
    depositCount,
    daysSinceLastActivity,
    netDepositSol,
    leaderboardRank,
    createdAt,
  } = input

  const daysActive = Math.max(1, Math.floor((Date.now() - createdAt) / 86_400_000))
  const totalInteractions = totalVotes + depositCount + totalProposals

  // ── Determine stage ─────────────────────────────────────────────────────────
  let stageId = 0
  if (leaderboardRank > 0 && leaderboardRank <= 10) {
    stageId = 4
  } else if (memberCount >= 5 && executedProposals >= 10) {
    stageId = 3
  } else if (executedProposals >= 1) {
    stageId = 2
  } else if (depositCount >= 1) {
    stageId = 1
  }
  const stage = PLANT_STAGES[stageId]

  // ── Calculate health ────────────────────────────────────────────────────────
  const healthFactors: PlantStats['healthFactors'] = []

  // Positive factors (cap contributions to avoid overflow)
  const depositHealth = Math.min(depositCount * HEALTH_GAINS.deposit, 30)
  if (depositCount > 0) healthFactors.push({ icon: '💰', label: `${depositCount} deposits`, delta: depositHealth })

  const voteHealth = Math.min(totalVotes * HEALTH_GAINS.vote, 25)
  if (totalVotes > 0) healthFactors.push({ icon: '🗳️', label: `${totalVotes} votes cast`, delta: voteHealth })

  const proposalHealth = Math.min(totalProposals * HEALTH_GAINS.proposalCreated, 20)
  if (totalProposals > 0) healthFactors.push({ icon: '📋', label: `${totalProposals} proposals created`, delta: proposalHealth })

  const memberHealth = Math.min(memberCount * HEALTH_GAINS.memberJoined, 20)
  if (memberCount > 0) healthFactors.push({ icon: '👥', label: `${memberCount} members`, delta: memberHealth })

  // Bonus for being a top pot
  let rankBonus = 0
  if (leaderboardRank > 0 && leaderboardRank <= 3) rankBonus = 10
  else if (leaderboardRank <= 10) rankBonus = 5
  if (rankBonus > 0) healthFactors.push({ icon: '🏆', label: `Top ${leaderboardRank} on leaderboard`, delta: rankBonus })

  const rawPositive = depositHealth + voteHealth + proposalHealth + memberHealth + rankBonus

  // Negative factors
  const idlePenalty = daysSinceLastActivity > 7
    ? Math.min(HEALTH_LOSSES.inactiveDayPenalty * (daysSinceLastActivity - 7), -40)
    : 0
  if (idlePenalty < 0) healthFactors.push({ icon: '😴', label: `${daysSinceLastActivity}d idle`, delta: idlePenalty })

  const failedProposals = Math.max(0, totalProposals - executedProposals)
  const failedPenalty = Math.max(HEALTH_LOSSES.failedQuorum * failedProposals, -15)
  if (failedPenalty < 0) healthFactors.push({ icon: '❌', label: `${failedProposals} failed proposals`, delta: failedPenalty })

  const depositPenalty = netDepositSol < 0 ? HEALTH_LOSSES.netNegativeDeposit : 0
  if (depositPenalty < 0) healthFactors.push({ icon: '📉', label: 'More withdrawals than deposits', delta: depositPenalty })

  const rawHealth = rawPositive + idlePenalty + failedPenalty + depositPenalty
  const health = Math.min(100, Math.max(0, rawHealth))

  const healthLabel =
    health >= 80 ? 'Thriving 🌟' :
    health >= 60 ? 'Healthy 💚' :
    health >= 40 ? 'Growing 🌿' :
    health >= 20 ? 'Wilting 🍂' :
    'Struggling 🥀'

  // ── Season score (for leaderboard ranking) ──────────────────────────────────
  // volume × memberCount × health — rewards activity, growth, engagement
  // Note: we approximate volume as executedProposals * memberCount (no price data here)
  const seasonScore = Math.floor(executedProposals * memberCount * (health / 100) * 10)

  return {
    stage,
    health,
    healthLabel,
    daysActive,
    totalInteractions,
    healthFactors,
    seasonScore,
  }
}

/** Derive PlantInput from a MockPot + its proposals/members */
export function plantInputFromMockPot(
  pot: {
    balance: number
    memberCount: number
    tradeCount: number
    nextProposalId: number
    createdAt: number
  },
  extras: {
    totalVotes?: number
    depositCount?: number
    daysSinceLastActivity?: number
    netDepositSol?: number
    leaderboardRank?: number
  } = {}
): PlantInput {
  return {
    memberCount: pot.memberCount,
    executedProposals: pot.tradeCount,
    totalProposals: pot.nextProposalId - 1,
    totalVotes: extras.totalVotes ?? pot.tradeCount * 3,
    depositCount: extras.depositCount ?? pot.memberCount,
    daysSinceLastActivity: extras.daysSinceLastActivity ?? 1,
    netDepositSol: extras.netDepositSol ?? pot.balance,
    leaderboardRank: extras.leaderboardRank ?? 0,
    createdAt: pot.createdAt ?? Date.now() - 30 * 86_400_000,
  }
}
