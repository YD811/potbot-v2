'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
import { usePots } from '@/hooks/usePots'
import { useMockStore } from '@/lib/mock-store'
import { useSolPrice } from '@/lib/prices'
import LandingPage from '@/components/LandingPage'
import { TrustBadge } from '@/components/TrustBadge'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

const YIELD_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Conservative',
  2: 'Balanced',
  3: 'Aggressive',
  4: 'JLP ⚡',
  5: 'Exponent PT 🔒',
  6: 'JLP Hedge 🛡️',
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet()
  const { data: pots, isLoading } = usePots()
  const { price: solPrice } = useSolPrice()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'mine'>('all')

  const walletStr = publicKey?.toBase58() ?? ''

  const myPotPubkeys = useMemo(() => {
    if (!walletStr) return new Set<string>()
    const members = useMockStore.getState().members
    const fromMembership = members
      .filter((m) => m.wallet === walletStr)
      .map((m) => m.potPubkey)
    return new Set(fromMembership)
  }, [walletStr])

  const basePots = useMemo(() => {
    if (tab === 'mine' && walletStr) {
      return (pots ?? []).filter(
        (p) => myPotPubkeys.has(p.pubkey) || p.authority === walletStr
      )
    }
    return pots ?? []
  }, [pots, tab, walletStr, myPotPubkeys])

  const filtered = useMemo(
    () => basePots.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [basePots, search]
  )

  const totalTvlSol  = pots?.reduce((sum, p) => sum + p.balance, 0) ?? 0
  const totalTvlUsd  = solPrice ? totalTvlSol * solPrice : 0
  const totalMembers = pots?.reduce((sum, p) => sum + p.memberCount, 0) ?? 0
  const totalTrades  = pots?.reduce((sum, p) => sum + p.tradeCount, 0) ?? 0

  /* ── Landing (not connected) ──
     P0.4: show flagship ONE POT read-only at the top BEFORE marketing content,
     so judges and unconnected visitors immediately see a live pot, not a "Demo Mode" banner. */
  if (!connected) {
    return <LandingPage />
  }

  /* ── Dashboard (connected) ── */
  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center glow-green">
          <div className="text-2xl font-bold text-pot-green">{pots?.length ?? 0}</div>
          <div className="text-xs text-pot-muted mt-1">Active POTs</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {totalTvlUsd > 0
              ? `$${totalTvlUsd >= 1000 ? (totalTvlUsd / 1000).toFixed(1) + 'K' : totalTvlUsd.toFixed(0)}`
              : `${totalTvlSol.toFixed(1)} SOL`}
          </div>
          <div className="text-xs text-pot-muted mt-1">
            Total TVL
            {totalTvlUsd > 0 && (
              <span className="ml-1 text-pot-border">· {totalTvlSol.toFixed(1)} SOL</span>
            )}
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalMembers}</div>
          <div className="text-xs text-pot-muted mt-1">Total Members</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalTrades}</div>
          <div className="text-xs text-pot-muted mt-1">Total Trades</div>
        </div>
      </div>

      {/* Quick links row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Link
          href="/leaderboard"
          className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="text-sm font-semibold text-white">Public Leaderboard</div>
              <div className="text-xs text-pot-muted">
                {pots?.filter((p) => p.isPublic).length ?? 0} public pots — see top performers
              </div>
            </div>
          </div>
          <span className="text-pot-muted text-sm group-hover:text-white transition">View →</span>
        </Link>

        <Link
          href="/dashboard"
          className="flex items-center justify-between p-4 bg-gradient-to-r from-pot-green/5 to-pot-accent/5 border border-pot-green/20 rounded-2xl hover:border-pot-green/40 transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <div className="text-sm font-semibold text-white">My Dashboard</div>
              <div className="text-xs text-pot-muted">Portfolio · Votes · Quests · Referrals</div>
            </div>
          </div>
          <span className="text-pot-muted text-sm group-hover:text-white transition">Open →</span>
        </Link>
      </div>

      {/* Header + Search + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">All POTs</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search POTs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1 sm:w-56 !py-2 text-sm"
          />
          <Link href="/create" className="btn-primary text-sm whitespace-nowrap">
            + Create POT
          </Link>
        </div>
      </div>

      {/* Tab row */}
      <div className="flex items-center gap-1 mb-6">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === 'all'
              ? 'bg-pot-card border border-pot-border text-white'
              : 'text-pot-muted hover:text-white'
          }`}
        >
          All POTs
          <span className="ml-1.5 text-[10px] font-mono opacity-60">{pots?.length ?? 0}</span>
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === 'mine'
              ? 'bg-pot-card border border-pot-accent/30 text-pot-accent'
              : 'text-pot-muted hover:text-white'
          }`}
        >
          My POTs
          {walletStr && (
            <span className="ml-1.5 text-[10px] font-mono opacity-60">
              {(pots ?? []).filter((p) => myPotPubkeys.has(p.pubkey) || p.authority === walletStr).length}
            </span>
          )}
        </button>
        {tab === 'mine' && (
          <Link href="/dashboard" className="ml-auto text-xs text-pot-muted hover:text-white transition">
            Full dashboard →
          </Link>
        )}
      </div>

      {/* POT Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-pot-border rounded w-1/2 mb-3" />
              <div className="h-4 bg-pot-border rounded w-3/4 mb-2" />
              <div className="h-4 bg-pot-border rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🪴</div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {search ? 'No POTs found' : tab === 'mine' ? "You haven't joined any POTs yet" : 'No POTs yet'}
          </h3>
          <p className="text-pot-muted text-sm mb-4">
            {search
              ? 'Try a different search term'
              : tab === 'mine'
              ? 'Deposit into a public vault to join, or create your own'
              : 'Create the first collective trading vault!'}
          </p>
          <div className="flex gap-3 justify-center">
            {tab === 'mine' && (
              <button onClick={() => setTab('all')} className="btn-secondary text-sm">
                Browse All
              </button>
            )}
            <Link href="/create" className="btn-primary text-sm">
              Create POT
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pot) => {
            const isMine = myPotPubkeys.has(pot.pubkey) || pot.authority === walletStr
            const balanceUsd = solPrice ? pot.balance * solPrice : 0
            return (
              <Link
                key={pot.pubkey}
                href={`/pots/${pot.pubkey}`}
                className="card p-5 hover:border-pot-green/30 transition-all group relative"
              >
                {isMine && tab === 'all' && (
                  <span className="absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded-full bg-pot-accent/10 text-pot-accent border border-pot-accent/20">
                    Mine
                  </span>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl group-hover:animate-float">{pot.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-white">{pot.name}</h3>
                      <span className="text-xs text-pot-muted font-mono">
                        {pot.pubkey.slice(0, 4)}...{pot.pubkey.slice(-4)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xl">{pot.tamagotchiEmoji}</span>
                </div>

                <div className="mb-3">
                  <div className="text-xl font-bold text-pot-green">
                    {pot.balance.toFixed(2)} SOL
                  </div>
                  {balanceUsd > 0 && (
                    <div className="text-xs text-pot-muted font-mono">
                      ≈ ${balanceUsd >= 1000 ? (balanceUsd / 1000).toFixed(1) + 'K' : balanceUsd.toFixed(0)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-pot-dark rounded-lg p-2 text-center">
                    <div className="text-white font-medium">{pot.memberCount}</div>
                    <div className="text-pot-muted">Members</div>
                  </div>
                  <div className="bg-pot-dark rounded-lg p-2 text-center">
                    <div className="text-white font-medium">{pot.tradeCount}</div>
                    <div className="text-pot-muted">Trades</div>
                  </div>
                  <div className="bg-pot-dark rounded-lg p-2 text-center">
                    <div className="text-white font-medium text-[10px] truncate">
                      {YIELD_LABELS[pot.yieldStrategy] ?? pot.yieldStrategy}
                    </div>
                    <div className="text-pot-muted">Yield</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    pot.isPublic
                      ? 'bg-pot-green/10 text-pot-green'
                      : 'bg-pot-accent/10 text-pot-accent'
                  }`}>
                    {pot.isPublic ? 'Public' : 'Private'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-pot-border text-pot-muted">
                    L{pot.governanceLevel} Gov
                  </span>
                  {(pot as any).trustLevel && (pot as any).trustLevel !== 'unverified' && (
                    <TrustBadge
                      level={(pot as any).trustLevel}
                      verifiedBy={(pot as any).verifiedBy}
                      auditUrl={(pot as any).auditUrl}
                      size="sm"
                    />
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
