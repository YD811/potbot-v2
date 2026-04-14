'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePots } from '@/hooks/usePots'
import { useMockStore } from '@/lib/mock-store'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

const YIELD_LABELS: Record<number, string> = {
  0: 'No Yield',
  1: '📈 Conservative',
  2: '⚖️ Balanced',
  3: '🔥 Aggressive',
  4: '⚡ JLP',
}

export default function MyPotsPage() {
  const { publicKey, connected } = useWallet()
  const { data: allPots, isLoading } = usePots()
  const walletStr = publicKey?.toBase58() ?? ''

  // Get all member records for connected wallet from mock store
  const allMembers = useMockStore.getState().members
  const myMemberships = allMembers.filter((m) => m.wallet === walletStr)
  const myPotPubkeys = new Set(myMemberships.map((m) => m.potPubkey))

  // Filter pots: member OR creator
  const myPots = (allPots ?? []).filter(
    (p: any) => myPotPubkeys.has(p.pubkey) || p.authority === walletStr
  )

  // Portfolio totals
  const totalBalance = myPots.reduce((s: number, p: any) => s + (p.balance ?? 0), 0)
  const totalYield   = myPots.reduce((s: number, p: any) => s + ((p as any).totalYieldEarned ?? 0), 0)
  const totalVolume  = myPots.reduce((s: number, p: any) => s + ((p as any).totalVolume ?? 0), 0)
  const totalShares  = myMemberships.reduce((s, m) => s + m.shares, 0)

  /* ── Not connected ── */
  if (!connected) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 space-y-6">
        <div className="text-7xl">🔐</div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My POTs</h1>
          <p className="text-pot-muted text-base">Connect your Solana wallet to see and manage your group trading vaults</p>
        </div>
        <WalletMultiButton className="!bg-pot-accent !rounded-2xl !text-base !h-12 !px-8 !font-semibold mx-auto" />
        <p className="text-pot-muted/50 text-xs">Supports Phantom · Solflare</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">My POTs</h1>
          <p className="text-pot-muted text-sm mt-0.5 font-mono">
            {walletStr.slice(0, 6)}...{walletStr.slice(-6)}
          </p>
        </div>
        <Link href="/create" className="btn-primary text-sm">
          + New POT
        </Link>
      </div>

      {/* ── Portfolio Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Balance',  value: `${totalBalance.toFixed(3)} SOL`, icon: '◎',  color: 'text-pot-green'  },
          { label: 'My POTs',        value: String(myPots.length),             icon: '🪴', color: 'text-white'       },
          { label: 'Yield Earned',   value: `${totalYield.toFixed(4)} SOL`,    icon: '🌱', color: 'text-teal-400'   },
          { label: 'Total Shares',   value: totalShares.toLocaleString(),      icon: '🪙', color: 'text-pot-accent'  },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl mb-1.5">{icon}</div>
            <div className={`font-bold font-mono text-lg ${color}`}>{value}</div>
            <div className="text-xs text-pot-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Pots List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-pot-card rounded-2xl animate-pulse border border-pot-border" />
          ))}
        </div>
      ) : myPots.length === 0 ? (
        <div className="card p-14 text-center border-2 border-dashed border-pot-border">
          <div className="text-5xl mb-4">🪴</div>
          <h2 className="text-xl font-semibold text-white mb-2">No POTs yet</h2>
          <p className="text-pot-muted text-sm mb-6">Create your first group vault or deposit into an existing one</p>
          <div className="flex gap-3 justify-center">
            <Link href="/create" className="btn-primary text-sm">Create POT</Link>
            <Link href="/" className="btn-secondary text-sm">Browse All</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {myPots.map((pot: any) => {
            const membership = myMemberships.find((m) => m.potPubkey === pot.pubkey)
            const isCreator = pot.authority === walletStr
            const sharesPct = pot.totalShares > 0 && membership
              ? (membership.shares / pot.totalShares) * 100
              : 0
            const navGrowth = pot.navPerShareBps
              ? ((pot.navPerShareBps / 10000) - 1) * 100
              : 0
            const tama = calculateTamaStats({
              tradeVolume: (pot.totalVolume ?? pot.tradeCount * 2),
              memberCount: pot.memberCount,
              winRate: 0.6,
              yieldApy: 0.08,
              ageSeconds: (Date.now() - pot.createdAt) / 1000,
            })

            return (
              <div
                key={pot.pubkey}
                className="card p-5 border border-pot-border hover:border-pot-accent/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">

                  {/* Left */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Emoji + tamagotchi */}
                    <div className="relative shrink-0 mt-0.5">
                      <span className="text-3xl">{pot.emoji}</span>
                      <span className="absolute -bottom-1 -right-1 text-sm">{tama.emoji}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-white text-base truncate">{pot.name}</h3>
                        {isCreator && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            👑 Creator
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          pot.isPublic ? 'bg-pot-green/10 text-pot-green' : 'bg-pot-accent/10 text-pot-accent'
                        }`}>
                          {pot.isPublic ? 'Public' : 'Private'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pot-dark text-pot-muted shrink-0">
                          {YIELD_LABELS[pot.yieldStrategy] ?? 'Yield'}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-4 text-xs text-pot-muted">
                        <span>
                          Balance:{' '}
                          <span className="text-pot-green font-mono font-semibold">{pot.balance.toFixed(3)} SOL</span>
                        </span>
                        {membership && (
                          <span>
                            My shares:{' '}
                            <span className="text-white font-mono">
                              {membership.shares.toLocaleString()}{' '}
                              <span className="text-pot-muted">({sharesPct.toFixed(1)}%)</span>
                            </span>
                          </span>
                        )}
                        {(pot.totalYieldEarned ?? 0) > 0 && (
                          <span>
                            Yield:{' '}
                            <span className="text-teal-400 font-mono">+{(pot.totalYieldEarned ?? 0).toFixed(4)} SOL</span>
                          </span>
                        )}
                        <span>
                          {pot.memberCount} member{pot.memberCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: NAV + button */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {navGrowth !== 0 && (
                      <div className="text-right">
                        <div className={`text-sm font-mono font-bold ${
                          navGrowth >= 0 ? 'text-pot-green' : 'text-red-400'
                        }`}>
                          {navGrowth >= 0 ? '+' : ''}{navGrowth.toFixed(2)}%
                        </div>
                        <div className="text-[10px] text-pot-muted">NAV/share</div>
                      </div>
                    )}
                    <Link
                      href={`/pots/${pot.pubkey}`}
                      className="btn-primary text-xs px-4 py-2 whitespace-nowrap group-hover:shadow-lg group-hover:shadow-pot-accent/20 transition-all"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>

                {/* Ownership progress bar */}
                {membership && pot.totalShares > 0 && (
                  <div className="mt-4 pt-3 border-t border-pot-border">
                    <div className="flex justify-between text-[10px] text-pot-muted mb-1.5">
                      <span>My ownership in pool</span>
                      <span className="font-mono">{sharesPct.toFixed(2)}%</span>
                    </div>
                    <div className="h-1.5 bg-pot-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pot-accent to-pot-green rounded-full transition-all"
                        style={{ width: `${Math.min(100, sharesPct)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Quick links ── */}
      <div className="flex gap-3 pt-2">
        <Link href="/" className="text-sm text-pot-muted hover:text-white transition">
          ← All POTs
        </Link>
        <Link href="/leaderboard" className="text-sm text-pot-muted hover:text-white transition">
          🏆 Leaderboard
        </Link>
      </div>
    </div>
  )
}
