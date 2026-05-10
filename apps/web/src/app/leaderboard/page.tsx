'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePots } from '@/hooks/usePots'
import { useVaultAnalyticsBatch } from '@/hooks/useAnalytics'
import { useSupabaseLeaderboard } from '@/hooks/useSupabaseLeaderboard'
import { useSolPrice } from '@/lib/prices'
import { reverseSNS } from '@/lib/sns'
import { SeasonPrizeCard } from '@/components/SeasonPrizeCard'
import { calculatePlantStats, plantInputFromMockPot } from '@/lib/tamagotchi/plant'
import { seasonScoreFromMockPot, fmtSeasonScore } from '@/lib/season-score'

type SortKey = 'tvl' | 'pnl' | 'apy' | 'trades' | 'members' | 'season'

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'season',  label: 'Season',  icon: '🌱' },
  { key: 'tvl',     label: 'TVL',     icon: '💰' },
  { key: 'pnl',     label: 'PnL',     icon: '📈' },
  { key: 'apy',     label: 'APY',     icon: '⚡' },
  { key: 'trades',  label: 'Trades',  icon: '🔄' },
  { key: 'members', label: 'Members', icon: '👥' },
]

const YIELD_LABELS: Record<number | string, string> = {
  0: 'HODL',            hodl: 'HODL',
  1: 'Yield',           yield: 'Yield',
  2: 'AI DCA',          ai_dca: 'AI DCA',
  3: 'Trend',           trend_following: 'Trend',
  4: 'JLP ⚡',          degen: 'JLP ⚡',
  5: 'Exponent PT 🔒',
  6: 'JLP Hedge 🛡️',
  none: 'None', conservative: 'Conservative', balanced: 'Balanced', aggressive: 'Aggressive',
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

function fmtUsd(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(1)}K`
  return `$${usd.toFixed(0)}`
}

function PnLBadge({ pct }: { pct: number }) {
  const pos = pct >= 0
  return (
    <span className={`text-xs font-bold ${pos ? 'text-pot-green' : 'text-red-400'}`}>
      {pos ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-pot-green">
      <span className="w-1.5 h-1.5 rounded-full bg-pot-green animate-pulse" />
      Live
    </span>
  )
}

/** Derive plant emoji from pot data without a full render */
function plantEmoji(pot: any, rank: number): string {
  const input = plantInputFromMockPot(pot, { leaderboardRank: rank + 1 })
  const stats = calculatePlantStats(input)
  return stats.stage.emoji
}

export default function LeaderboardPage() {
  const { data: pots = [], isLoading } = usePots()
  const { price: solUsd } = useSolPrice()
  const [sortBy, setSortBy] = useState<SortKey>('season')
  const [search, setSearch] = useState('')
  const [snsNames, setSnsNames] = useState<Record<string, string>>({})

  const publicPots = useMemo(
    () => (pots as any[]).filter((p: any) => p.isPublic),
    [pots]
  )
  const pubkeys = useMemo(() => publicPots.map((p: any) => p.pubkey as string), [publicPots])
  const { dataMap: analyticsMap } = useVaultAnalyticsBatch(pubkeys)
  const { data: lbCache } = useSupabaseLeaderboard(50)

  const cacheMap = useMemo(() => {
    const m = new Map<string, (typeof lbCache)[number]>()
    for (const e of lbCache) m.set(e.pot, e)
    return m
  }, [lbCache])

  useEffect(() => {
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
  }, [publicPots])

  const enriched = useMemo(() => {
    return publicPots.map((p: any) => {
      const a = analyticsMap[p.pubkey]
      const c = cacheMap.get(p.pubkey)
      const navUsd     = a?.navUsd  ?? (p.balance * (solUsd ?? 0))
      const pnlPct     = a?.pnlPct  ?? (c?.pnl_7d_pct ?? 0)
      const apy30d     = a?.apy30d  ?? 0
      const tradeCount = a?.tradeCount ?? c?.trade_count ?? p.tradeCount
      const hasLive    = !!a
      const hasCached  = !a && !!c
      // Plant health (activity-based)
      const plantInput = plantInputFromMockPot(p, { leaderboardRank: 0 })
      const plantStats = calculatePlantStats(plantInput)
      const petHealth  = plantStats.health
      const petEmoji   = plantStats.stage.emoji
      // Season score
      const seasonScore = seasonScoreFromMockPot(p, petHealth, solUsd ?? 100)
      return { ...p, navUsd, pnlPct, apy30d, tradeCount, hasLive, hasCached, petHealth, petEmoji, seasonScore }
    })
  }, [publicPots, analyticsMap, cacheMap, solUsd])

  const sorted = useMemo(() => {
    const filtered = enriched.filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (snsNames[p.pubkey] ?? '').includes(search.toLowerCase())
    )
    return [...filtered].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'season':  return b.seasonScore - a.seasonScore
        case 'tvl':     return b.navUsd - a.navUsd
        case 'pnl':     return b.pnlPct - a.pnlPct
        case 'apy':     return b.apy30d - a.apy30d
        case 'trades':  return b.tradeCount - a.tradeCount
        case 'members': return b.memberCount - a.memberCount
        default:        return 0
      }
    })
  }, [enriched, sortBy, search, snsNames])

  const totalTvlUsd  = enriched.reduce((s: number, p: any) => s + p.navUsd, 0)
  const totalTvlSol  = publicPots.reduce((s: number, p: any) => s + p.balance, 0)
  const totalMembers = publicPots.reduce((s: number, p: any) => s + p.memberCount, 0)
  const totalTrades  = publicPots.reduce((s: number, p: any) => s + p.tradeCount, 0)
  const avgApy       = enriched.length > 0
    ? enriched.reduce((s: number, p: any) => s + p.apy30d, 0) / enriched.length
    : 0
  const liveCount   = enriched.filter((p: any) => p.hasLive).length

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Season Prize Pool ────────────────────────────────────────────── */}
      <SeasonPrizeCard />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          🏆 Leaderboard
        </h1>
        <p className="text-pot-muted text-sm mt-1">
          Top performing public vaults · ranked by Season Score by default
        </p>
      </div>

      {/* Devnet banner */}
      {liveCount === 0 && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div className="text-sm text-pot-muted">
            <strong className="text-white">Devnet preview.</strong> Vaults shown below are demonstrative — real PnL/APY reporting starts after mainnet launch. Season Score is live.
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-pot-card border border-pot-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-pot-green">{publicPots.length}</div>
          <div className="text-xs text-pot-muted mt-1">Public Vaults</div>
        </div>
        <div className="bg-pot-card border border-pot-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {solUsd ? fmtUsd(totalTvlUsd) : `${totalTvlSol.toFixed(1)} SOL`}
          </div>
          {solUsd && <div className="text-[10px] text-pot-muted">{totalTvlSol.toFixed(1)} SOL</div>}
          <div className="text-xs text-pot-muted mt-1">Combined TVL</div>
        </div>
        <div className="bg-pot-card border border-pot-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalMembers}</div>
          <div className="text-xs text-pot-muted mt-1">Total Members</div>
        </div>
        <div className="bg-pot-card border border-pot-border rounded-2xl p-4 text-center">
          <div className={`text-2xl font-bold ${avgApy > 0 ? 'text-pot-green' : 'text-white'}`}>
            {avgApy > 0 ? `${avgApy.toFixed(1)}%` : `${totalTrades}`}
          </div>
          <div className="text-xs text-pot-muted mt-1">{avgApy > 0 ? 'Avg APY 30d' : 'Total Trades'}</div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search vaults or .potbot.sol names..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-pot-card border border-pot-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-pot-muted outline-none focus:border-pot-accent transition"
        />
        <div className="flex gap-1.5 flex-wrap">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition ${
                sortBy === opt.key
                  ? opt.key === 'season'
                    ? 'bg-pot-green text-pot-dark'
                    : 'bg-pot-accent text-white'
                  : 'bg-pot-card border border-pot-border text-pot-muted hover:text-white'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Season score formula hint when sorting by season */}
      {sortBy === 'season' && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-pot-green/5 border border-pot-green/20 text-xs text-pot-muted flex items-center gap-2">
          <span className="text-pot-green font-mono">Season Score = volume × members × pet_health</span>
          <span>· rewards activity, growth, engagement — not P&L</span>
        </div>
      )}

      {/* Table header (desktop) */}
      <div className="hidden sm:grid grid-cols-[3rem_1fr_7rem_5rem_5rem_4rem_5rem_4rem] gap-2 px-4 py-2 text-[10px] font-medium text-pot-muted uppercase tracking-wider">
        <div>#</div><div>Vault</div>
        <div className="text-right">TVL</div>
        <div className="text-right">PnL</div>
        <div className="text-right">APY 30d</div>
        <div className="text-right">Trades</div>
        <div className="text-right">🌱 Score</div>
        <div className="text-right">Pet</div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-pot-card border border-pot-border rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-pot-border rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🌍</div>
          <h3 className="text-lg font-semibold text-white mb-1">No public vaults yet</h3>
          <p className="text-pot-muted text-sm mb-4">
            {search ? 'No vaults match your search' : 'Create a public vault to appear here'}
          </p>
          <Link href="/create" className="btn-primary text-sm">Create a Public Vault</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((pot: any, idx: number) => {
            const isTop3     = idx < 3
            const snsName    = snsNames[pot.pubkey]
            const yieldLabel = YIELD_LABELS[pot.yieldStrategy] ?? 'None'
            return (
              <Link
                key={pot.pubkey}
                href={`/pots/${pot.pubkey}`}
                className={`flex items-center gap-3 px-4 py-4 rounded-2xl border transition group ${
                  isTop3
                    ? 'bg-pot-card border-pot-green/30 hover:border-pot-green/60'
                    : 'bg-pot-card border-pot-border hover:border-pot-accent/30'
                }`}
              >
                <div className="w-8 flex justify-center shrink-0">{rankBadge(idx)}</div>

                {/* Emoji + name */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isTop3 ? 'bg-pot-green/10' : 'bg-pot-dark'
                  }`}>{pot.emoji}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm truncate group-hover:text-pot-green transition">{pot.name}</div>
                    <div className="text-[10px] text-pot-muted flex items-center gap-1.5">
                      {snsName && <><span className="text-pot-green font-mono">{snsName}</span><span>·</span></>}
                      <span>{pot.memberCount} members</span>
                      {pot.hasLive && <><span>·</span><LiveDot /></>}
                      {pot.hasCached && (
                        <><span>·</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-pot-accent">
                            <span className="w-1.5 h-1.5 rounded-full bg-pot-accent" />
                            Cached
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop columns */}
                <div className="hidden sm:grid grid-cols-[7rem_5rem_5rem_4rem_5rem_4rem] gap-2 items-center shrink-0 text-right">
                  {/* TVL */}
                  <div>
                    <div className={`text-sm font-bold ${isTop3 ? 'text-pot-green' : 'text-white'}`}>
                      {solUsd && pot.navUsd > 0 ? fmtUsd(pot.navUsd) : `${pot.balance.toFixed(2)} SOL`}
                    </div>
                    {solUsd && pot.navUsd > 0 && <div className="text-[10px] text-pot-muted">{pot.balance.toFixed(2)} SOL</div>}
                  </div>
                  {/* PnL */}
                  <div>
                    {pot.hasLive || pot.hasCached
                      ? <PnLBadge pct={pot.pnlPct} />
                      : <span className="text-xs text-pot-muted">—</span>}
                  </div>
                  {/* APY */}
                  <div>
                    {pot.hasLive && pot.apy30d !== 0 ? (
                      <span className={`text-sm font-bold ${pot.apy30d >= 0 ? 'text-pot-green' : 'text-red-400'}`}>
                        {pot.apy30d >= 0 ? '+' : ''}{pot.apy30d.toFixed(1)}%
                      </span>
                    ) : <span className="text-xs text-pot-muted">—</span>}
                  </div>
                  {/* Trades */}
                  <div>
                    <div className="text-sm font-medium text-white">{pot.tradeCount ?? 0}</div>
                  </div>
                  {/* Season Score */}
                  <div>
                    <div className={`text-sm font-bold ${isTop3 ? 'text-pot-green' : 'text-white'}`}>
                      {fmtSeasonScore(pot.seasonScore)}
                    </div>
                    <div className="text-[10px] text-pot-muted">pts</div>
                  </div>
                  {/* Pet plant — links to pet page */}
                  <div onClick={(e) => e.preventDefault()} className="flex justify-end">
                    <Link
                      href={`/pots/${pot.pubkey}/pet`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xl hover:scale-125 transition-transform"
                      title={`${pot.petEmoji} View plant`}
                    >
                      {pot.petEmoji}
                    </Link>
                  </div>
                </div>

                {/* Mobile */}
                <div className="flex sm:hidden items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-pot-green">
                      {solUsd && pot.navUsd > 0 ? fmtUsd(pot.navUsd) : `${pot.balance.toFixed(1)} SOL`}
                    </div>
                    {pot.hasLive && <PnLBadge pct={pot.pnlPct} />}
                  </div>
                  <span className="text-xl">{pot.petEmoji}</span>
                  <span className="text-pot-muted text-sm">→</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Ecosystem analytics */}
      {!isLoading && sorted.length > 0 && (
        <div className="mt-4 bg-pot-card border border-pot-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">📊</span>
            <span className="text-xs font-semibold text-white">Ecosystem Analytics</span>
            <span className="text-[10px] text-pot-muted ml-auto">Analytics API · refreshes every 8s</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-pot-muted mb-0.5">Combined TVL</div>
              <div className="text-sm font-bold text-white">{solUsd ? fmtUsd(totalTvlUsd) : `${totalTvlSol.toFixed(1)} SOL`}</div>
            </div>
            <div>
              <div className="text-xs text-pot-muted mb-0.5">Avg Vault Size</div>
              <div className="text-sm font-bold text-white">
                {publicPots.length > 0 ? (solUsd ? fmtUsd(totalTvlUsd / publicPots.length) : `${(totalTvlSol / publicPots.length).toFixed(1)} SOL`) : '—'}
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
          Create a public vault, grow your community, and compete for the Season 1 prize pool.
        </p>
        <Link href="/create" className="inline-flex items-center gap-2 px-4 py-2 bg-pot-green hover:brightness-110 text-pot-dark rounded-xl text-sm font-bold transition">
          🪴 Create a Vault
        </Link>
      </div>
    </div>
  )
}
