'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
import { usePots } from '@/hooks/usePots'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

export default function DashboardPage() {
  const { publicKey, connected } = useWallet()
  const { data: pots, isLoading } = usePots()
  const [search, setSearch] = useState('')

  const filtered = pots?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalTvl = pots?.reduce((sum, p) => sum + p.balance, 0) ?? 0
  const totalMembers = pots?.reduce((sum, p) => sum + p.memberCount, 0) ?? 0
  const totalTrades = pots?.reduce((sum, p) => sum + p.tradeCount, 0) ?? 0

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center">
        <div className="text-7xl animate-float">🪴</div>
        <h1 className="text-4xl font-bold">
          Welcome to <span className="text-pot-green">PotBot</span>
        </h1>
        <p className="text-pot-muted text-lg max-w-md">
          Create collective trading vaults on Solana. Govern together, trade together, win together.
        </p>
        <div className="flex gap-4">
          <WalletMultiButton />
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-3xl w-full">
          <div className="card p-5 text-center">
            <div className="text-3xl mb-2">🏦</div>
            <h3 className="font-semibold text-white mb-1">Group Vaults</h3>
            <p className="text-pot-muted text-sm">Pool SOL with friends into shared trading vaults</p>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl mb-2">🗳️</div>
            <h3 className="font-semibold text-white mb-1">Governance</h3>
            <p className="text-pot-muted text-sm">Vote on trades with share-weighted governance</p>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl mb-2">🐣</div>
            <h3 className="font-semibold text-white mb-1">Tamagotchi</h3>
            <p className="text-pot-muted text-sm">Your vault evolves as it trades and grows</p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <p className="text-pot-muted text-xs self-center">
            Demo mode active — no wallet needed to explore
          </p>
          <Link href="/leaderboard" className="btn-secondary text-sm flex items-center gap-1.5">
            🏆 View Leaderboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center glow-green">
          <div className="text-2xl font-bold text-pot-green">{pots?.length ?? 0}</div>
          <div className="text-xs text-pot-muted mt-1">Active POTs</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalTvl.toFixed(1)} SOL</div>
          <div className="text-xs text-pot-muted mt-1">Total TVL</div>
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

      {/* Leaderboard teaser */}
      <Link
        href="/leaderboard"
        className="flex items-center justify-between p-4 mb-6 bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition group"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <div className="text-sm font-semibold text-white">Public Leaderboard</div>
            <div className="text-xs text-pot-muted">
              {pots?.filter((p) => p.isPublic).length ?? 0} public pots competing — see top performers
            </div>
          </div>
        </div>
        <span className="text-pot-muted text-sm group-hover:text-white transition">View →</span>
      </Link>

      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">All POTs</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search POTs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1 sm:w-64 !py-2 text-sm"
          />
          <Link href="/create" className="btn-primary text-sm whitespace-nowrap">
            + Create POT
          </Link>
        </div>
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
      ) : !filtered?.length ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🪴</div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {search ? 'No POTs found' : 'No POTs yet'}
          </h3>
          <p className="text-pot-muted text-sm mb-4">
            {search ? 'Try a different search term' : 'Create the first collective trading vault!'}
          </p>
          {!search && (
            <Link href="/create" className="btn-primary text-sm">
              Create Your First POT
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pot) => (
            <Link
              key={pot.pubkey}
              href={`/pots/${pot.pubkey}`}
              className="card p-5 hover:border-pot-green/30 transition-all group"
            >
              {/* Header */}
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

              {/* Balance */}
              <div className="text-xl font-bold text-pot-green mb-3">
                {pot.balance.toFixed(2)} SOL
              </div>

              {/* Stats */}
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
                  <div className="text-white font-medium">{pot.yieldStrategy}</div>
                  <div className="text-pot-muted">Strategy</div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex gap-2 mt-3">
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
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}