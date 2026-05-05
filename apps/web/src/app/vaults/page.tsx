'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePots } from '@/hooks/usePots'
import { useSolPrice } from '@/lib/prices'
import { useVaultAnalyticsBatch } from '@/hooks/useAnalytics'
import { usePot } from '@/hooks/usePots'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'
import { StatusBadge } from '@/components/StatusBadge'

const ONE_POT_PUBKEY =
  process.env.NEXT_PUBLIC_ONE_POT_PUBKEY ?? 'DemoPoT1111111111111111111111111111111111111'
const CLUSTER: 'mainnet-beta' | 'devnet' =
  (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as 'mainnet-beta' | 'devnet') ?? 'devnet'

const TAMA_EMOJI: Record<number, string> = { 1: '🌱', 2: '🌿', 3: '🪴', 4: '🌳', 5: '🌲' }
const TAMA_NAME: Record<number, string> = {
  1: 'Seedling', 2: 'Sprout', 3: 'Bud', 4: 'Bloom', 5: 'Mature Tree',
}

const STRATEGY_RULES = [
  { icon: '⚖️', label: '70% SOL / 30% USDC baseline allocation' },
  { icon: '🤖', label: 'AI Agent proposes rebalances when SOL moves ±10% from 7-day MA' },
  { icon: '⏱️', label: '24h voting window · 50% quorum · 60% approval threshold' },
  { icon: '🔒', label: 'Max 20% of treasury per single swap — hard-coded in the contract' },
  { icon: '📖', label: 'All rules visible on the pot page under the Trade tab' },
]

export default function VaultsPage() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'tvl' | 'members' | 'recent'>('tvl')

  const { data: pots = [], isLoading: potsLoading } = usePots()
  const { price: solPrice } = useSolPrice()
  const { data: onePot } = usePot(ONE_POT_PUBKEY)

  // Pull batch analytics for the rest
  const livePubkeys = useMemo(() => pots.map((p: any) => p.pubkey), [pots])
  const { dataMap: analyticsMap } = useVaultAnalyticsBatch(livePubkeys)

  const otherVaults = useMemo(() => {
    return pots
      .filter((p: any) => p.pubkey !== ONE_POT_PUBKEY)
      .filter((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()) ||
                          p.pubkey.toLowerCase().includes(search.toLowerCase()))
      .sort((a: any, b: any) => {
        if (sortBy === 'tvl')     return (b.balance ?? 0) - (a.balance ?? 0)
        if (sortBy === 'members') return (b.memberCount ?? 0) - (a.memberCount ?? 0)
        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      })
  }, [pots, search, sortBy])

  const onePotBalanceUsd = onePot && solPrice ? onePot.balance * solPrice : null
  const onePotAny = onePot as any

  const tamaStats = onePot
    ? calculateTamaStats({
        tradeVolume: onePotAny.totalVolume ?? 0,
        memberCount: onePotAny.memberCount ?? 0,
        winRate: 0.5,
        yieldApy: 0,
        ageSeconds: 86400,
      })
    : null
  const tamaLevel = tamaStats ? Math.max(1, Math.min(5, Math.floor(tamaStats.hp / 20) + 1)) : 1

  return (
    <div className="min-h-screen">
      {/* Page header — small breadcrumb + create CTA */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-pot-muted">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <span className="text-white font-semibold">Vaults</span>
        </div>
        <Link
          href="/create"
          className="px-4 py-2 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-sm transition"
        >
          + Create Vault
        </Link>
      </div>

      {/* ════════════════════ ONE POT HERO ════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-6 mb-10">
        <div className="relative overflow-hidden rounded-3xl border border-pot-green/30 bg-gradient-to-br from-pot-green/10 via-pot-card to-pot-accent/10 p-5 sm:p-8">
          {/* Status header */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="px-2 py-0.5 rounded-full bg-pot-green/20 text-pot-green text-[10px] font-bold uppercase tracking-wider">
              ⭐ Featured
            </span>
            <StatusBadge tier={CLUSTER === 'mainnet-beta' ? 'live' : 'devnet'} compact />
            <span className="text-[11px] text-pot-muted">Public flagship pot · open to anyone</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 items-center">
            {/* Left — name + emoji + plant */}
            <div className="lg:col-span-3 min-w-0">
              <div className="flex items-start gap-4 sm:gap-5 mb-4">
                <div className="text-5xl sm:text-7xl shrink-0">{onePot?.emoji ?? '🪴'}</div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                    {onePot?.name ?? 'PotBot ONE'}
                  </h1>
                  <p className="text-sm sm:text-base text-pot-muted mt-1">
                    The flagship public pot. Deposit, propose a Jupiter swap, vote, watch it execute on-chain.
                  </p>
                  {tamaStats && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-pot-muted">
                      <span className="text-lg">{TAMA_EMOJI[tamaLevel]}</span>
                      <span className="text-white font-semibold">{TAMA_NAME[tamaLevel]}</span>
                      <span>· HP {tamaStats.hp}/100</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Strategy rules */}
              <div className="bg-pot-dark/60 border border-pot-border rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-pot-green mb-1">
                  How this pot trades
                </div>
                {STRATEGY_RULES.map((r) => (
                  <div key={r.label} className="flex items-start gap-2 text-xs sm:text-sm">
                    <span className="shrink-0">{r.icon}</span>
                    <span className="text-white/90 leading-snug">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — metrics + CTAs */}
            <div className="lg:col-span-2 space-y-3">
              <Stat label="TVL" value={onePot ? `${onePot.balance.toFixed(2)} SOL` : '—'} sub={onePotBalanceUsd ? `$${onePotBalanceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : undefined} accent="green" />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Members" value={String(onePot?.memberCount ?? 0)} />
                <Stat label="Trades" value={String(onePotAny?.tradeCount ?? 0)} />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/pots/${ONE_POT_PUBKEY}`}
                  className="w-full px-5 py-3 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-sm sm:text-base text-center transition"
                >
                  💰 Open & deposit
                </Link>
                <Link
                  href={`/pots/${ONE_POT_PUBKEY}#propose-section`}
                  className="w-full px-5 py-3 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-bold text-sm sm:text-base text-center transition"
                >
                  🗳️ See active proposals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ OTHER PUBLIC VAULTS ════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-6 pb-12">
        <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">More public vaults</h2>
            <p className="text-xs text-pot-muted mt-0.5">
              {potsLoading ? 'Loading…' : `${otherVaults.length} active pot${otherVaults.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-pot-card border border-pot-border text-sm text-white placeholder:text-pot-muted focus:outline-none focus:border-pot-accent w-40"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-pot-card border border-pot-border text-sm text-white focus:outline-none focus:border-pot-accent"
            >
              <option value="tvl">Biggest TVL</option>
              <option value="members">Most members</option>
              <option value="recent">Recently created</option>
            </select>
          </div>
        </div>

        {potsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-pot-card border border-pot-border rounded-2xl p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : otherVaults.length === 0 ? (
          <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-white font-semibold mb-1">No other public pots yet</p>
            <p className="text-pot-muted text-sm mb-4">Be first — create one in 30 seconds.</p>
            <Link
              href="/create"
              className="inline-block px-4 py-2 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-sm transition"
            >
              + Create Vault
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherVaults.map((p: any) => {
              const balanceUsd = solPrice ? p.balance * solPrice : null
              const analytics = analyticsMap[p.pubkey]
              return (
                <Link
                  key={p.pubkey}
                  href={`/pots/${p.pubkey}`}
                  className="bg-pot-card border border-pot-border hover:border-pot-accent/40 rounded-2xl p-4 transition group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl shrink-0">{p.emoji ?? '🪴'}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold truncate group-hover:text-pot-accent transition">
                        {p.name ?? 'Unnamed pot'}
                      </p>
                      <p className="text-[10px] text-pot-muted font-mono truncate">
                        {p.pubkey.slice(0, 6)}…{p.pubkey.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Mini label="TVL" value={`${(p.balance ?? 0).toFixed(2)}◎`} />
                    <Mini label="Members" value={String(p.memberCount ?? 0)} />
                    <Mini label="Trades" value={String(p.tradeCount ?? 0)} />
                  </div>
                  {analytics?.pnlPct != null && analytics.pnlPct !== 0 && (
                    <div className={`mt-2 text-[11px] font-semibold ${analytics.pnlPct >= 0 ? 'text-pot-green' : 'text-red-400'}`}>
                      {analytics.pnlPct >= 0 ? '+' : ''}{analytics.pnlPct.toFixed(1)}% (30d)
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ════════════════════ AI agents banner — slim ════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-6 pb-12">
        <Link
          href="/for-agents"
          className="block bg-pot-card border border-pot-accent/30 hover:border-pot-accent/60 rounded-2xl p-4 sm:p-5 transition"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">🤖</span>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm sm:text-base">PotBot is MCP-native</p>
                <p className="text-xs text-pot-muted">Any AI agent — Claude, GPT — can list vaults, propose swaps, vote.</p>
              </div>
            </div>
            <span className="text-pot-accent text-xs font-bold shrink-0">For AI Agents →</span>
          </div>
        </Link>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'green'
}) {
  const valueClass = accent === 'green' ? 'text-pot-green' : 'text-white'
  return (
    <div className="bg-pot-dark/60 border border-pot-border rounded-2xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-pot-muted font-bold">{label}</div>
      <div className={`text-xl sm:text-2xl font-black tabular-nums ${valueClass} mt-0.5`}>{value}</div>
      {sub && <div className="text-[11px] text-pot-muted tabular-nums">{sub}</div>}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-pot-dark/60 rounded-lg px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-pot-muted">{label}</div>
      <div className="text-xs font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}
