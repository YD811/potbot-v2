'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { VoiceButton } from '@/components/voice/VoiceButton'
import { TamagotchiAvatar } from '@/components/tamagotchi/TamagotchiAvatar'
import { GovernanceBadge } from '@/components/governance/GovernanceBadge'
import { Badge } from '@potbot/ui'
import { ProgressBar } from '@potbot/ui'
import { Spinner } from '@potbot/ui'
import type { PotAccount, Proposal } from '@/types/pot'

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'swap' | 'governance' | 'members' | 'duels'

// ── Mock data ─────────────────────────────────────────────────────────────────
// TODO: replace with real on-chain fetch via SDK
const MOCK_POT: PotAccount & {
  solBalance: number
  portfolioItems: { symbol: string; amount: number; valueUsd: number; pct: number }[]
  history: { ts: number; valueUsd: number }[]
} = {
  pubkey: 'pot1111111111111111111111111111111111111111',
  name: 'Alpha Fund',
  emoji: '🐤',
  members: 12,
  totalValueUsd: 48750,
  pnlPct: 18.3,
  tamagotchiLevel: 3,
  governanceLevel: 2,
  yieldStrategy: 'balanced',
  isOwner: true,
  solBalance: 152.4,
  portfolioItems: [
    { symbol: 'SOL',  amount: 152.4,  valueUsd: 28_956, pct: 59.4 },
    { symbol: 'JUP',  amount: 9420,   valueUsd: 11_304, pct: 23.2 },
    { symbol: 'BONK', amount: 4.2e7,  valueUsd: 5_040,  pct: 10.3 },
    { symbol: 'WIF',  amount: 1_840,  valueUsd: 3_450,  pct:  7.1 },
  ],
  history: Array.from({ length: 30 }, (_, i) => ({
    ts: Date.now() - (29 - i) * 86400_000,
    valueUsd: 41_000 + Math.sin(i / 4) * 3_000 + i * 280,
  })),
}

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop1',
    pot: MOCK_POT.pubkey,
    proposer: 'user1111111111111111111111111111111111111',
    action: 'Swap 20 SOL → JUP (slippage 0.5%)',
    description: 'JUP just broke ATH resistance. Let\'s ride the momentum.',
    votesFor: 7,
    votesAgainst: 2,
    status: 'active',
    createdAt: Date.now() - 3 * 3600_000,
    expiresAt: Date.now() + 21 * 3600_000,
  },
  {
    id: 'prop2',
    pot: MOCK_POT.pubkey,
    proposer: 'user2222222222222222222222222222222222222',
    action: 'Switch yield strategy → Aggressive',
    description: 'Kamino yields are down. Move to Drift perp vaults for higher APY.',
    votesFor: 5,
    votesAgainst: 5,
    status: 'active',
    createdAt: Date.now() - 12 * 3600_000,
    expiresAt: Date.now() + 12 * 3600_000,
  },
  {
    id: 'prop3',
    pot: MOCK_POT.pubkey,
    proposer: 'user3333333333333333333333333333333333333',
    action: 'Swap 50 SOL → WIF',
    description: 'WIF memecoin play. Quick in-and-out.',
    votesFor: 9,
    votesAgainst: 1,
    status: 'passed',
    createdAt: Date.now() - 48 * 3600_000,
    expiresAt: Date.now() - 24 * 3600_000,
  },
]

const MOCK_MEMBERS = [
  { wallet: 'EhYXq3...9kMz', shares: 2_400, pct: 20, isOwner: true },
  { wallet: 'BnT7kQ...2pLv', shares: 1_800, pct: 15, isOwner: false },
  { wallet: 'mfXQ9d...8wYa', shares: 1_440, pct: 12, isOwner: false },
  { wallet: 'Hq7VnX...4tKr', shares: 1_200, pct: 10, isOwner: false },
  { wallet: 'pBK3mW...1qZs', shares: 960,   pct: 8,  isOwner: false },
]

// ── SwapPanel ─────────────────────────────────────────────────────────────────
function SwapPanel() {
  const [fromToken, setFromToken] = useState('SOL')
  const [toToken, setToToken]     = useState('JUP')
  const [amount, setAmount]       = useState('')
  const [slippage, setSlippage]   = useState('0.5')
  const [loading, setLoading]     = useState(false)
  const [needsVote, setNeedsVote] = useState(false)

  const TOKENS = ['SOL', 'JUP', 'BONK', 'WIF', 'USDC', 'PYTH']

  async function handleSwap() {
    setLoading(true)
    // Governance level 2 → needs majority vote
    await new Promise(r => setTimeout(r, 800))
    setNeedsVote(true)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {needsVote ? (
        <div className="card p-5 border-yellow-400/30 bg-yellow-400/5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🗳️</span>
            <div>
              <div className="font-semibold text-yellow-400 mb-1">Governance vote required</div>
              <p className="text-sm text-gray-400">
                This POT uses L2 Majority governance for trades. A proposal has been created —
                members need to vote before the swap executes.
              </p>
              <button
                className="mt-3 text-xs text-[#9945FF] hover:underline"
                onClick={() => setNeedsVote(false)}
              >
                View proposal →
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card p-5 space-y-4">
        <h3 className="font-display font-bold">Execute Swap</h3>

        {/* From */}
        <div className="bg-[#0D1117] border border-[#1A2332] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">From</span>
            <span className="text-xs text-gray-400">Balance: {MOCK_POT.solBalance} SOL</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-xl font-bold text-white outline-none"
            />
            <select
              value={fromToken}
              onChange={e => setFromToken(e.target.value)}
              className="bg-[#1A2332] text-white text-sm rounded-lg px-3 py-1.5 border-none outline-none"
            >
              {TOKENS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Swap arrow */}
        <div className="flex justify-center">
          <button
            onClick={() => { const t = fromToken; setFromToken(toToken); setToToken(t) }}
            className="w-8 h-8 rounded-full bg-[#1A2332] hover:bg-[#243044] flex items-center justify-center text-gray-400 transition-colors"
          >
            ⇅
          </button>
        </div>

        {/* To */}
        <div className="bg-[#0D1117] border border-[#1A2332] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">To (estimated)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-xl font-bold text-gray-400">
              {amount ? (parseFloat(amount) * 1.24).toFixed(2) : '0.00'}
            </div>
            <select
              value={toToken}
              onChange={e => setToToken(e.target.value)}
              className="bg-[#1A2332] text-white text-sm rounded-lg px-3 py-1.5 border-none outline-none"
            >
              {TOKENS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Slippage */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Slippage tolerance</span>
          <div className="flex gap-1">
            {['0.1', '0.5', '1.0'].map(s => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  slippage === s ? 'bg-[#9945FF]/30 text-[#9945FF]' : 'bg-[#1A2332] text-gray-400'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* Route via Jupiter */}
        {amount && (
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>Route: Jupiter v6</span>
            <span>·</span>
            <span>Price impact: ~0.12%</span>
          </div>
        )}

        <button
          onClick={handleSwap}
          disabled={!amount || loading}
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner size="sm" /> Routing…</> : `Swap ${fromToken} → ${toToken}`}
        </button>
      </div>
    </div>
  )
}

// ── GovernancePanel ───────────────────────────────────────────────────────────
function GovernancePanel({ potPubkey }: { potPubkey: string }) {
  const [proposals, setProposals] = useState(MOCK_PROPOSALS)
  const [voted, setVoted] = useState<Record<string, boolean>>({})

  function castVote(proposalId: string, approve: boolean) {
    setVoted(v => ({ ...v, [proposalId]: true }))
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p
      const updated = {
        ...p,
        votesFor:     approve ? p.votesFor + 1 : p.votesFor,
        votesAgainst: approve ? p.votesAgainst : p.votesAgainst + 1,
      }
      const total = updated.votesFor + updated.votesAgainst
      // Auto-resolve at quorum (12 members, need 7 for 51%)
      if (total >= 7 && updated.votesFor > updated.votesAgainst) {
        return { ...updated, status: 'passed' as const }
      }
      return updated
    }))
  }

  const active = proposals.filter(p => p.status === 'active')
  const past   = proposals.filter(p => p.status !== 'active')

  return (
    <div className="space-y-4">
      {/* Active proposals */}
      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Active Proposals</h3>
          <div className="space-y-3">
            {active.map(p => {
              const total = p.votesFor + p.votesAgainst
              const forPct = total > 0 ? (p.votesFor / total) * 100 : 0
              const timeLeft = Math.max(0, p.expiresAt - Date.now())
              const hoursLeft = Math.floor(timeLeft / 3_600_000)
              const hasVoted = voted[p.id]

              return (
                <div key={p.id} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{p.action}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.description}</div>
                    </div>
                    <Badge color="yellow" className="shrink-0">{hoursLeft}h left</Badge>
                  </div>

                  <ProgressBar
                    value={forPct}
                    color={forPct >= 51 ? 'green' : 'purple'}
                    label={`${p.votesFor} for · ${p.votesAgainst} against`}
                  />

                  {!hasVoted ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => castVote(p.id, true)}
                        className="flex-1 py-2 text-sm font-semibold rounded-xl bg-[#14F195]/10 text-[#14F195] hover:bg-[#14F195]/20 transition-colors"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => castVote(p.id, false)}
                        className="flex-1 py-2 text-sm font-semibold rounded-xl bg-[#FF4545]/10 text-[#FF4545] hover:bg-[#FF4545]/20 transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-center text-gray-500">Vote cast ✓</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Past proposals */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Past Proposals</h3>
          <div className="space-y-2">
            {past.map(p => (
              <div key={p.id} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{p.action}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {p.votesFor} for · {p.votesAgainst} against
                  </div>
                </div>
                <Badge color={p.status === 'passed' ? 'green' : 'red'}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PotDetailPage() {
  const { pubkey } = useParams<{ pubkey: string }>()
  const { connected } = useWallet()
  const [tab, setTab] = useState<Tab>('overview')

  const pot = MOCK_POT // TODO: fetch from chain
  const xpForNextLevel = [100, 500, 2000, 8000, 20000]
  const currentXp = 2_340
  const nextThreshold = xpForNextLevel[Math.min(pot.tamagotchiLevel, 4)]
  const prevThreshold = xpForNextLevel[Math.max(0, pot.tamagotchiLevel - 1)] ?? 0
  const xpPct = ((currentXp - prevThreshold) / (nextThreshold - prevThreshold)) * 100

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',    label: 'Overview',    icon: '📊' },
    { id: 'swap',        label: 'Trade',       icon: '⚡' },
    { id: 'governance',  label: 'Governance',  icon: '🗳️' },
    { id: 'members',     label: 'Members',     icon: '👥' },
    { id: 'duels',       label: 'Duels',       icon: '⚔️' },
  ]

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
              ← Dashboard
            </Link>
            <span className="text-gray-600">/</span>
            <span className="font-display font-bold">{pot.emoji} {pot.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <VoiceButton />
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* POT Hero */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Tamagotchi */}
            <div className="flex flex-col items-center gap-2 md:w-32 shrink-0">
              <TamagotchiAvatar emoji={pot.emoji} level={pot.tamagotchiLevel} size="lg" />
              <div className="text-center">
                <div className="text-xs text-gray-400">Lv {pot.tamagotchiLevel} · {currentXp.toLocaleString()} XP</div>
                <ProgressBar value={xpPct} color="purple" className="mt-1 w-24" />
              </div>
            </div>

            {/* Core stats */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Total Value</div>
                <div className="text-2xl font-bold">${pot.totalValueUsd.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">P&L</div>
                <div className={`text-2xl font-bold ${pot.pnlPct >= 0 ? 'text-[#14F195]' : 'text-[#FF4545]'}`}>
                  {pot.pnlPct >= 0 ? '+' : ''}{pot.pnlPct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Members</div>
                <div className="text-2xl font-bold">{pot.members}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Governance</div>
                <div className="flex items-center gap-2 mt-1">
                  <GovernanceBadge level={pot.governanceLevel} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex md:flex-col gap-2 shrink-0">
              <button className="btn-primary text-sm">+ Deposit</button>
              <button className="text-sm px-4 py-2 rounded-xl border border-[#1A2332] hover:border-[#9945FF] text-gray-400 hover:text-white transition-all">
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#0D1117] p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-[#1A2332] text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={tab === 'overview' ? 'lg:col-span-2' : 'lg:col-span-2'}>
            {tab === 'overview' && (
              <div className="space-y-4">
                {/* Portfolio breakdown */}
                <div className="card p-5">
                  <h3 className="font-display font-bold mb-4">Portfolio</h3>
                  <div className="space-y-3">
                    {pot.portfolioItems.map(item => (
                      <div key={item.symbol} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1A2332] flex items-center justify-center text-xs font-bold">
                          {item.symbol.slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{item.symbol}</span>
                            <span className="text-gray-400">${item.valueUsd.toLocaleString()}</span>
                          </div>
                          <ProgressBar value={item.pct} color="purple" />
                        </div>
                        <div className="text-xs text-gray-500 w-10 text-right">{item.pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="card p-5">
                  <h3 className="font-display font-bold mb-4">Recent Activity</h3>
                  <div className="space-y-3 text-sm">
                    {[
                      { icon: '⚡', text: 'Swapped 50 SOL → WIF', sub: 'Proposal passed · 2d ago', color: 'text-[#14F195]' },
                      { icon: '🗳️', text: 'New proposal: Swap SOL → JUP', sub: '7/12 votes · 3h ago', color: 'text-yellow-400' },
                      { icon: '👥', text: 'New member joined', sub: 'mfXQ9d…8wYa · 1d ago', color: 'text-blue-400' },
                      { icon: '⚡', text: 'Yield harvested: 0.12 SOL', sub: 'Balanced strategy · 3d ago', color: 'text-[#14F195]' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-[#1A2332] last:border-0">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <div className={item.color}>{item.text}</div>
                          <div className="text-gray-500 text-xs">{item.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'swap' && <SwapPanel />}

            {tab === 'governance' && <GovernancePanel potPubkey={pubkey} />}

            {tab === 'members' && (
              <div className="card p-5">
                <h3 className="font-display font-bold mb-4">Members</h3>
                <div className="space-y-3">
                  {MOCK_MEMBERS.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1A2332] flex items-center justify-center text-xs font-mono">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono">{m.wallet}</span>
                          {m.isOwner && <Badge color="purple">Owner</Badge>}
                        </div>
                        <ProgressBar value={m.pct} color="purple" />
                      </div>
                      <div className="text-xs text-gray-400 w-12 text-right">{m.pct}%</div>
                    </div>
                  ))}
                </div>
                {MOCK_POT.isOwner && (
                  <button className="mt-4 w-full py-2.5 text-sm rounded-xl border border-dashed border-[#1A2332] text-gray-500 hover:border-[#9945FF] hover:text-[#9945FF] transition-all">
                    + Invite member
                  </button>
                )}
              </div>
            )}

            {tab === 'duels' && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold">POT Duels ⚔️</h3>
                  <Link
                    href="/duel"
                    className="text-xs text-[#9945FF] hover:underline"
                  >
                    View all duels →
                  </Link>
                </div>
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">⚔️</div>
                  <h4 className="font-semibold mb-1">No active duels</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Challenge another POT to a trading competition
                  </p>
                  <Link href="/duel" className="btn-primary text-sm">
                    Challenge a POT
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* SNS domain */}
            <div className="card p-4">
              <div className="text-xs text-gray-400 mb-1">SNS Domain</div>
              <div className="font-mono text-sm text-[#9945FF]">
                {pot.name.toLowerCase().replace(/\s+/g, '-')}.potbot.site
              </div>
            </div>

            {/* Yield status */}
            <div className="card p-4">
              <div className="text-xs text-gray-400 mb-2">Yield Strategy</div>
              <div className="text-sm font-semibold capitalize mb-1">{pot.yieldStrategy}</div>
              {pot.yieldStrategy !== 'none' && (
                <>
                  <div className="text-xs text-gray-400 mb-1">Deployed: 42% of vault</div>
                  <ProgressBar value={42} color="green" />
                  <div className="text-xs text-[#14F195] mt-2">⚡ +0.12 SOL earned today</div>
                </>
              )}
            </div>

            {/* Tamagotchi detail */}
            <div className="card p-4">
              <div className="text-xs text-gray-400 mb-3">Tamagotchi</div>
              <div className="text-center">
                <TamagotchiAvatar emoji={pot.emoji} level={pot.tamagotchiLevel} size="lg" />
                <div className="mt-2 text-sm font-semibold">
                  {['Egg', 'Hatchling', 'Chick', 'Trader', 'Dragon', 'Legend'][pot.tamagotchiLevel]}
                </div>
                <div className="text-xs text-gray-400">{currentXp.toLocaleString()} / {nextThreshold.toLocaleString()} XP</div>
                <ProgressBar value={xpPct} color="purple" className="mt-2" />
              </div>
            </div>

            {/* Quick stats */}
            <div className="card p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total trades</span>
                <span className="font-mono">47</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win rate</span>
                <span className="font-mono text-[#14F195]">68%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Volume</span>
                <span className="font-mono">$218k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span className="font-mono">47d ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
