'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
import { usePots } from '@/hooks/usePots'
import { useMockStore } from '@/lib/mock-store'
import { useSolPrice } from '@/lib/prices'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

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
    title: 'Bring 3 Friends',
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

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`card p-4 text-center ${accent ? 'glow-green border-pot-green/20' : ''}`}>
      <div className={`text-2xl font-bold ${accent ? 'text-pot-green' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] text-pot-muted font-mono">{sub}</div>}
      <div className="text-xs text-pot-muted mt-1">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet()
  const { data: allPots, isLoading } = usePots()
  const { price: solPrice } = useSolPrice()
  const walletStr = publicKey?.toBase58() ?? ''
  const [questTab, setQuestTab] = useState<'active' | 'points'>('active')

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

  /* ── Not connected ── */
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">🪴</div>
        <h1 className="text-2xl font-bold text-white mb-2">Your Personal Dashboard</h1>
        <p className="text-pot-muted mb-6 max-w-sm">
          Connect your wallet to see your pots, points, pending votes, and referral earnings.
        </p>
        <WalletMultiButton />
      </div>
    )
  }

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-pot-card to-pot-dark border-pot-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-pot-muted font-mono mb-1">
              {walletStr.slice(0, 6)}…{walletStr.slice(-6)}
            </div>
            <h1 className="text-2xl font-black text-white">My Dashboard</h1>
            <p className="text-pot-muted text-sm mt-0.5">
              {myPots.length} pot{myPots.length !== 1 ? 's' : ''} · Season 1 🌱
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-bold text-pot-green">
                {totalUsd > 0
                  ? `$${totalUsd >= 1000 ? (totalUsd / 1000).toFixed(1) + 'K' : totalUsd.toFixed(0)}`
                  : `${totalSol.toFixed(2)} SOL`}
              </div>
              <div className="text-xs text-pot-muted">Portfolio Value</div>
            </div>
            {pending.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium animate-pulse">
                🗳️ {pending.length} vote{pending.length !== 1 ? 's' : ''} pending
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <StatCard
            label="Total Value"
            value={totalUsd > 0 ? `$${totalUsd.toFixed(0)}` : `${totalSol.toFixed(2)} SOL`}
            accent
          />
          <StatCard label="Active POTs" value={String(myPots.length)} />
          <StatCard label="Season Points" value="—" sub="coming soon" />
          <StatCard label="Season Rank" value="—" sub="coming soon" />
        </div>
      </div>

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
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">⏳ Pending Votes</h2>
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
    </div>
  )
}
