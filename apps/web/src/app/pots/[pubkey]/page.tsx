'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  usePot,
  useMembers,
  useProposals,
  useVote,
} from '@/hooks/usePots'
import { usePotRole } from '@/hooks/usePotRole'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'
import { PnLDashboard } from '@/components/PnLDashboard'
import { SharesPanel } from '@/components/SharesPanel'
import { VaultAnalyticsStrip } from '@/components/VaultAnalyticsStrip'
import { StrategyPanel } from '@/components/StrategyPanel'
import { AIAgentPanel } from '@/components/AIAgentPanel'
import { GovernanceSettings } from '@/components/GovernanceSettings'
import { VaultTab } from '@/components/VaultTab'
import DepositPanel from '@/components/DepositPanel'
import SharesTab from '@/components/SharesTab'
import ReferralPanel from '@/components/ReferralPanel'
import { SquadsBanner } from '@/components/SquadsBanner'
import { ShareBlinkButton } from '@/components/ShareBlinkButton'
import { StrategyProposalBuilder } from '@/components/StrategyProposalBuilder'
import { PotBotAISuggestions } from '@/components/PotBotAISuggestions'
import { reverseSNS } from '@/lib/sns'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import SwapExecuteButton from '@/components/SwapExecuteButton'
import CreateProposalModal from '@/components/pot/CreateProposalModal'
import { PublicKey } from '@solana/web3.js'
import VaultPortfolio from '@/components/VaultPortfolio'
import PotNotificationFeed from '@/components/PotNotificationFeed'
import PotAnalyticsWidget from '@/components/PotAnalyticsWidget'


// SSR-safe wallet button (same pattern as Navbar)
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

/* ── Tab order (Phase 1) ──
   Primary journey: Deposit → Overview → Vault → Proposals → Tamagotchi → Shares
   Docs is a link, not a tab (leads to /docs).
   Secondary tabs keep existing power-user views (positions, strategy, governance, agent, members, referral). */
const TABS = [
  'deposit', 'overview', 'vault', 'proposals', 'tamagotchi', 'shares',
  'positions', 'analytics', 'strategy', 'governance', 'agent', 'members', 'referral',
] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  deposit:    '💰 Deposit',
  overview:   'Overview',
  vault:      '🏠 Vault',
  proposals:  '🗳️ Proposals',
  tamagotchi: '🌱 Tamagotchi',
  shares:     '🪙 Shares',
  positions:  '📊 P&L',
  analytics:  '🔎 Analytics',
  strategy:   '⚙️ Strategy',
  governance: '🏛️ Gov',
  agent:      '🤖 AI',
  members:    'Members',
  referral:   '🔗 Referral',
}

/* ── Proposal status helpers ── */
const STATUS_COLORS: Record<string, string> = {
  active:   'bg-pot-accent/20 text-pot-accent',
  passed:   'bg-pot-green/20 text-pot-green',
  rejected: 'bg-red-500/20 text-red-400',
  executed: 'bg-blue-500/20 text-blue-400',
  pending:  'bg-yellow-500/20 text-yellow-400',
}
const STATUS_LABELS: Record<string, string> = {
  active:   '⏳ Active',
  passed:   '✅ Passed',
  rejected: '❌ Rejected',
  executed: '🚀 Executed',
  pending:  '🕐 Pending',
}

/* Inline wallet gate: any block that needs a connected wallet wraps its
   content in <WalletGate>. If wallet is not connected, show CTA inline. */
function WalletGate({
  connected,
  title,
  subtitle,
  children,
}: {
  connected: boolean
  title?: string
  subtitle?: string
  children: ReactNode
}) {
  if (connected) return <>{children}</>
  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl p-8 flex flex-col items-center text-center gap-3">
      <div className="text-4xl">🔌</div>
      {title && <p className="text-white font-semibold">{title}</p>}
      {subtitle && <p className="text-pot-muted text-sm max-w-md">{subtitle}</p>}
      <div className="mt-2"><WalletMultiButtonDynamic /></div>
    </div>
  )
}

/* Metric tile — min-width sized for 8-character values (e.g. "9,999.99"),
   tabular-nums so digits don't jitter. */
function MetricTile({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'accent' }) {
  const valueClass =
    accent === 'green' ? 'text-pot-green' : accent === 'accent' ? 'text-pot-accent' : 'text-white'
  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl p-4 min-w-[132px]">
      <div className="text-xs text-pot-muted mb-1 whitespace-nowrap">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  )
}

function ProposalCard({
  proposal,
  potAddress,
  canVote,
  canExecute,
}: {
  proposal: any
  potAddress: string
  canVote: boolean
  canExecute: boolean
}) {
  const vote = useVote()
  const [expanded, setExpanded] = useState(false)
  const statusClass = STATUS_COLORS[proposal.status] ?? 'bg-pot-muted/20 text-pot-muted'
  const statusLabel = STATUS_LABELS[proposal.status] ?? proposal.status

  return (
    <div
      className="bg-pot-card border border-pot-border hover:border-pot-accent/30 rounded-2xl p-5 space-y-4 w-full transition cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
      role="button"
      aria-expanded={expanded}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-snug break-words">{proposal.description}</p>
          <p className="text-xs text-pot-muted mt-1">
            #{proposal.proposalId ?? '?'} · {new Date(proposal.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {/* Vote bars */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-pot-muted w-8">YES</span>
          <div className="flex-1 h-2 bg-pot-dark rounded-full overflow-hidden">
            <div className="h-full bg-pot-green rounded-full transition-all" style={{ width: `${proposal.yesPercent ?? 0}%` }} />
          </div>
          <span className="text-xs text-pot-green font-mono w-10 text-right">{proposal.yesPercent ?? 0}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-pot-muted w-8">NO</span>
          <div className="flex-1 h-2 bg-pot-dark rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${proposal.noPercent ?? 0}%` }} />
          </div>
          <span className="text-xs text-red-400 font-mono w-10 text-right">{proposal.noPercent ?? 0}%</span>
        </div>
      </div>

      {/* Expanded details — full description + voter count */}
      {expanded && (
        <div className="border-t border-pot-border/50 pt-3 text-xs text-pot-muted space-y-1">
          <div><span className="text-pot-muted">Pubkey:</span> <span className="font-mono text-pot-green break-all">{proposal.pubkey}</span></div>
          {proposal.totalSharesSnapshot != null && (
            <div><span className="text-pot-muted">Total shares snapshot:</span> <span className="text-white">{proposal.totalSharesSnapshot.toLocaleString()}</span></div>
          )}
          {Array.isArray(proposal.voters) && (
            <div><span className="text-pot-muted">Voters so far:</span> <span className="text-white">{proposal.voters.length}</span></div>
          )}
        </div>
      )}

      {/* Actions — Yes/No clickable for any voter (member or owner).
         Phase 2 will extend with reason input + proposal categories. */}
      {canVote && proposal.status === 'active' && (
        <div className="flex gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => vote.mutate({ potAddress, proposalAddress: proposal.pubkey, approve: true })}
            disabled={vote.isPending}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-pot-green/20 hover:bg-pot-green/40 text-pot-green border border-pot-green/30 transition disabled:opacity-50"
          >
            👍 Vote Yes
          </button>
          <button
            onClick={() => vote.mutate({ potAddress, proposalAddress: proposal.pubkey, approve: false })}
            disabled={vote.isPending}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition disabled:opacity-50"
          >
            👎 Vote No
          </button>
        </div>
      )}
      {canExecute && proposal.status === 'passed' && (
        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
          <SwapExecuteButton proposalPubkey={proposal.pubkey} potAddress={potAddress} />
        </div>
      )}
    </div>
  )
}

/* ── Tamagotchi placeholder (Phase 1: structure & CTA; real NFT mint + duels in Phase 3) ── */
const TAMA_STAGES = [
  { lvl: 1, emoji: '🌱', name: 'Seedling',   unlock: 'Starting state for every new pot' },
  { lvl: 2, emoji: '🌿', name: 'Sprout',     unlock: 'Lower protocol fees · custom emoji' },
  { lvl: 3, emoji: '🪴', name: 'Bud',        unlock: '⚔️ Duels with other public pots unlocked' },
  { lvl: 4, emoji: '🌳', name: 'Bloom',      unlock: 'NFT Strategy Shares · season prize eligibility' },
  { lvl: 5, emoji: '🌲', name: 'Mature Tree', unlock: 'Mainnet-only perks · cross-pot composability' },
] as const

function TamagotchiTab({ stats }: { stats: ReturnType<typeof calculateTamaStats> }) {
  const level = Math.max(1, Math.min(5, Math.floor(stats.hp / 20) + 1))
  const duelsUnlocked = level >= 3

  return (
    <div className="space-y-6 w-full">

      {/* ── How it works (PROMINENT — first thing the user reads) ── */}
      <div className="bg-gradient-to-br from-pot-green/5 to-pot-accent/5 border border-pot-green/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🌱</span>
          <h3 className="font-bold text-white text-lg">How the Tamagotchi works</h3>
        </div>
        <ol className="space-y-2.5 text-sm text-pot-muted leading-relaxed list-none">
          <li className="flex gap-3">
            <span className="text-pot-green font-bold shrink-0">1.</span>
            <span>Every new pot starts at <span className="text-white font-semibold">Level 1 — Seedling 🌱</span>.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-pot-green font-bold shrink-0">2.</span>
            <span>The plant grows from <span className="text-white font-semibold">member activity</span> — deposits, votes, proposals, new members. <span className="text-white font-semibold">Not from trading P&amp;L.</span></span>
          </li>
          <li className="flex gap-3">
            <span className="text-pot-green font-bold shrink-0">3.</span>
            <span><span className="text-white font-semibold">⚔️ Pot duels</span> with other public pots <span className="text-white font-semibold">unlock at Level 3 (Bud)</span>.</span>
          </li>
        </ol>
      </div>

      {/* Current level + progress */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-lg">Your pot&apos;s plant</h3>
            <p className="text-pot-muted text-sm mt-1">
              Level {level} · {TAMA_STAGES[level - 1].name} · HP {stats.hp}/100
            </p>
          </div>
          <button
            disabled
            className="px-4 py-2 rounded-xl bg-pot-green/20 text-pot-green border border-pot-green/30 text-sm font-bold cursor-not-allowed opacity-60 shrink-0"
            title="NFT mint ships at Bloom (Level 4)"
          >
            🪙 Mint NFT (Level 4+)
          </button>
        </div>
        <div className="flex items-center justify-between bg-pot-dark rounded-xl p-4">
          {TAMA_STAGES.map((s) => (
            <div key={s.lvl} className="flex flex-col items-center">
              <div
                className={`text-4xl transition ${
                  s.lvl === level ? 'scale-125' : s.lvl < level ? 'opacity-70' : 'opacity-25 grayscale'
                }`}
              >
                {s.emoji}
              </div>
              <div className={`text-[10px] mt-1 ${s.lvl === level ? 'text-pot-green font-bold' : 'text-pot-muted'}`}>
                L{s.lvl}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-pot-muted mb-1">
            <span>Progress to Level {Math.min(level + 1, 5)} ({TAMA_STAGES[Math.min(level, 4)].name})</span>
            <span>{stats.hp % 20}/20</span>
          </div>
          <div className="h-2 bg-pot-dark rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pot-green to-pot-accent" style={{ width: `${((stats.hp % 20) / 20) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Activity that grows the plant */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-6">
        <h3 className="font-bold text-white mb-3">What feeds the plant</h3>
        <ul className="space-y-2 text-sm text-pot-muted">
          <li>💰 <span className="text-white">Deposits</span> — each new deposit feeds XP.</li>
          <li>🗳️ <span className="text-white">Votes &amp; proposals</span> — active governance keeps HP high.</li>
          <li>👥 <span className="text-white">New members</span> — community growth boosts the plant.</li>
          <li>⏳ <span className="text-white">Continuous activity</span> — long stretches of inactivity decay HP.</li>
        </ul>
      </div>

      {/* Level unlock table */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-6">
        <h3 className="font-bold text-white mb-3">What each level unlocks</h3>
        <div className="space-y-2">
          {TAMA_STAGES.map((s) => {
            const reached = s.lvl <= level
            return (
              <div
                key={s.lvl}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  reached ? 'border-pot-green/30 bg-pot-green/5' : 'border-pot-border bg-pot-dark/40'
                }`}
              >
                <span className={`text-2xl shrink-0 ${reached ? '' : 'opacity-40 grayscale'}`}>{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">L{s.lvl} · {s.name}</span>
                    {reached && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pot-green/20 text-pot-green border border-pot-green/30">unlocked</span>}
                  </div>
                  <div className={`text-xs mt-0.5 ${reached ? 'text-pot-muted' : 'text-pot-muted/60'}`}>{s.unlock}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Duels — gated at L3 */}
      <div className={`bg-pot-card border rounded-2xl p-6 ${duelsUnlocked ? 'border-pot-accent/40' : 'border-pot-border'}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-bold text-white">⚔️ Duels</h3>
            <p className="text-sm text-pot-muted mt-1">
              {duelsUnlocked
                ? 'Challenge another public pot. Winner takes a slice of the loser&apos;s shares.'
                : `Unlocks at Level 3 — Bud (your pot is at L${level}).`}
            </p>
          </div>
          <button
            disabled={!duelsUnlocked}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition shrink-0 ${
              duelsUnlocked
                ? 'bg-pot-accent/20 hover:bg-pot-accent/40 text-pot-accent border-pot-accent/40'
                : 'bg-pot-dark text-pot-muted border-pot-border cursor-not-allowed'
            }`}
          >
            {duelsUnlocked ? 'Find opponent' : '🔒 Locked'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PotPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { publicKey: userPubkey } = useWallet()

  const pubkey = params.pubkey as string

  // Vault PDA — feeds VaultPortfolio (Dune SIM real-time data)
  const vaultPda = useMemo(() => {
    try {
      const programId = new PublicKey(
        process.env.NEXT_PUBLIC_PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'
      )
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), new PublicKey(pubkey).toBuffer()],
        programId
      )
      return pda.toBase58()
    } catch {
      return ''
    }
  }, [pubkey])

  // Track referral in Supabase (replaces localStorage)
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (!ref || !pubkey || !isSupabaseConfigured) return
    supabase.from('referrals').upsert(
      { pot_pubkey: pubkey, referrer_code: ref, visited_at: new Date().toISOString() },
      { onConflict: 'pot_pubkey,referrer_code' },
    ).catch(() => {})
  }, [searchParams, pubkey])

  const { data: pot, isLoading: isPotLoading } = usePot(pubkey)
  const { data: members = [] } = useMembers(pubkey)
  const { data: proposals = [] } = useProposals(pubkey)
  const { role } = usePotRole(pubkey)

  // Default landing tab is deposit — first thing user can do.
  const [activeTab, setActiveTab] = useState<Tab>('deposit')
  const [proposalFilter, setProposalFilter] = useState<'all' | 'active' | 'passed' | 'executed' | 'rejected'>('all')
  const [snsName, setSnsName] = useState<string>('')
  const [isMember, setIsMember] = useState(false)
  const [proposalModalOpen, setProposalModalOpen] = useState(false)

  useEffect(() => {
    (async () => {
      const name = await reverseSNS(pubkey)
      setSnsName(name)
    })()
  }, [pubkey])

  useEffect(() => {
    if (!userPubkey) { setIsMember(false); return }
    const userStr = userPubkey.toString()
    const member = members.find((m: any) => (m.wallet ?? m.pubkey) === userStr)
    setIsMember(!!member)
  }, [members, userPubkey])

  if (isPotLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full w-12 h-12 border-2 border-pot-accent border-t-transparent" />
          <p className="mt-4 text-pot-muted">Loading vault...</p>
        </div>
      </div>
    )
  }

  if (!pot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Vault not found</h1>
          <p className="text-pot-muted mb-4">This vault doesn't exist or has been closed.</p>
          <Link href="/" className="inline-block px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-lg font-semibold transition">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const potAny = pot as any
  const ownerAddress: string = potAny.authority ?? potAny.creator ?? potAny.owner ?? ''
  const isOwner = role === 'creator'
  const canManage = role === 'creator' || role === 'member'
  const canVote = canManage
  const canExecute = isOwner
  const canWithdraw = canManage

  const tamaStats = calculateTamaStats({
    tradeVolume: potAny.totalVolume ?? 0,
    memberCount: potAny.memberCount ?? 0,
    winRate: 0.5,
    yieldApy: 0,
    ageSeconds: 86400,
  })

  const nextProposalId = (potAny.nextProposalId ?? proposals.length) as number
  const activeProposalsCount = proposals.filter((p: any) => p.status === 'active').length

  return (
    <div className="min-h-screen bg-pot-dark pb-12">
      {/* Header — in-flow (no internal sticky; global navbar handles sticking) */}
      <div className="bg-gradient-to-b from-pot-card to-pot-dark border-b border-pot-border px-6 py-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="text-6xl shrink-0">{pot.emoji}</div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-white mb-1 break-words">{pot.name}</h1>
                {snsName && <p className="text-sm font-mono text-pot-green">{snsName}</p>}
                <p className="text-xs text-pot-muted font-mono mt-1 break-all">{pubkey}</p>
                <div className="mt-2">
                  <span className="px-3 py-1 bg-pot-card border border-pot-border text-xs rounded-full text-pot-muted">
                    You: {role === 'creator' ? 'Creator' : role === 'member' ? 'Member' : 'Viewer'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {userPubkey && (
                <div className="flex gap-2 flex-wrap justify-end">
                  {isOwner && (
                    <Link
                      href={`/pots/${pubkey}/settings`}
                      className="px-3 py-2 text-xs bg-pot-border hover:bg-pot-accent/20 text-white rounded-lg transition"
                    >
                      ⚙️ Settings
                    </Link>
                  )}
                  {isMember && !isOwner && (
                    <button className="px-3 py-2 text-xs bg-pot-border hover:bg-red-500/20 text-pot-muted hover:text-red-400 rounded-lg transition">
                      👋 Leave
                    </button>
                  )}
                  {!isMember && !isOwner && (
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className="px-3 py-2 text-xs bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold rounded-lg transition"
                    >
                      + Join Vault
                    </button>
                  )}
                </div>
              )}
              <div className="text-right">
                <div className="text-xs text-pot-muted">Owner</div>
                <p className="text-xs font-mono text-pot-green break-all max-w-xs text-right">{ownerAddress}</p>
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            {potAny.isPublic && <span className="px-3 py-1 bg-pot-accent/20 text-pot-accent text-xs rounded-full font-semibold">🌍 Public</span>}
            {potAny.isActive && <span className="px-3 py-1 bg-pot-green/20 text-pot-green text-xs rounded-full font-semibold">✓ Active</span>}
            {isMember && <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-semibold">🙋 Member</span>}
            {isOwner && <span className="px-3 py-1 bg-pot-accent/30 text-pot-accent text-xs rounded-full font-semibold">👑 Owner</span>}
            {tamaStats.hp < 30 && <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">🔥 Low HP!</span>}
          </div>
        </div>
      </div>

      {/* Analytics strip — members only */}
      {canManage && <VaultAnalyticsStrip pubkey={pubkey} />}

      {/* Tabs row */}
      <div className="border-b border-pot-border bg-pot-dark sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 flex gap-1 overflow-x-auto items-center">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? 'text-pot-accent border-b-2 border-pot-accent'
                  : 'text-pot-muted hover:text-white border-b-2 border-transparent'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Content — full-width container */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 w-full">

        {/* ── Deposit ── first action. Wallet-gated inline. */}
        {activeTab === 'deposit' && (
          <WalletGate
            connected={!!userPubkey}
            title="Connect your wallet to deposit"
            subtitle="Deposit SOL and receive vault shares. You can withdraw per this vault's policy."
          >
            <DepositPanel potPubkey={pubkey} potName={pot.name} vaultBalance={pot.balance} />
          </WalletGate>
        )}

        {/* ── Overview ── key metrics + user's shares + P&L + active proposals.
             NO tab-link duplication — the top tab bar already handles nav. */}
        {activeTab === 'overview' && (
          <div className="space-y-6 w-full">
            {/* Metric tiles — min-w-[132px] sized for 8-char values, tabular-nums */}
            <div className="flex gap-4 flex-wrap">
              <MetricTile label="TVL (SOL)"    value={pot.balance.toFixed(2)} />
              <MetricTile label="Members"      value={String(pot.memberCount ?? 0)} />
              <MetricTile label="Proposals"    value={String(proposals.length)} accent={activeProposalsCount ? 'accent' : undefined} />
              <MetricTile label="Active"       value={String(activeProposalsCount)} accent="accent" />
              <MetricTile label="Trades"       value={String(pot.tradeCount ?? 0)} />
              <MetricTile label="Total Shares" value={(pot.totalShares ?? 0).toLocaleString()} />
              <MetricTile label="🌱 Tama HP"   value={`${tamaStats.hp}/100`} accent="green" />
            </div>

            {/* Your position & P&L — shown inline as dashboard summary.
               Full management still lives in /shares and /positions tabs. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
              <div className="lg:col-span-2 w-full">
                <SharesPanel potPubkey={pubkey} />
              </div>
              <div className="w-full space-y-6">
                <PnLDashboard potPubkey={pubkey} vaultBalanceSol={pot.balance} />
                <PotNotificationFeed potPubkey={pubkey} />
              </div>
            </div>

            {/* Active proposals callout */}
            {activeProposalsCount > 0 && (
              <div className="bg-pot-accent/10 border border-pot-accent/30 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap w-full">
                <div>
                  <p className="text-pot-accent font-bold">🗳️ {activeProposalsCount} active proposal{activeProposalsCount > 1 ? 's' : ''} need your vote</p>
                  <p className="text-sm text-pot-muted mt-1">Participate in governance to shape this vault's strategy.</p>
                </div>
                <button
                  onClick={() => setActiveTab('proposals')}
                  className="px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-lg text-sm font-semibold transition shrink-0"
                >
                  Vote Now →
                </button>
              </div>
            )}

            {/* Strategy callout (if configured) */}
            {potAny.yieldStrategy && (
              <div className="bg-pot-card border border-pot-border/50 rounded-2xl p-6 w-full">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">⚙️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-2">Active Strategy</h3>
                    <p className="text-sm text-pot-muted mb-4">This vault runs an automated {potAny.yieldStrategy} strategy.</p>
                    <button
                      onClick={() => setActiveTab('strategy')}
                      className="px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-lg text-sm font-semibold transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Solana Blinks — share strip moved to bottom (point 6 — side feature, not main story) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl border border-pot-border bg-pot-card/50">
              <div>
                <div className="text-sm font-semibold text-white">⚡ Share as Solana Blink</div>
                <div className="text-xs text-pot-muted mt-0.5">
                  Post this pot on X — followers can deposit or vote without leaving the tweet.
                </div>
              </div>
              <ShareBlinkButton potPubkey={pubkey} kind="deposit" />
            </div>
          </div>
        )}

        {/* ── Vault ── members / owner only */}
        {activeTab === 'vault' && (
          canManage ? (
            <VaultTab potPubkey={pubkey} isCreator={isOwner} />
          ) : (
            <WalletGate
              connected={!!userPubkey}
              title="Connect wallet to check membership"
              subtitle="Vault settings are visible to members and the owner."
            >
              <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
                <div className="text-4xl mb-4">🔒</div>
                <p className="text-white font-semibold mb-2">Members only</p>
                <p className="text-pot-muted text-sm mb-4">Join this vault to access vault settings.</p>
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="px-4 py-2 bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold rounded-lg transition"
                >
                  Deposit to Join
                </button>
              </div>
            </WalletGate>
          )
        )}

        {/* ── Proposals ── single "+ Create Proposal" opens categorized modal (Phase 2).
             Modal maps each category to the right on-chain ProposalType. */}
        {activeTab === 'proposals' && (
          <div className="space-y-6 w-full">
            {/* Header row with single CTA */}
            {canManage && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white">Proposals</h2>
                  <p className="text-sm text-pot-muted">
                    Propose a change, everyone with shares votes Yes/No.
                  </p>
                </div>
                <button
                  onClick={() => setProposalModalOpen(true)}
                  className="px-5 py-2.5 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-xl text-sm font-bold transition shrink-0"
                >
                  + Create Proposal
                </button>
              </div>
            )}

            {!canManage && userPubkey && (
              <div className="bg-pot-card border border-pot-border rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-pot-muted text-sm">Only members can create or vote on proposals.</p>
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="px-4 py-2 bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold rounded-lg text-sm transition"
                >
                  Deposit to Join
                </button>
              </div>
            )}

            {!userPubkey && (
              <WalletGate
                connected={false}
                title="Connect wallet to vote"
                subtitle="Voting and proposal creation require a connected member wallet."
              >{null}</WalletGate>
            )}

            {/* Proposals filter tabs */}
            {proposals.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
                {(['all','active','passed','executed','rejected'] as const).map((f) => {
                  const count = f === 'all' ? proposals.length : proposals.filter((x: any) => x.status === f).length
                  return (
                    <button
                      key={f}
                      onClick={() => setProposalFilter(f)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        proposalFilter === f
                          ? 'bg-pot-accent/20 text-pot-accent border-pot-accent/30'
                          : 'bg-pot-card text-pot-muted border-pot-border hover:text-white'
                      }`}
                    >
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Proposals list */}
            {proposals.length === 0 ? (
              <div className="text-center py-16 bg-pot-card border border-pot-border rounded-2xl w-full">
                <div className="text-5xl mb-4">🗳️</div>
                <p className="text-white font-semibold mb-1">No proposals yet</p>
                <p className="text-pot-muted text-sm">
                  {canManage ? 'Click "+ Create Proposal" to submit the first one.' : 'Join the vault to create proposals.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals
                  .filter((p: any) => proposalFilter === 'all' || p.status === proposalFilter)
                  .map((p: any) => (
                    <ProposalCard
                      key={p.pubkey}
                      proposal={p}
                      potAddress={pubkey}
                      canVote={canVote}
                      canExecute={canExecute}
                    />
                  ))}
              </div>
            )}

            {/* Modal */}
            <CreateProposalModal
              open={proposalModalOpen}
              onClose={() => setProposalModalOpen(false)}
              potPubkey={pubkey}
              nextProposalId={nextProposalId}
              vaultBalance={pot.balance}
              potForBudgetGrant={potAny}
              currentUserPubkey={userPubkey?.toString()}
            />
          </div>
        )}

        {/* ── Tamagotchi ── Phase 1 placeholder with evolution + mechanics + L3-gated duels */}
        {activeTab === 'tamagotchi' && <TamagotchiTab stats={tamaStats} />}

        {/* ── Shares ── */}
        {activeTab === 'shares' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                disabled={!canWithdraw}
                title={!canWithdraw ? 'Members only' : undefined}
                className="px-4 py-2 rounded-lg border border-pot-border text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw
              </button>
            </div>
            <SharesTab potPubkey={pubkey} canWithdraw={canWithdraw} />
          </div>
        )}

        {/* ── Positions / P&L — powered by Dune SIM ── */}
        {activeTab === 'positions' && (
          <div className="space-y-6 w-full">
            {/* Real-time vault portfolio: token balances + USD values + activity feed */}
            {vaultPda && (
              <VaultPortfolio vaultPda={vaultPda} potName={pot.name} />
            )}
            {/* PnL dashboard (mock-mode / on-chain) */}
            <PnLDashboard potPubkey={pubkey} vaultBalanceSol={pot.balance} />
          </div>
        )}


        {/* ── Analytics ── */}
        {activeTab === 'analytics' && (
          <PotAnalyticsWidget potPubkey={pubkey} vaultPubkey={vaultPda || undefined} />
        )}

        {/* ── Strategy ── proposal builder. Picking the action + token + amount
             prefills a swap proposal; "Submit as Proposal" opens the standard
             governance modal where the proposal is finalised and signed. */}
        {activeTab === 'strategy' && (
          <div className="space-y-4">
            <SquadsBanner potPubkey={pubkey} />
            <StrategyProposalBuilder
              potName={pot.name}
              potBalanceSol={pot.balance}
              onSubmit={() => setProposalModalOpen(true)}
            />
            <details className="bg-pot-card border border-pot-border rounded-2xl p-5">
              <summary className="cursor-pointer font-bold text-white">Legacy strategy panel</summary>
              <div className="mt-4">
                <StrategyPanel potPubkey={pubkey} />
              </div>
            </details>
          </div>
        )}

        {/* ── Governance Settings ── */}
        {activeTab === 'governance' && (
          <div className="space-y-4">
            <SquadsBanner potPubkey={pubkey} />
            <div className="flex gap-2 justify-end">
              <button
                disabled={!isOwner}
                title={!isOwner ? 'Creator only' : undefined}
                className="px-4 py-2 rounded-lg border border-pot-border text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
              <button
                disabled={!isOwner}
                title={!isOwner ? 'Creator only' : undefined}
                className="px-4 py-2 rounded-lg border border-pot-border text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove Member
              </button>
            </div>
            <GovernanceSettings isAdmin={isOwner} potPubkey={pubkey} />
          </div>
        )}

        {/* ── AI Agent — two-tier:
             1. PotBot AI (always-on) decision-support feed,
             2. User AI delegate (opt-in) with rules & strategy presets. */}
        {activeTab === 'agent' && (
          <div className="space-y-4">
            <PotBotAISuggestions
              potPubkey={pubkey}
              potName={pot.name}
              potBalanceSol={pot.balance}
              onSubmit={() => setProposalModalOpen(true)}
            />
            <div className="bg-pot-card/50 border border-pot-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-2xl">🪪</span>
                <h3 className="font-bold text-white text-lg">Your personal AI</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pot-border text-pot-muted uppercase tracking-wide">
                  user layer
                </span>
              </div>
              <p className="text-xs text-pot-muted mb-4 break-words">
                Sits on top of the base layer. Configure rules, presets and a delegate so your AI
                can vote on or auto-create proposals when the base AI flags an opportunity.
              </p>
              <AIAgentPanel potPubkey={pubkey} pot={pot} />
            </div>
          </div>
        )}

        {/* ── Members ── */}
        {activeTab === 'members' && (
          <div className="space-y-4 w-full">
            <div className="flex justify-end">
              <button
                disabled={!isOwner}
                title={!isOwner ? 'Creator only' : undefined}
                className="px-4 py-2 rounded-lg border border-pot-border text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Manage
              </button>
            </div>
            {members.length === 0 ? (
              <div className="text-center py-12 bg-pot-card border border-pot-border rounded-2xl">
                <p className="text-pot-muted">No members yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m: any, i: number) => {
                  const addr = m.wallet ?? m.pubkey ?? 'unknown'
                  const sharesPct = pot.totalShares > 0
                    ? ((m.shares / pot.totalShares) * 100).toFixed(1)
                    : '0.0'
                  return (
                    <div key={addr + i} className="flex items-center justify-between bg-pot-card border border-pot-border rounded-xl p-4">
                      <div className="min-w-0 flex-1 mr-4">
                        <p className="text-white font-mono text-sm break-all">{addr}</p>
                        {m.joinedAt && (
                          <p className="text-xs text-pot-muted mt-0.5">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold tabular-nums">{m.shares?.toLocaleString() ?? 0} shares</p>
                        <p className="text-xs text-pot-muted tabular-nums">{sharesPct}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Referral ── */}
        {activeTab === 'referral' && <ReferralPanel potPubkey={pubkey} potName={pot.name} />}
      </div>
    </div>
  )
}
