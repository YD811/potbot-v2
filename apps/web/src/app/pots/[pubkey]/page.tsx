'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { StrategyPanel } from '@/components/StrategyPanel'
import { AIAgentPanel } from '@/components/AIAgentPanel'
import { GovernanceSettings } from '@/components/GovernanceSettings'
import DepositPanel from '@/components/DepositPanel'
import SharesTab from '@/components/SharesTab'
import ReferralPanel from '@/components/ReferralPanel'
import { SquadsBanner } from '@/components/SquadsBanner'
import { ShareBlinkButton } from '@/components/ShareBlinkButton'
import { PotBotAISuggestions } from '@/components/PotBotAISuggestions'
import { StatusBadge } from '@/components/StatusBadge'
import { PotHeroStrip } from '@/components/PotHeroStrip'
import { PotActivityFeed } from '@/components/PotActivityFeed'
import { MembersList } from '@/components/MembersList'
import { PremiumFeatures } from '@/components/PremiumFeatures'
import { reverseSNS } from '@/lib/sns'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import SwapExecuteButton from '@/components/SwapExecuteButton'
import CreateProposalModal from '@/components/pot/CreateProposalModal'
import { PublicKey } from '@solana/web3.js'
import VaultPortfolio from '@/components/VaultPortfolio'

// SSR-safe wallet button
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

/* ── Tab order (PR-F vision-mode collapse) ──
   Old layout had 13 tabs. New layout has 4, mapped to user mental model:
   - Trade   → first action: deposit, propose, vote, recent activity
   - Community → who's in this pot, governance, referrals
   - AI      → PotBot AI base layer + your AI delegate
   - Features → roadmap stuff: tamagotchi, premium, privacy preview */
const TABS = ['proposal', 'community', 'ai', 'features'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  proposal:  '🗳️ Proposal',
  community: '👥 Community',
  ai:        '🤖 AI',
  features:  '🌟 Features',
}

/* Cluster — use NEXT_PUBLIC_SOLANA_CLUSTER if present, else default to devnet */
const CLUSTER: 'mainnet-beta' | 'devnet' =
  (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as 'mainnet-beta' | 'devnet') ?? 'devnet'

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

/* Inline wallet gate */
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

/* ── Tamagotchi block (used inside Features tab) ── */
const TAMA_STAGES = [
  { lvl: 1, emoji: '🌱', name: 'Seedling',   unlock: 'Starting state for every new pot' },
  { lvl: 2, emoji: '🌿', name: 'Sprout',     unlock: 'Lower protocol fees · custom emoji' },
  { lvl: 3, emoji: '🪴', name: 'Bud',        unlock: '⚔️ Duels with other public pots unlocked' },
  { lvl: 4, emoji: '🌳', name: 'Bloom',      unlock: 'NFT Strategy Shares · season prize eligibility' },
  { lvl: 5, emoji: '🌲', name: 'Mature Tree', unlock: 'Mainnet-only perks · cross-pot composability' },
] as const

function TamagotchiBlock({ stats }: { stats: ReturnType<typeof calculateTamaStats> }) {
  const level = Math.max(1, Math.min(5, Math.floor(stats.hp / 20) + 1))
  const duelsUnlocked = level >= 3

  return (
    <section className="bg-pot-card border border-pot-border rounded-2xl p-5 sm:p-6 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <h3 className="font-bold text-white text-lg">Tamagotchi</h3>
          <StatusBadge tier="phase-3" compact />
        </div>
        <button
          disabled
          className="px-3 py-1.5 rounded-xl bg-pot-green/20 text-pot-green border border-pot-green/30 text-xs font-bold cursor-not-allowed opacity-60"
          title="NFT mint ships at Bloom (Level 4) in Phase 3"
        >
          🪙 Mint NFT (Level 4+)
        </button>
      </header>
      <p className="text-sm text-pot-muted">
        The plant grows from <span className="text-white font-semibold">member activity</span> —
        deposits, votes, proposals, new members. Not from trading P&amp;L. Pot duels unlock at Level 3.
      </p>

      <div className="flex items-center justify-between bg-pot-dark rounded-xl p-3">
        {TAMA_STAGES.map((s) => (
          <div key={s.lvl} className="flex flex-col items-center">
            <div
              className={`text-3xl transition ${
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

      <div>
        <div className="flex items-center justify-between text-xs text-pot-muted mb-1">
          <span>Level {level} — {TAMA_STAGES[level - 1].name} · HP {stats.hp}/100</span>
          <span>{stats.hp % 20}/20 to L{Math.min(level + 1, 5)}</span>
        </div>
        <div className="h-2 bg-pot-dark rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-pot-green to-pot-accent" style={{ width: `${((stats.hp % 20) / 20) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TAMA_STAGES.map((s) => {
          const reached = s.lvl <= level
          return (
            <div
              key={s.lvl}
              className={`flex items-start gap-2 p-2.5 rounded-xl border ${
                reached ? 'border-pot-green/30 bg-pot-green/5' : 'border-pot-border bg-pot-dark/40'
              }`}
            >
              <span className={`text-lg shrink-0 ${reached ? '' : 'opacity-40 grayscale'}`}>{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-xs">L{s.lvl} · {s.name}</span>
                  {reached && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pot-green/20 text-pot-green border border-pot-green/30">
                      unlocked
                    </span>
                  )}
                </div>
                <div className={`text-[11px] mt-0.5 ${reached ? 'text-pot-muted' : 'text-pot-muted/60'}`}>{s.unlock}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className={`bg-pot-dark/40 border rounded-xl p-3 ${duelsUnlocked ? 'border-pot-accent/40' : 'border-pot-border'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-bold text-white text-sm">⚔️ Duels</p>
            <p className="text-xs text-pot-muted">
              {duelsUnlocked
                ? 'Challenge another public pot. Winner takes a slice of the loser’s shares.'
                : `Unlocks at Level 3 — Bud (you’re at L${level}).`}
            </p>
          </div>
          <button
            disabled={!duelsUnlocked}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition shrink-0 ${
              duelsUnlocked
                ? 'bg-pot-accent/20 hover:bg-pot-accent/40 text-pot-accent border-pot-accent/40'
                : 'bg-pot-dark text-pot-muted border-pot-border cursor-not-allowed'
            }`}
          >
            {duelsUnlocked ? 'Find opponent' : '🔒 Locked'}
          </button>
        </div>
      </div>
    </section>
  )
}


/* ── Demo info banner ── shown on devnet so judges have instant context ── */
const YIELD_LABEL: Record<number, string> = {
  0: 'No yield', 1: 'Conservative ~6% APY', 2: 'Balanced ~15% APY',
  3: 'Aggressive ~30% APY', 4: 'JLP Hedged ~40% APY',
  5: 'Exponent PT ~22% APY', 6: 'JLP Delta-Neutral ~35% APY',
}

function DemoInfoBanner({ cluster }: { cluster: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (cluster === 'mainnet-beta' || dismissed) return null
  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-3">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-pot-accent/10 border border-pot-accent/25 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-pot-accent font-bold shrink-0">🧪 Devnet demo</span>
          <span className="text-pot-muted">Deposit, vote, and propose real Jupiter swaps on Solana devnet. No real funds — just live on-chain governance.</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-pot-muted hover:text-white shrink-0 text-base leading-none">×</button>
      </div>
    </div>
  )
}

function PotContextCard({ pot, yieldStrategy }: { pot: any; yieldStrategy: number }) {
  const totalValue = (pot.balance ?? 0) + (pot.meteoraLpBalance ?? 0)
  const yieldEarned = pot.totalYieldEarned ?? 0
  const navBps = pot.navPerShareBps ?? 10000
  const navDisplay = ((navBps - 10000) / 100).toFixed(2)
  const isPositive = navBps >= 10000
  const stratLabel = YIELD_LABEL[yieldStrategy] ?? 'Custom strategy'

  return (
    <div className="bg-pot-card/60 border border-pot-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-pot-muted font-bold">Strategy</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white font-semibold">⚙️ {stratLabel}</span>
          </div>
          <p className="text-xs text-pot-muted">
            Deposit SOL → members propose Jupiter swaps → majority vote executes on-chain. All governance parameters are transparent.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wide text-pot-muted">Total value</div>
            <div className="text-base font-bold text-pot-green tabular-nums">{totalValue.toFixed(2)} ◎</div>
          </div>
          {yieldEarned > 0 && (
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wide text-pot-muted">Yield earned</div>
              <div className="text-base font-bold text-pot-green tabular-nums">+{yieldEarned.toFixed(3)} ◎</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wide text-pot-muted">NAV/share</div>
            <div className={`text-base font-bold tabular-nums ${isPositive ? 'text-pot-green' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{navDisplay}%
            </div>
          </div>
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

  // (Referral tracking removed — `referrals` table isn't provisioned. Will
  //  be re-added when the protocol-economics phase ships its own table.)

  const { data: pot, isLoading: isPotLoading } = usePot(pubkey)
  const { data: members = [] } = useMembers(pubkey)
  const { data: proposals = [] } = useProposals(pubkey)
  const { role } = usePotRole(pubkey)

  const [activeTab, setActiveTab] = useState<Tab>('proposal')
  const [proposalFilter, setProposalFilter] = useState<'all' | 'active' | 'passed' | 'executed' | 'rejected'>('all')
  const [snsName, setSnsName] = useState<string>('')
  const [isMember, setIsMember] = useState(false)
  const [proposalModalOpen, setProposalModalOpen] = useState(false)

  useEffect(() => {
    (async () => {
      const name = await reverseSNS(pubkey)
      setSnsName(name ?? '')
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
          <p className="text-pot-muted mb-4">This vault doesn&apos;t exist or has been closed.</p>
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
  const isLive = CLUSTER === 'mainnet-beta'

  const tamaStats = calculateTamaStats({
    tradeVolume: potAny.totalVolume ?? 0,
    memberCount: potAny.memberCount ?? 0,
    winRate: 0.5,
    yieldApy: 0,
    ageSeconds: 86400,
  })

  const nextProposalId = (potAny.nextProposalId ?? proposals.length) as number
  const activeProposalsCount = proposals.filter((p: any) => p.status === 'active').length

  const yourMember = userPubkey
    ? members.find((m: any) => (m.wallet ?? m.pubkey) === userPubkey.toString())
    : null
  const yourSharePct = yourMember && potAny.totalShares > 0
    ? (yourMember.shares / potAny.totalShares) * 100
    : undefined

  const lastSwapTx = potAny.lastSwapTx ?? potAny.lastSwapSignature
  const squadsManaged = potAny.isSquadsVault === true

  const goToDeposit = () => {
    setActiveTab('proposal')
    requestAnimationFrame(() => {
      document.getElementById('deposit-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const goToPropose = () => {
    setActiveTab('proposal')
    requestAnimationFrame(() => {
      document.getElementById('propose-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    // Single entry point for the proposal builder — opens the modal so we
    // don't need a duplicate "+ Create Proposal" button next to the heading.
    if (canManage) setProposalModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-pot-dark pb-12">
      {/* Breadcrumb — keeps user oriented */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-3 pb-1 text-xs text-pot-muted">
        <Link href="/" className="hover:text-white transition">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/vaults" className="hover:text-white transition">Vaults</Link>
        <span className="mx-1.5">/</span>
        <span className="text-white truncate inline-block max-w-[200px] sm:max-w-xs align-middle">{pot.name}</span>
      </div>

      {/* Demo context banner — devnet only, dismissible */}
      <DemoInfoBanner cluster={CLUSTER} />

      {/* Sticky hero strip */}
      <PotHeroStrip
        emoji={pot.emoji}
        name={pot.name}
        snsName={snsName}
        pubkey={pubkey}
        ownerLabel={role === 'creator' ? 'Creator' : role === 'member' ? 'Member' : 'Viewer'}
        isPublic={!!potAny.isPublic}
        isLive={isLive}
        squadsManaged={squadsManaged}
        tvlSol={(pot.balance ?? 0) + (potAny.meteoraLpBalance ?? 0)}
        members={pot.memberCount ?? members.length ?? 0}
        yourSharePct={yourSharePct}
        activeProposals={activeProposalsCount}
        tamaHp={tamaStats.hp}
        onDepositClick={goToDeposit}
        onProposeClick={goToPropose}
        canPropose={canManage}
      />

      {/* Sponsor rail */}
      {/* Tabs row */}
      <div className="border-b border-pot-border bg-pot-dark">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 flex gap-1 overflow-x-auto items-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-5 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 ${
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

      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-8 w-full">

        {/* ════════════════════ PROPOSAL TAB ════════════════════
            The killer demo flow. Everything a judge needs to see in 60s:
            deposit → propose → vote → activity. */}
        {activeTab === 'proposal' && (
          <div className="space-y-8 w-full">

            {/* Squads banner if pot is multisig-managed */}
            <SquadsBanner potPubkey={pubkey} />

            {/* ── How-it-works flow stepper ── */}
            <div className="flex items-center gap-2 text-xs overflow-x-auto [scrollbar-width:none] pb-1 -mb-2">
              {[
                { n: '1', label: 'Deposit SOL' },
                { n: '2', label: 'Create Proposal' },
                { n: '3', label: 'Vote' },
                { n: '4', label: 'Execute on-chain' },
              ].map((step, i, arr) => (
                <div key={step.n} className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-pot-accent/20 text-pot-accent text-[10px] font-bold flex items-center justify-center shrink-0">{step.n}</span>
                    <span className="text-pot-muted whitespace-nowrap">{step.label}</span>
                  </div>
                  {i < arr.length - 1 && <span className="text-pot-border shrink-0">→</span>}
                </div>
              ))}
            </div>

            {/* ── Pot context card ── strategy + yield overview for judges ── */}
            <PotContextCard pot={potAny} yieldStrategy={potAny.yieldStrategy ?? 0} />

            {/* ── Deposit / Withdraw ── primary action */}
            <section id="deposit-section" className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">💰 Deposit / Withdraw</h2>
                <StatusBadge tier="live" compact />
              </div>
              <WalletGate
                connected={!!userPubkey}
                title="Connect your wallet to deposit"
                subtitle="Deposit SOL and receive vault shares. Withdraw anytime per this vault’s policy."
              >
                <DepositPanel potPubkey={pubkey} potName={pot.name} vaultBalance={(pot.balance ?? 0) + (potAny.meteoraLpBalance ?? 0)} />
              </WalletGate>
            </section>

            {/* ── Active proposals ── 2-col layout: list + activity feed */}
            <section id="propose-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {/* Heading only — the "🗳️ Propose" CTA in the sticky hero strip is the
                    single entry point for opening the proposal builder. */}
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">🗳️ Proposals</h2>
                  {activeProposalsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-pot-accent/20 text-pot-accent text-[11px] font-bold animate-pulse">
                      {activeProposalsCount} active
                    </span>
                  )}
                </div>

                {!canManage && userPubkey && (
                  <div className="bg-pot-card border border-pot-border rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-pot-muted text-xs">Only members can vote or propose. Deposit to join.</p>
                  </div>
                )}

                {proposals.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
                    {(['all','active','passed','executed','rejected'] as const).map((f) => {
                      const count = f === 'all'
                        ? proposals.length
                        : proposals.filter((x: any) => x.status === f).length
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

                {proposals.length === 0 ? (
                  <div className="text-center py-12 bg-pot-card border border-pot-border rounded-2xl">
                    <div className="text-4xl mb-3">🗳️</div>
                    <p className="text-white font-semibold mb-1">No proposals yet</p>
                    <p className="text-pot-muted text-xs">
                      {canManage
                        ? 'Use the proposal builder below to draft your first swap.'
                        : 'Join the vault to create proposals.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {proposals
                      .filter((p: any) => proposalFilter === 'all' || p.status === proposalFilter)
                      .slice(0, 6)
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
              </div>

              <div className="space-y-4">
                <PotActivityFeed pot={pot} proposals={proposals} members={members} cluster={CLUSTER} limit={3} />

                <div className="bg-pot-card border border-pot-border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <h4 className="font-bold text-white text-sm">Share as Solana Blink</h4>
                  </div>
                  <p className="text-[11px] text-pot-muted">
                    Post this pot on X. Followers can deposit or vote without leaving the tweet.
                  </p>
                  <ShareBlinkButton potPubkey={pubkey} kind="deposit" />
                </div>
              </div>
            </section>


            {/* ── Holdings & details ── hidden behind toggle to keep Trade tab tight.
                 Member-only: non-members don't need shares/withdraw UI on the main page. */}
            {canManage && (
              <details className="bg-pot-card/40 border border-pot-border rounded-2xl">
                <summary className="cursor-pointer px-5 py-4 text-sm text-white font-semibold flex items-center justify-between">
                  <span>📊 Your holdings &amp; portfolio</span>
                  <span className="text-pot-muted text-xs">expand ▾</span>
                </summary>
                <div className="px-5 pb-5 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2"><SharesPanel potPubkey={pubkey} /></div>
                    <div><PnLDashboard potPubkey={pubkey} vaultBalanceSol={pot.balance} /></div>
                  </div>
                  {vaultPda && (
                    <details className="bg-pot-card/50 border border-pot-border rounded-2xl p-4">
                      <summary className="cursor-pointer text-xs text-white font-semibold">
                        🔎 Vault portfolio (live, Dune SIM)
                      </summary>
                      <div className="mt-4">
                        <VaultPortfolio vaultPda={vaultPda} potName={pot.name} />
                      </div>
                    </details>
                  )}
                  <details className="bg-pot-card/50 border border-pot-border rounded-2xl p-4">
                    <summary className="cursor-pointer text-xs text-white font-semibold">
                      🪙 Manage shares (withdraw)
                    </summary>
                    <div className="mt-4">
                      <SharesTab potPubkey={pubkey} canWithdraw={canWithdraw} />
                    </div>
                  </details>
                </div>
              </details>
            )}

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

        {/* ════════════════════ COMMUNITY TAB ════════════════════ */}
        {activeTab === 'community' && (
          <div className="space-y-8 w-full">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">👥 Members</h2>
                  <span className="text-xs text-pot-muted">
                    {members.length} member{members.length === 1 ? '' : 's'}
                  </span>
                </div>
                <ShareBlinkButton potPubkey={pubkey} kind="deposit" />
              </div>
              <MembersList
                members={members}
                totalShares={pot.totalShares ?? 0}
                ownerAddress={ownerAddress}
                cluster={CLUSTER}
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">🏛️ Governance</h2>
                <StatusBadge tier={isLive ? 'live' : 'devnet'} compact />
              </div>
              <SquadsBanner potPubkey={pubkey} />
              <GovernanceSettings isAdmin={isOwner} potPubkey={pubkey} />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">🔗 Referral</h2>
                <StatusBadge tier="live" compact />
              </div>
              <ReferralPanel potPubkey={pubkey} potName={pot.name} />
            </section>
          </div>
        )}

        {/* ════════════════════ AI TAB ════════════════════ */}
        {activeTab === 'ai' && (
          <div className="space-y-6 w-full">
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
                <StatusBadge tier="devnet" compact />
              </div>
              <p className="text-xs text-pot-muted mb-4 break-words">
                Sits on top of the base layer. Configure rules, presets and a delegate so your AI
                can vote on or auto-create proposals when the base AI flags an opportunity.
              </p>
              <AIAgentPanel potPubkey={pubkey} pot={pot} />
            </div>
          </div>
        )}

        {/* ════════════════════ FEATURES TAB ════════════════════
            Roadmap surface: Tamagotchi · Premium · Privacy preview.
            Each block carries its phase chip; nothing is hidden, nothing is
            over-promised. Links to /roadmap for the full inventory. */}
        {activeTab === 'features' && (
          <div className="space-y-6 w-full">
            <div className="bg-pot-card/50 border border-pot-border rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-white font-semibold">🗺️ Want the full picture?</p>
                <p className="text-xs text-pot-muted mt-0.5">
                  See every PotBot feature and its phase on the public roadmap.
                </p>
              </div>
              <Link
                href="/roadmap"
                className="px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-xl text-xs font-bold transition shrink-0"
              >
                Open /roadmap →
              </Link>
            </div>

            <TamagotchiBlock stats={tamaStats} />

            <PremiumFeatures
              potPubkey={new PublicKey(pubkey)}
              potName={pot.name}
              tamagotchiLevel={Math.max(1, Math.min(5, Math.floor(tamaStats.hp / 20) + 1))}
              isTokenized={!!potAny.isTokenized}
              hasSnsdomain={!!snsName}
              hasTamagotchiNft={!!potAny.hasTamagotchiNft}
              snsAddress={snsName || undefined}
            />

            <section className="bg-pot-card border border-pot-border rounded-2xl p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">🔒</span>
                <h3 className="font-bold text-white text-lg">STAMPPOT — privacy preview</h3>
                <StatusBadge tier="phase-3" compact />
              </div>
              <p className="text-sm text-pot-muted">
                Auditable-Private mode adds a privacy layer to deposits and votes via
                PrivacyCash Merkle membership proofs and stealth addresses. Same Anchor
                program, same governance, just with shielded balances. Ships in Phase 3.
              </p>
              <Link
                href="/roadmap#phase-3"
                className="inline-block text-xs text-pot-accent hover:underline"
              >
                Read the architecture spec →
              </Link>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
