export interface TamaInput {
  tradeVolume: number  // USD total traded
  memberCount: number
  winRate: number     // 0-1
  yieldApy: number    // 0-1
  ageSeconds: number
}

export interface TamaStats {
  level: number       // 0-5
  xp: number
  xpToNext: number
  stage: string
  emoji: string
  hp: number          // 0-100 for duels
  attack: number
  defense: number
}

const STAGES = [
  { name: 'Egg',       emoji: '🥚', threshold: 0    },
  { name: 'Hatchling', emoji: '🐣', threshold: 100  },
  { name: 'Chick',     emoji: '🐤', threshold: 500  },
  { name: 'Trader',    emoji: '🦅', threshold: 2000 },
  { name: 'Dragon',    emoji: '🐉', threshold: 8000 },
  { name: 'Legend',    emoji: '👑', threshold: 20000 },
]

export function calculateTamaStats(input: TamaInput): TamaStats {
  const { tradeVolume, memberCount, winRate, yieldApy, ageSeconds } = input

  // XP formula
  const volumeXP   = Math.log10(Math.max(tradeVolume, 1)) * 20
  const memberXP   = memberCount * 5
  const winXP      = winRate * 100
  const yieldXP    = yieldApy * 50
  const ageXP      = Math.sqrt(ageSeconds / 86400) * 10 // days

  const totalXP = Math.floor(volumeXP + memberXP + winXP + yieldXP + ageXP)

  // Find level
  let level = 0
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (totalXP >= STAGES[i].threshold) {
      level = i
      break
    }
  }

  const nextThreshold = STAGES[level + 1]?.threshold ?? STAGES[level].threshold * 3
  const stage = STAGES[level]

  // Duel stats scale with level + win rate
  const hp = Math.min(100, 40 + level * 10 + winRate * 30)
  const attack = Math.min(100, 30 + level * 12 + winRate * 20)
  const defense = Math.min(100, 30 + level * 8 + (memberCount / 10) * 5)

  return {
    level,
    xp: totalXP,
    xpToNext: nextThreshold - totalXP,
    stage: stage.name,
    emoji: stage.emoji,
    hp: Math.round(hp),
    attack: Math.round(attack),
    defense: Math.round(defense),
  }
}
