'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePots } from '@/hooks/usePots'

type SortKey = 'tvl' | 'trades' | 'members' | 'volume'

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'tvl', label: 'TVL', icon: '💰' },
  { key: 'trades', label: 'Trades', icon: '🔄' },
  { key: 'members', label: 'Members', icon: '👥' },
  { key: 'volume', label: 'Volume', icon: '📈' },
]

const YIELD_LABELS: Record<number | string, string> = {
  0: 'None', none: 'None',
  1: 'Conservative', conservative: 'Conservative',
  2: 'Balanced', balanced: 'Balanced',
  3: 'Aggressive', aggressive: 'Aggressive',
}

const RANK_STYLES = [
  'text-yellow-400',   // 🥇 1st
  'text-slate-300',    // 🥈 2nd
  'text-amber-600',    // 🥉 3rd
]

const RANK_EMOJIS = ['🥇', '🥈', '🥉']

function rankBadge(rank: number) {
  if (rank < 3) return <span className="text-xl">{RANK_EMOJIS[rank]}</span>
  return (
    <span className={`text-sm font-bold tabular-nums w-8 text-center ${rank < 10 ? 'text-pot-muted' : 'text-pot-border'}`}>
      #{rank + 1}
    </span>
  )
}

export default function LeaderboardPage() {
  const { data: pots = [], isLoading } = usePots()
  const [sortBy, setSortBy] = useState<SortKey>('tvl')
  const [search, setSearch] = useState('')

  const publicPots = useMemo(() => {
    return pots.filter((p: any) => p.isPublic)
  }, [pots])

  const sorted = useMemo(() => {
    const filtered = publicPots.filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
    return [...filtered].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'tvl': return b.balance - a.balance
        case 'trades': return b.tradeCount - a.tradeCount
        case 'members': return b.memberCount - a.memberCount
        case 'volume': return (b.totalVolume ?? 0) - (a.totalVolume ?? 0)
        default: return 0
      }
    })
  }, [publicPots, sortBy, search])

  const totalTvl = publicPots.reduce((s: number, p: any) => s + p.balance, 0)
  const totalMembers = publicPots.reduce((s: number, p: any) => s + p.memberCount, 0)
  const totalVolume = publicPots.reduce((s: number, p: any) => s + (p.totalVolume ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🏆 Leaderboard
          </h1>
          <p className="text-pot-muted text-sm mt-1">
            Top performing public pots — ranked by TVL, trades, and activity
          </p>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-pot-card border border-pot-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-pot-green">{publicPots.length}</div>
          <div className="text-xs text-pot-muted mt-1">Public POTs</div>
        </div>
        <div className="bg-pot-card border border-pot-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalTvl.toFixed(1)} SOL</div>
          <div className="text-xs text-pot-muted mt-1">Combined TVL</div>
        </div>
        <div className="bg-pot-card border border-pot-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalMembers}</div>
          <div className="text-xs text-pot-muted mt-1">Total Members</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search pots..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-pot-card border border-pot-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-pot-muted outline-none focus:border-pot-accent transition"
        />
        <div className="flex gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                sortBy === opt.key
                  ? 'bg-pot-accent text-white'
                  : 'bg-pot-card border border-pot-border text-pot-muted hover:text-white'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[3rem_1fr_7rem_5rem_5rem_7rem_7rem] gap-3 px-4 py-2 text-[10px] font-medium text-pot-muted uppercase tracking-wider">
        <div>#</div>
        <div>POT</div>
        <div className="text-right">TVL</div>
        <div className="text-right">Trades</div>
        <div className="text-right">Members</div>
        <div className="text-right">Volume</div>
        <div className="text-right">Strategy</div>
      </div>

      {/* Leaderboard rows */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-pot-card border border-pot-border rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-pot-border rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🌍</div>
          <h3 className="text-lg font-semibold text-white mb-1">No public pots yet</h3>
          <p className="text-pot-muted text-sm mb-4">
            {search ? 'No pots match your search' : 'Create a public pot to appear here'}
          </p>
          <Link href="/create" className="btn-primary text-sm">
            Create a Public POT
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((pot: any, idx: number) => {
            const volumeEfficiency = pot.totalVolume > 0 && pot.balance > 0
              ? (pot.totalVolume / pot.balance).toFixed(1)
              : '—'
            const yieldLabel = YIELD_LABELS[pot.yieldStrategy] ?? 'None'
            const isTop3 = idx < 3

            return (
              <Link
                key={pot.pubkey}
                href={`/pots/${pot.pubkey}`}
                className={`flex items-center gap-3 px-4 py-4 rounded-2xl border transition group ${
                  isTop3
                    ? 'bg-pot-card border-pot-accent/30 hover:border-pot-accent/60'
                    : 'bg-pot-card border-pot-border hover:border-pot-accent/30'
                }`}
              >
                {/* Rank */}
                <div className="w-8 flex justify-center shrink-0">
                  {rankBadge(idx)}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isTop3 ? 'bg-pot-accent/10' : 'bg-pot-dark'
                  }`}>
                    {pot.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm truncate group-hover:text-pot-accent transition">
                      {pot.name}
                    </div>
                    <div className="text-[10px] text-pot-muted">
                      {pot.tamagotchiEmoji} Lvl {pot.tamagotchiLevel} · {pot.pubkey.slice(0, 4)}…{pot.pubkey.slice(-4)}
                    </div>
                  </div>
                </div>

                {/* Stats — desktop */}
                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  {/* TVL */}
                  <div className="w-[7rem] text-right">
                    <div className={`text-sm font-bold ${isTop3 ? 'text-pot-green' : 'text-white'}`}>
                      {pot.balance.toFixed(2)} SOL
                    </div>
                    <div className="text-[10px] text-pot-muted">TVL</div>
                  </div>
                  {/* Trades */}
                  <div className="w-[5rem] text-right">
                    <div className="text-sm font-medium text-white">{pot.tradeCount}</div>
                    <div className="text-[10px] text-pot-muted">trades</div>
                  </div>
                  {/* Members */}
                  <div className="w-[5rem] text-right">
                    <div className="text-sm font-medium text-white">{pot.memberCount}</div>
                    <div className="text-[10px] text-pot-muted">members</div>
                  </div>
                  {/* Volume */}
                  <div className="w-[7rem] text-right">
                    <div className="text-sm font-medium text-white">{(pot.totalVolume ?? 0).toFixed(1)} SOL</div>
                    <div className="text-[10px] text-pot-muted">{volumeEfficiency}× ratio</div>
                  </div>
                  {/* Strategy */}
                  <div className="w-[7rem] text-right">
                    <div className="text-xs text-pot-muted px-2 py-0.5 bg-pot-dark rounded-lg">
                      {yieldLabel}
                    </div>
                  </div>
                </div>

                {/* Stats — mobile */}
                <div className="flex sm:hidden items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-pot-green">{pot.balance.toFixed(1)} SOL</div>
                    <div className="text-[10px] text-pot-muted">{pot.memberCount} members</div>
                  </div>
                  <span className="text-pot-muted text-sm">→</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 bg-pot-card border border-dashed border-pot-accent/30 rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">🚀</div>
        <h3 className="text-sm font-semibold text-white mb-1">Want to be on this list?</h3>
        <p className="text-xs text-pot-muted mb-4">
          Create a public pot and start building your trading track record
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-xl text-sm font-semibold transition"
        >
          🪴 Create a POT
        </Link>
      </div>
    </div>
  )
}