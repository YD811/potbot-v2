'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePots } from '@/hooks/usePots'
import { reverseSNS } from '@/lib/sns'

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
  4: 'JLP ⚡', jlp: 'JLP ⚡',
}

const RANK_EMOJIS = ['🥇', '🥈', '🥉']

function rankBadge(rank: number) {
  if (rank < 3) return <span className="text-xl">{RANK_EMOJIS[rank]}</span>
  return (
    <span className={`text-sm font-bold tabular-nums w-8 text-center ${rank < 10 ? 'text-pot-muted' : 'text-pot-border'}`}>
      #{rank + 1}
    </span>
  )
}

/** Dune SIM status indicator — shows whether live data is active */
function DuneStatusBadge({ live }: { live: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-pot-muted">
      <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-pot-green animate-pulse' : 'bg-pot-muted'}`} />
      {live ? (
        <span className="text-pot-green">Live · Dune SIM</span>
      ) : (
        <span>Demo data</span>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const { data: pots = [], isLoading } = usePots()
  const [sortBy, setSortBy] = useState<SortKey>('tvl')
  const [search, setSearch] = useState('')
  const [snsNames, setSnsNames] = useState<Record<string, string>>({})

  // Resolve SNS names for all public pots
  useEffect(() => {
    const publicPots = (pots as any[]).filter((p: any) => p.isPublic)
    Promise.all(
      publicPots.map(async (p: any) => {
        const name = await reverseSNS(p.pubkey)
        return { pubkey: p.pubkey, name }
      })
    ).then(results => {
      const map: Record<string, string> = {}
      results.forEach(r => { if (r.name) map[r.pubkey] = r.name })
      setSnsNames(map)
    })
  }, [pots])

  const publicPots = useMemo(() => {
    return (pots as any[]).filter((p: any) => p.isPublic)
  }, [pots])

  const sorted = useMemo(() => {
    const filtered = publicPots.filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (snsNames[p.pubkey] ?? '').includes(search.toLowerCase())
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
  }, [publicPots, sortBy, search, snsNames])

  const totalTvl = publicPots.reduce((s: number, p: any) => s + p.balance, 0)
  const totalMembers = publicPots.reduce((s: number, p: any) => s + p.memberCount, 0)
  const totalVolume = publicPots.reduce((s: number, p: any) => s + (p.totalVolume ?? 0), 0)
  const totalTrades = publicPots.reduce((s: number, p: any) => s + p.tradeCount, 0)

  // Dune SIM API key status (client check)
  const duneApiKeySet = typeof window !== 'undefined'
    ? !!process.env.NEXT_PUBLIC_DUNE_API_KEY
    : false

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🏆 Leaderboard
          </h1>
          <p className="text-pot-muted text-sm mt-1">
            Top performing public pots — ranked by TVL, trades, and activity
          </p>
        </div>
        <DuneStatusBadge live={duneApiKeySet} />
      </div>

      {/* Dune SIM Analytics Banner */}
      <div className="bg-[#111827] border border-[#F5A623]/20 rounded-2xl p-4 mb-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#F5A623]/10 flex items-center justify-center shrink-0">
          <span className="text-sm">📊</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#F5A623]">Dune SIM Analytics</div>
          <div className="text-[10px] text-pot-muted mt-0.5">
            Real-time portfolio data powered by Dune SIM · Add{' '}
            <code className="bg-pot-dark px-1 rounded text-[9px]">NEXT_PUBLIC_DUNE_API_KEY</code>
            {' '}to enable live balances
          </div>
        </div>
        <a
          href="https://docs.sim.dune.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#F5A623] hover:underline shrink-0"
        >
          Docs →
        </a>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
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
        <div className="bg-pot-card border border-pot-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalTrades}</div>
          <div className="text-xs text-pot-muted mt-1">Total Trades</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search pots or .potbot.sol names..."
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
            const snsName = snsNames[pot.pubkey]

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
                    <div className="text-[10px] text-pot-muted flex items-center gap-1.5">
                      {snsName ? (
                        <>
                          <span className="text-pot-green font-mono">{snsName}</span>
                          <span>·</span>
                        </>
                      ) : null}
                      <span>{pot.tamagotchiEmoji} Lvl {pot.tamagotchiLevel}</span>
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

      {/* Volume analytics row */}
      {!isLoading && sorted.length > 0 && (
        <div className="mt-4 bg-pot-card border border-pot-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">📊</span>
            <span className="text-xs font-semibold text-white">Ecosystem Analytics</span>
            <span className="text-[10px] text-pot-muted ml-auto">Dune SIM · refreshes every 30s</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-pot-muted mb-0.5">Total Volume</div>
              <div className="text-sm font-bold text-white">{totalVolume.toFixed(1)} SOL</div>
            </div>
            <div>
              <div className="text-xs text-pot-muted mb-0.5">Avg Vault Size</div>
              <div className="text-sm font-bold text-white">
                {publicPots.length > 0 ? (totalTvl / publicPots.length).toFixed(1) : '0'} SOL
              </div>
            </div>
            <div>
              <div className="text-xs text-pot-muted mb-0.5">Total Trades</div>
              <div className="text-sm font-bold text-white">{totalTrades}</div>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-6 bg-pot-card border border-dashed border-pot-accent/30 rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">🚀</div>
        <h3 className="text-sm font-semibold text-white mb-1">Want to be on this list?</h3>
        <p className="text-xs text-pot-muted mb-4">
          Create a public pot and start building your trading track record. Get your own <code className="bg-pot-dark px-1 rounded">{'{name}.potbot.sol'}</code> domain.
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
