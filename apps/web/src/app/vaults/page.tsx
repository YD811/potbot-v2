'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePots } from '@/hooks/usePots'
import { useSolPrice } from '@/lib/prices'
import { useVaultAnalyticsBatch } from '@/hooks/useAnalytics'
import { useHumanText } from '@/hooks/useHumanText'
import { TrustBadge } from '@/components/TrustBadge'
import { VerifiedModal } from '@/components/VerifiedModal'

// Target APY ranges per yield strategy NUMBER (matches the Strategy Autopilot
// presets on /create). Used only for display on the featured cards.
const STRATEGY_APY: Record<number, string> = {
  0: '—',
  1: '8–12%',
  2: '15–25%',
  3: '30–60%+',
  4: '~40%',
  5: '~22%',
  6: '~35%',
}

function isFeatured(p: any): boolean {
  return p?.trustLevel === 'institutional' && p?.verifiedBy === 'PotBot'
}

type VaultFilter = 'all' | 'conservative' | 'balanced' | 'aggressive' | 'verified'

const FILTERS: { key: VaultFilter; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'conservative', label: '🛡️ Conservative' },
  { key: 'balanced',     label: '⚖️ Balanced' },
  { key: 'aggressive',   label: '⚡ Aggressive' },
  { key: 'verified',     label: '✅ Verified' },
]

// Risk buckets by yieldStrategy number (matches Strategy Autopilot presets):
// 1 Safe + 5 Exponent PT (fixed-rate) → conservative
// 2 Balanced + 6 JLP Hedge (delta-neutral) → balanced
// 3 Aggressive + 4 JLP (levered LP) → aggressive
const FILTER_STRATEGY: Record<string, number[]> = {
  conservative: [1, 5],
  balanced:     [2, 6],
  aggressive:   [3, 4],
}

/** Mock pots carry numeric yieldStrategy ids; live on-chain pots are mapped
 *  by usePots() to the anchor enum KEY string ('conservative' | 'balanced' |
 *  'aggressive' | 'none'). Normalize both shapes to the filter bucket. */
function strategyMatchesFilter(value: unknown, bucket: string): boolean {
  if (typeof value === 'number') return FILTER_STRATEGY[bucket]?.includes(value) ?? false
  if (typeof value === 'string') return value.toLowerCase() === bucket
  return false
}

/** Deterministic upward-trending sparkline derived from the pot pubkey. */
function Sparkline({ seed, className = '' }: { seed: string; className?: string }) {
  const points = useMemo(() => {
    const n = 16
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    const vals: number[] = []
    let v = 30
    for (let i = 0; i < n; i++) {
      h = (h * 1103515245 + 12345) >>> 0
      const noise = ((h % 100) / 100 - 0.45) * 18
      v = Math.max(6, Math.min(54, v + noise + 1.6)) // gentle upward drift
      vals.push(v)
    }
    const w = 120
    const step = w / (n - 1)
    return vals.map((y, i) => `${(i * step).toFixed(1)},${(60 - y).toFixed(1)}`).join(' ')
  }, [seed])

  return (
    <svg viewBox="0 0 120 60" preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#00ff88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function VaultsPage() {
  const t = useHumanText()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'tvl' | 'members' | 'recent'>('tvl')
  const [filter, setFilter] = useState<VaultFilter>('all')
  const [profitableOnly, setProfitableOnly] = useState(false)
  const [verifiedOpen, setVerifiedOpen] = useState(false)

  const openVerified = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setVerifiedOpen(true)
  }

  const { data: pots = [], isLoading: potsLoading } = usePots()
  const { price: solPrice } = useSolPrice()

  const livePubkeys = useMemo(() => pots.map((p: any) => p.pubkey), [pots])
  const { dataMap: analyticsMap } = useVaultAnalyticsBatch(livePubkeys)

  const featuredVaults = useMemo(() => pots.filter(isFeatured), [pots])

  const otherVaults = useMemo(() => {
    return pots
      .filter((p: any) => !isFeatured(p))
      .filter((p: any) => {
        if (filter === 'all') return true
        if (filter === 'verified') return p.trustLevel && p.trustLevel !== 'unverified'
        return strategyMatchesFilter(p.yieldStrategy, filter)
      })
      .filter((p: any) => {
        if (!profitableOnly) return true
        const pnl = analyticsMap[p.pubkey]?.pnlPct
        return pnl != null && pnl >= 0
      })
      .filter((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()) ||
                          p.pubkey.toLowerCase().includes(search.toLowerCase()))
      .sort((a: any, b: any) => {
        if (sortBy === 'tvl')     return (b.balance ?? 0) - (a.balance ?? 0)
        if (sortBy === 'members') return (b.memberCount ?? 0) - (a.memberCount ?? 0)
        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      })
  }, [pots, search, sortBy, filter, profitableOnly, analyticsMap])

  const hasActiveFilters = filter !== 'all' || profitableOnly || search.trim() !== ''

  const clearFilters = () => {
    setFilter('all')
    setProfitableOnly(false)
    setSearch('')
  }

  return (
    <div className="min-h-screen">
      {/* Page header — small breadcrumb + create CTA */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-pot-muted">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <span className="text-white font-semibold">{t('Vaults')}</span>
        </div>
        <Link
          href="/create"
          className="px-4 py-2 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-sm transition"
        >
          + {t('Create Vault')}
        </Link>
      </div>

      {/* ════════════════════ FEATURED BY POTBOT ════════════════════ */}
      {featuredVaults.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-2 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⭐</span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Featured by PotBot</h2>
          </div>
          <p className="text-xs text-pot-muted mb-4">
            Institutional-grade vaults managed by PotBot AI.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredVaults.map((p: any) => {
              const balanceUsd = solPrice ? p.balance * solPrice : null
              return (
                <Link
                  key={p.pubkey}
                  href={`/pots/${p.pubkey}`}
                  className="relative overflow-hidden bg-gradient-to-br from-pot-accent/10 via-pot-card to-pot-green/5 border border-pot-accent/30 hover:border-pot-accent/60 rounded-2xl p-5 transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg hover:shadow-pot-accent/10"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl shrink-0 group-hover:animate-float">{p.emoji ?? '🪴'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold truncate group-hover:text-pot-accent transition">
                          {p.name ?? 'Unnamed pot'}
                        </p>
                        <TrustBadge level="institutional" showLabel={false} onClick={openVerified} />
                      </div>
                      <p className="text-[10px] text-pot-green font-semibold mt-0.5">
                        🤖 Managed by PotBot AI
                      </p>
                    </div>
                  </div>

                  {/* Sparkline */}
                  <Sparkline seed={p.pubkey} className="w-full h-10 mb-3 opacity-80" />

                  <div className="grid grid-cols-3 gap-2">
                    <Mini label="APY" value={STRATEGY_APY[p.yieldStrategy] ?? '—'} />
                    <Mini
                      label="AUM"
                      value={balanceUsd != null
                        ? `$${balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : `${(p.balance ?? 0).toFixed(1)}◎`}
                    />
                    <Mini label="Members" value={String(p.memberCount ?? 0)} />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ════════════════════ COMMUNITY POTS ════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-2 pb-12">
        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-pot-border" />
          <span className="text-xs font-bold uppercase tracking-wider text-pot-muted">Community Pots</span>
          <div className="h-px flex-1 bg-pot-border" />
        </div>

        {/* Sticky strategy filter bar */}
        <div className="sticky top-0 z-10 bg-pot-dark -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 mb-4 border-b border-pot-border/60">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    active
                      ? 'bg-pot-green text-pot-dark'
                      : 'border border-pot-border text-pot-muted hover:text-white hover:border-pot-muted'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
            <div className="shrink-0 w-px h-5 bg-pot-border mx-1" />
            <button
              type="button"
              onClick={() => setProfitableOnly((v) => !v)}
              title="Only show vaults with 30-day PnL ≥ 0"
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                profitableOnly
                  ? 'bg-pot-green text-pot-dark'
                  : 'border border-pot-border text-pot-muted hover:text-white hover:border-pot-muted'
              }`}
            >
              📈 Profitable
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">{t('Public vaults')}</h2>
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
          hasActiveFilters ? (
            <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-white font-semibold mb-1">No pots match these filters</p>
              <p className="text-pot-muted text-sm mb-4">Try widening your search — or clear everything and browse all pots.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-block px-4 py-2 rounded-xl border border-pot-border text-white hover:border-pot-green hover:text-pot-green font-bold text-sm transition"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
              <div className="text-3xl mb-2">🌱</div>
              <p className="text-white font-semibold mb-1">No public pots yet</p>
              <p className="text-pot-muted text-sm mb-4">Be first — create one in 30 seconds.</p>
              <Link
                href="/create"
                className="inline-block px-4 py-2 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-sm transition"
              >
                + {t('Create Vault')}
              </Link>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherVaults.map((p: any) => {
              const analytics = analyticsMap[p.pubkey]
              return (
                <Link
                  key={p.pubkey}
                  href={`/pots/${p.pubkey}`}
                  className="bg-pot-card border border-pot-border hover:border-pot-green/40 rounded-2xl p-4 transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg hover:shadow-pot-green/10"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl shrink-0 group-hover:animate-float">{p.emoji ?? '🪴'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold truncate group-hover:text-pot-green transition">
                          {p.name ?? 'Unnamed pot'}
                        </p>
                        {p.trustLevel && p.trustLevel !== 'unverified' && (
                          <TrustBadge level={p.trustLevel} verifiedBy={p.verifiedBy} showLabel={false} onClick={openVerified} />
                        )}
                      </div>
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

      <VerifiedModal isOpen={verifiedOpen} onClose={() => setVerifiedOpen(false)} />
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
