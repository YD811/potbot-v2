'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { usePots } from '@/hooks/usePots'
import { useMockStore } from '@/lib/mock-store'
import { useSolPrice } from '@/lib/prices'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'
import { useHumanText } from '@/hooks/useHumanText'
import { useActiveWallet } from '@/hooks/useActiveWallet'
import { ConnectButton } from '@/components/ConnectButton'
import { SolPrice } from '@/components/SolPrice'
import { AddSolModal } from '@/components/AddSolModal'
import { JupiterSwapPanel } from '@/components/JupiterSwapPanel'

const QUEST_PLACEHOLDER = [
  {
    id: 'q1',
    icon: '🐦',
    title: 'Share on Twitter',
    desc: 'Tweet about your pot with #PotBotSeason1',
    points: 100,
    done: false,
  },
  {
    id: 'q2',
    icon: '👥',
    title: 'Invite 3 Members',
    desc: 'Refer 3 users who each deposit ≥ 0.1 SOL',
    points: 500,
    done: false,
  },
  {
    id: 'q3',
    icon: '🗳️',
    title: 'Active Voter',
    desc: 'Vote on 10 proposals across different pots',
    points: 150,
    done: false,
  },
  {
    id: 'q4',
    icon: '🔒',
    title: 'Private Pot Creator',
    desc: 'Create your first private pot',
    points: 300,
    done: false,
  },
]

const POINTS_ACTIONS = [
  { action: 'Create a pot',                    points: 100 },
  { action: 'First deposit (any pot)',          points: 50  },
  { action: 'Vote on a proposal',              points: 5   },
  { action: 'Create a passing proposal',       points: 25  },
  { action: 'Refer a user who deposits ≥0.1 SOL', points: 200 },
  { action: 'Member joins a pot you created',  points: 20  },
  { action: 'Pot reaches 10 members',          points: 500 },
  { action: 'Daily check-in',                  points: 1   },
]

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-5 bg-pot-border rounded w-1/2 mb-3" />
      <div className="h-4 bg-pot-border rounded w-3/4 mb-2" />
      <div className="h-4 bg-pot-border rounded w-1/3" />
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={`card p-4 text-center ${accent ? 'glow-green border-pot-green/20' : ''}`}>
      <div className={`text-2xl font-bold ${accent ? 'text-pot-green' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] text-pot-muted font-mono">{sub}</div>}
      <div className="text-xs text-pot-muted mt-1">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const t = useHumanText()
  const wallet = useActiveWallet()
  const { connection } = useConnection()
  const { data: allPots, isLoading } = usePots()
  const { price: solPrice } = useSolPrice()
  const walletStr = wallet.address ?? ''
  const connected = wallet.isConnected
  const [questTab, setQuestTab] = useState<'active' | 'points'>('active')
  const [showAddSol, setShowAddSol] = useState(false)

  /* ── Live wallet SOL balance (signed in only) ── */
  const [walletSol, setWalletSol] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!walletStr) { setWalletSol(null); return }
    let pk: PublicKey
    try { pk = new PublicKey(walletStr) } catch { return }
    connection.getBalance(pk).then((lamports) => {
      if (!cancelled) setWalletSol(lamports / LAMPORTS_PER_SOL)
    }).catch(() => { if (!cancelled) setWalletSol(0) })
    return () => { cancelled = true }
  }, [connection, walletStr])

  /* ── My pots ── */
  const allMembers = useMockStore.getState().members
  const myMemberships = useMemo(
    () => allMembers.filter((m) => m.wallet === walletStr),
    [allMembers, walletStr]
  )
  const myPotPubkeys = useMemo(
    () => new Set(myMemberships.map((m) => m.potPubkey)),
    [myMemberships]
  )
  const myPots = useMemo(
    () => (allPots ?? []).filter((p: any) => myPotPubkeys.has(p.pubkey) || p.authority === walletStr),
    [allPots, myPotPubkeys, walletStr]
  )

  /* ── Portfolio totals ── */
  const totalSol = myPots.reduce((s: number, p: any) => s + (p.balance ?? 0), 0)
  const totalUsd = solPrice ? totalSol * solPrice : 0

  /* ── Referrals ── */
  const referrals = useMockStore.getState().referrals ?? []
  const myReferrals = referrals.filter((r: any) => r.referrer === walletStr)
  const referralFees = myReferrals.reduce((s: number, r: any) => s + (r.level1Earning ?? 0), 0)

  /* ── Pending proposals ── */
  const allProposals = useMockStore.getState().proposals ?? []
  const pending = allProposals.filter(
    (p: any) =>
      p.status === 'active' &&
      myPotPubkeys.has(p.potPubkey) &&
      !(p.voters ?? []).includes(walletStr)
  )

  /* ── Tamagotchi emoji for each pot ── */
  function potTama(pot: any) {
    const stats = calculateTamaStats({
      tradeVolume: (pot.totalVolume ?? 0) * (solPrice ?? 100),
      memberCount: pot.memberCount ?? 1,
      winRate: 0.5,
      yieldApy: 0,
      ageSeconds: (Date.now() - (pot.createdAt ?? Date.now())) / 1000,
    })
    return stats.emoji
  }

  /* ── Aggregate user analytics across mock-store memberships ── */
  const totalDepositedSol = myMemberships.reduce(
    (s: number, m: any) => s + (m.depositTotal ?? 0),
    0,
  )
  const totalWithdrawnSol = myMemberships.reduce(
    (s: number, m: any) => s + (m.withdrawTotal ?? 0),
    0,
  )
  const realisedPnlSol = totalWithdrawnSol - totalDepositedSol

  /* ── Not connected ── */
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">🪴</div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('My Dashboard')}</h1>
        <p className="text-pot-muted mb-6 max-w-sm">
          Sign in to see your pots, balance, votes you owe and your activity.
        </p>
        <ConnectButton />
      </div>
    )
  }

  const sourceLabel = wallet.source === 'privy' ? 'Email account' : 'Wallet'

  return (
    <div>
      {/* ── Profile header ─────────────────────────────────────────── */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-pot-card to-pot-dark border-pot-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar — first letter of label, gradient bg */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-pot-dark shrink-0"
              style={{ background: 'linear-gradient(135deg,#14F195 0%,#9945FF 100%)' }}
              aria-hidden
            >
              {(wallet.label || '🪴').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-white truncate">{t('My Dashboard')}</h1>
              <div className="text-sm text-white truncate">{wallet.label}</div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-pot-muted">
                <span className="px-1.5 py-0.5 rounded bg-pot-border/40 uppercase tracking-wider font-bold">
                  {sourceLabel}
                </span>
                <span className="font-mono truncate">
                  {walletStr ? `${walletStr.slice(0, 6)}…${walletStr.slice(-6)}` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {pending.length > 0 && (
              <Link
                href="#pending-votes"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium animate-pulse"
              >
                🗳️ {pending.length} {t('Vote')}{pending.length !== 1 ? 's' : ''} pending
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowAddSol(true)}
              disabled={!walletStr}
              className="px-4 py-2 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + {t('Deposit')}
            </button>
          </div>
        </div>

        {/* ── Balance + analytics row ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <StatCard
            label={t('Wallet')}
            value={walletSol == null
              ? '—'
              : <SolPrice sol={walletSol} compact />}
          />
          <StatCard
            label="In pots"
            value={<SolPrice sol={totalSol} compact />}
            accent
          />
          <StatCard
            label={`Active ${t('Vaults')}`}
            value={String(myPots.length)}
          />
          <StatCard
            label={t('PnL')}
            value={
              <span className={realisedPnlSol >= 0 ? 'text-pot-green' : 'text-red-400'}>
                {realisedPnlSol >= 0 ? '+' : ''}<SolPrice sol={realisedPnlSol} compact />
              </span>
            }
            sub={`${totalDepositedSol.toFixed(2)} SOL deposited`}
          />
        </div>
      </div>

      {/* ── Quick swap (personal wallet) ───────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-white">⚡ Quick {t('Swap')}</h2>
          <span className="text-[11px] text-pot-muted">
            Trade between tokens straight from your wallet via Jupiter
          </span>
        </div>
        <JupiterSwapPanel mode="personal" />
      </section>

      {/* ── My POTs ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">My POTs</h2>
          <Link href="/my-pots" className="text-xs text-pot-muted hover:text-white transition">
            Full view →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : myPots.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-2">🌱</div>
            <h3 className="text-base font-semibold text-white mb-1">No POTs yet</h3>
            <p className="text-sm text-pot-muted mb-4">Join an existing vault or create your own.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/leaderboard" className="btn-secondary text-sm py-2">Browse Pots</Link>
              <Link href="/create" className="btn-primary text-sm py-2">Create POT</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPots.map((pot: any) => {
              const membership = myMemberships.find((m) => m.potPubkey === pot.pubkey)
              const sharePct = pot.totalShares > 0 && membership
                ? (membership.shares / pot.totalShares) * 100
                : 0
              const myValueSol = pot.balance * (sharePct / 100)
              const myValueUsd = solPrice ? myValueSol * solPrice : 0
              return (
                <Link
                  key={pot.pubkey}
                  href={`/pots/${pot.pubkey}`}
                  className="card p-4 hover:border-pot-green/30 transition group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl group-hover:animate-float">{pot.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold text-white">{pot.name}</div>
                        <div className="text-[10px] text-pot-muted font-mono">
                          {pot.pubkey.slice(0, 4)}…{pot.pubkey.slice(-4)}
                        </div>
                      </div>
                    </div>
                    <span className="text-lg">{potTama(pot)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-pot-dark rounded-lg p-2">
                      <div className="text-pot-green font-bold">
                        {myValueUsd > 0 ? `$${myValueUsd.toFixed(2)}` : `${myValueSol.toFixed(3)} SOL`}
                      </div>
                      <div className="text-pot-muted">My Value</div>
                    </div>
                    <div className="bg-pot-dark rounded-lg p-2">
                      <div className="text-white font-bold">{sharePct.toFixed(1)}%</div>
                      <div className="text-pot-muted">My Share</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      pot.isPublic ? 'bg-pot-green/10 text-pot-green' : 'bg-pot-accent/10 text-pot-accent'
                    }`}>
                      {pot.isPublic ? 'Public' : 'Private'}
                    </span>
                    <span className="text-[10px] text-pot-muted">{pot.memberCount} members</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Pending Votes ─────────────────────────────────────────── */}
      {pending.length > 0 && (
        <section id="pending-votes" className="mb-8 scroll-mt-24">
          <h2 className="text-lg font-bold text-white mb-4">⏳ Pending {t('Vote')}s</h2>
          <div className="space-y-2">
            {pending.map((p: any) => {
              const pot = (allPots ?? []).find((pot: any) => pot.pubkey === p.potPubkey) as any
              const hoursLeft = p.createdAt
                ? Math.max(0, 24 - (Date.now() - p.createdAt) / 3_600_000)
                : 24
              return (
                <Link
                  key={p.pubkey}
                  href={`/pots/${p.potPubkey}?tab=proposals`}
                  className="card p-4 flex items-center justify-between gap-4 hover:border-amber-500/30 transition"
                >
                  <div>
                    <div className="text-sm text-white font-medium">{p.description}</div>
                    <div className="text-xs text-pot-muted mt-0.5">
                      {pot?.name ?? p.potPubkey.slice(0, 8)} · {hoursLeft.toFixed(0)}h remaining
                    </div>
                  </div>
                  <span className="shrink-0 text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Vote →
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Quests & Points ───────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setQuestTab('active')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              questTab === 'active' ? 'bg-pot-card border border-pot-border text-white' : 'text-pot-muted hover:text-white'
            }`}
          >
            🎯 Active Quests
          </button>
          <button
            onClick={() => setQuestTab('points')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              questTab === 'points' ? 'bg-pot-card border border-pot-border text-white' : 'text-pot-muted hover:text-white'
            }`}
          >
            ⭐ Points Table
          </button>
        </div>

        {questTab === 'active' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUEST_PLACEHOLDER.map((q) => (
              <div
                key={q.id}
                className="card p-4 flex items-start gap-3 opacity-90"
              >
                <div className="text-2xl shrink-0">{q.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{q.title}</div>
                  <div className="text-xs text-pot-muted mt-0.5">{q.desc}</div>
                  <div className="text-xs text-pot-green font-bold mt-1.5">+{q.points} pts</div>
                </div>
                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-pot-card border border-pot-border text-pot-muted">
                  Soon
                </span>
              </div>
            ))}
          </div>
        )}

        {questTab === 'points' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pot-border">
                  <th className="text-left px-4 py-3 text-pot-muted font-medium text-xs">Action</th>
                  <th className="text-right px-4 py-3 text-pot-muted font-medium text-xs">Points</th>
                </tr>
              </thead>
              <tbody>
                {POINTS_ACTIONS.map((row, i) => (
                  <tr key={i} className="border-b border-pot-border/50 last:border-0 hover:bg-pot-card/50">
                    <td className="px-4 py-3 text-gray-300">{row.action}</td>
                    <td className="px-4 py-3 text-right text-pot-green font-bold">+{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Referrals ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">🔗 Referrals</h2>
        <div className="card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{myReferrals.length}</div>
              <div className="text-xs text-pot-muted">Referred Users</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-pot-green">
                {referralFees.toFixed(3)} SOL
              </div>
              <div className="text-xs text-pot-muted">Fees Earned</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">20%</div>
              <div className="text-xs text-pot-muted">Your Cut</div>
            </div>
          </div>

          {walletStr && (
            <div>
              <div className="text-xs text-pot-muted mb-1.5">Your referral link</div>
              <div className="flex gap-2">
                <div className="flex-1 bg-pot-dark border border-pot-border rounded-xl px-3 py-2 text-xs font-mono text-pot-muted truncate">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://potbot.fun'}/pots/[pot]?ref={walletStr.slice(0, 8)}…
                </div>
                <button
                  onClick={() => {
                    const base = typeof window !== 'undefined' ? window.location.origin : 'https://potbot.fun'
                    navigator.clipboard.writeText(`${base}?ref=${walletStr}`)
                  }}
                  className="btn-secondary text-xs py-2 px-4 shrink-0"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-pot-muted mt-2">
                Earn 20% of all swap fees from users you refer, paid instantly to your wallet.
              </p>
            </div>
          )}
        </div>
      </section>

      <AddSolModal
        address={walletStr}
        open={showAddSol}
        onClose={() => setShowAddSol(false)}
      />
    </div>
  )
}
