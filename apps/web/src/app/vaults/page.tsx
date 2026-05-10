'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePots } from '@/hooks/usePots'
import { useSolPrice } from '@/lib/prices'
import { useVaultAnalyticsBatch } from '@/hooks/useAnalytics'

export default function VaultsPage() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'tvl' | 'members' | 'recent'>('tvl')

  const { data: pots = [], isLoading: potsLoading } = usePots()
  const { price: solPrice } = useSolPrice()

  const livePubkeys = useMemo(() => pots.map((p: any) => p.pubkey), [pots])
  const { dataMap: analyticsMap } = useVaultAnalyticsBatch(livePubkeys)

  const otherVaults = useMemo(() => {
    return pots
      .filter((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()) ||
                          p.pubkey.toLowerCase().includes(search.toLowerCase()))
      .sort((a: any, b: any) => {
        if (sortBy === 'tvl')     return (b.balance ?? 0) - (a.balance ?? 0)
        if (sortBy === 'members') return (b.memberCount ?? 0) - (a.memberCount ?? 0)
        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      })
  }, [pots, search, sortBy])

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

      {/* ════════════════════ PUBLIC VAULTS ════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-4 pb-12">
        <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Public vaults</h2>
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
                  className="bg-pot-card border border-pot-border hover:border-pot-green/40 rounded-2xl p-4 transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg hover:shadow-pot-green/10"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl shrink-0 group-hover:animate-float">{p.emoji ?? '🪴'}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold truncate group-hover:text-pot-green transition">
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-pot-dark/60 rounded-lg px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-pot-muted">{label}</div>
      <div className="text-xs font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}
