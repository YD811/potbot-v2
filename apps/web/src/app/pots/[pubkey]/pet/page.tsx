'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { usePot, useProposals, useMembers } from '@/hooks/usePots'
import { useMockStore } from '@/lib/mock-store'
import { calculatePlantStats, plantInputFromMockPot, PLANT_STAGES } from '@/lib/tamagotchi/plant'
import { PotPet } from '@/components/PotPet'

const SEASON_END_LABEL = 'July 11, 2026'

const FEED_ACTIONS = [
  { icon: '💰', action: 'Deposit into the pot',          health: '+3 health',  points: '+50 pts' },
  { icon: '🗳️', action: 'Vote on a proposal',            health: '+2 health',  points: '+5 pts'  },
  { icon: '📋', action: 'Create a proposal that passes', health: '+4 health',  points: '+25 pts' },
  { icon: '👥', action: 'Invite a new member',           health: '+5 health',  points: '+20 pts' },
  { icon: '✅', action: 'Execute an approved swap',       health: '+3 health',  points: '+10 pts' },
]

function HealthBar({ health }: { health: number }) {
  const color =
    health >= 80 ? '#00ff88' :
    health >= 50 ? '#22c55e' :
    health >= 25 ? '#f59e0b' :
    '#ef4444'
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-pot-muted">Health</span>
        <span style={{ color }} className="font-bold">{health}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-pot-dark overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${health}%`, background: color, boxShadow: `0 0 8px ${color}80` }}
        />
      </div>
    </div>
  )
}

function StagePip({ stage, currentId }: { stage: typeof PLANT_STAGES[0]; currentId: number }) {
  const done    = stage.id <= currentId
  const current = stage.id === currentId
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 transition ${
        current
          ? 'border-pot-green bg-pot-green/10 scale-110'
          : done
          ? 'border-pot-green/50 bg-pot-green/5'
          : 'border-pot-border bg-pot-dark opacity-40'
      }`}>
        {stage.emoji}
      </div>
      <span className={`text-[10px] font-medium ${current ? 'text-pot-green' : done ? 'text-white' : 'text-pot-muted'}`}>
        {stage.name}
      </span>
    </div>
  )
}

export default function PetPage() {
  const { pubkey } = useParams<{ pubkey: string }>()
  const { data: pot, isLoading } = usePot(pubkey)
  const { data: proposals = [] } = useProposals(pubkey)
  const { data: members = [] } = useMembers(pubkey)

  const stats = useMemo(() => {
    if (!pot) return null
    const totalVotes = (proposals as any[]).reduce(
      (s: number, p: any) => s + ((p.voters?.length) ?? 0), 0
    )
    const input = plantInputFromMockPot(pot as any, {
      totalVotes,
      depositCount: (members as any[]).length,
      daysSinceLastActivity: 1,
      netDepositSol: (pot as any).balance ?? 0,
      leaderboardRank: 0,
    })
    return calculatePlantStats(input)
  }, [pot, proposals, members])

  if (isLoading || !pot) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="card p-8 text-center animate-pulse w-64">
          <div className="text-5xl mb-3">🌱</div>
          <div className="h-4 bg-pot-border rounded w-1/2 mx-auto" />
        </div>
      </div>
    )
  }

  if (!stats) return null

  const { stage, health, healthLabel, daysActive, totalInteractions, healthFactors } = stats

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-pot-muted mb-5">
        <Link href="/" className="hover:text-white transition">Home</Link>
        <span>/</span>
        <Link href={`/pots/${pubkey}`} className="hover:text-white transition">{(pot as any).name}</Link>
        <span>/</span>
        <span className="text-white">Plant</span>
      </div>

      {/* Season banner */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-pot-green/20 mb-6">
        <span className="text-2xl">🌱</span>
        <div className="flex-1">
          <span className="text-sm font-bold text-white">Season 1: The Garden</span>
          <span className="text-xs text-pot-muted ml-2">· Ends {SEASON_END_LABEL}</span>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-pot-green/10 text-pot-green border border-pot-green/20">
          Top 3 win prizes
        </span>
      </div>

      {/* Main card — plant visual + stats */}
      <div className={`card p-6 mb-5 bg-gradient-to-br ${stage.bgClass} border-pot-green/20`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Plant SVG */}
          <div className="relative shrink-0">
            <div className="w-44 h-44 sm:w-52 sm:h-52">
              <PotPet stage={stage} health={health} animate />
            </div>
            {/* Health overlay badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-pot-card border border-pot-border font-medium whitespace-nowrap">
              {healthLabel}
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 w-full space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-2xl">{stage.emoji}</span>
                <h1 className="text-xl font-black text-white">{(pot as any).name}</h1>
              </div>
              <p className="text-sm text-pot-muted">{stage.description}</p>
            </div>

            <HealthBar health={health} />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-pot-dark/60 rounded-xl p-3">
                <div className="text-lg font-bold text-white">{daysActive}</div>
                <div className="text-xs text-pot-muted">Days Active</div>
              </div>
              <div className="bg-pot-dark/60 rounded-xl p-3">
                <div className="text-lg font-bold text-white">{totalInteractions}</div>
                <div className="text-xs text-pot-muted">Total Interactions</div>
              </div>
              <div className="bg-pot-dark/60 rounded-xl p-3">
                <div className="text-lg font-bold text-white">{(members as any[]).length}</div>
                <div className="text-xs text-pot-muted">Members</div>
              </div>
              <div className="bg-pot-dark/60 rounded-xl p-3">
                <div className="text-lg font-bold text-white">{(pot as any).tradeCount ?? 0}</div>
                <div className="text-xs text-pot-muted">Trades Executed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stage progress */}
      <div className="card p-5 mb-5">
        <h2 className="text-sm font-bold text-white mb-4">Growth Stages</h2>
        <div className="relative flex items-start justify-between">
          {/* Progress line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-pot-border">
            <div
              className="h-full bg-pot-green transition-all duration-700"
              style={{ width: `${(stage.id / (PLANT_STAGES.length - 1)) * 100}%` }}
            />
          </div>
          {PLANT_STAGES.map((s) => (
            <StagePip key={s.id} stage={s} currentId={stage.id} />
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl bg-pot-dark text-xs text-pot-muted leading-relaxed">
          {stage.id < PLANT_STAGES.length - 1 && (
            <>
              <span className="text-white font-medium">Next stage: {PLANT_STAGES[stage.id + 1].name} {PLANT_STAGES[stage.id + 1].emoji}</span>
              {stage.id === 0 && ' — make the first deposit.'}
              {stage.id === 1 && ' — execute the first approved swap.'}
              {stage.id === 2 && ' — reach 5 members and 10 executed trades.'}
              {stage.id === 3 && ' — reach the top 10 on the leaderboard.'}
            </>
          )}
          {stage.id === PLANT_STAGES.length - 1 && (
            <span className="text-pot-green font-medium">🌟 Maximum stage reached — you're a Season 1 champion!</span>
          )}
        </div>
      </div>

      {/* Health factors */}
      {healthFactors.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="text-sm font-bold text-white mb-3">Health Factors</h2>
          <div className="space-y-2">
            {healthFactors.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-base w-6 text-center shrink-0">{f.icon}</span>
                <span className="flex-1 text-gray-300">{f.label}</span>
                <span className={`font-bold shrink-0 ${f.delta >= 0 ? 'text-pot-green' : 'text-red-400'}`}>
                  {f.delta > 0 ? '+' : ''}{f.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed your plant */}
      <div className="card p-5 mb-5">
        <h2 className="text-sm font-bold text-white mb-1">🌿 Feed Your Plant</h2>
        <p className="text-xs text-pot-muted mb-4">
          These actions grow your plant's health and earn Season points.
          The plant is purely cosmetic — it does not affect financial outcomes.
        </p>
        <div className="space-y-2">
          {FEED_ACTIONS.map((a) => (
            <div key={a.action} className="flex items-center gap-3 p-3 rounded-xl bg-pot-dark hover:bg-pot-card/60 transition">
              <span className="text-xl shrink-0">{a.icon}</span>
              <span className="flex-1 text-sm text-gray-300">{a.action}</span>
              <div className="text-right text-xs shrink-0">
                <div className="text-pot-green font-medium">{a.health}</div>
                <div className="text-pot-muted">{a.points}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link href={`/pots/${pubkey}`} className="btn-secondary flex-1 text-center text-sm py-2.5">
          ← Back to Pot
        </Link>
        <Link href={`/pots/${pubkey}?tab=proposals`} className="btn-primary flex-1 text-center text-sm py-2.5">
          🗳️ Vote on Proposals
        </Link>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-pot-muted mt-4 leading-relaxed">
        The plant is a cosmetic Season 1 feature. It is not tied to financial performance.
        Plant health reflects community activity only.
      </p>
    </div>
  )
}
