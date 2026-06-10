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
} from '@/hooks/usePots'
import { usePotRole } from '@/hooks/usePotRole'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'
import { SharesPanel } from '@/components/SharesPanel'
import { StrategyPanel } from '@/components/StrategyPanel'
import DepositPanel from '@/components/DepositPanel'
import { ShareBlinkButton } from '@/components/ShareBlinkButton'
import { StatusBadge } from '@/components/StatusBadge'
import { PotHeroStrip } from '@/components/PotHeroStrip'
import { PotActivityFeed } from '@/components/PotActivityFeed'
import { reverseSNS } from '@/lib/sns'
import PotSnsUpsell from '@/components/sns/PotSnsUpsell'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import CreateProposalModal from '@/components/pot/CreateProposalModal'
import {
  ProposalCard,
  ProposalCardSkeleton,
  ProposalsEmptyState,
  ProposalsErrorState,
} from '@/components/pot/ProposalCard'
import { SubscriptionModal } from '@/components/SubscriptionModal'
import { PublicKey } from '@solana/web3.js'
import { useHumanText } from '@/hooks/useHumanText'
import { SolPrice } from '@/components/SolPrice'
import { isLikelyBase58Pubkey, tryPublicKey } from '@/lib/solana-validation'

// Heavy panels that only render in their own tab or behind a <details>
// disclosure. Defer their JS + initial fetches until the user actually
// switches to that view — saves several hundred ms on first render of
// the Trade tab and trims first-load JS for the page.
const PnLDashboard      = dynamic(() => import('@/components/PnLDashboard').then(m => m.PnLDashboard))
const VaultPortfolio    = dynamic(() => import('@/components/VaultPortfolio'))
const VaultPortfolioDisplay = dynamic(() => import('@/components/VaultPortfolioDisplay'))
const SharesTab         = dynamic(() => import('@/components/SharesTab'))
const MembersList       = dynamic(() => import('@/components/MembersList').then(m => m.MembersList))
const SquadsBanner      = dynamic(() => import('@/components/SquadsBanner').then(m => m.SquadsBanner))
const GovernanceSettings = dynamic(() => import('@/components/GovernanceSettings').then(m => m.GovernanceSettings))
const ReferralPanel     = dynamic(() => import('@/components/ReferralPanel'))
const PotBotAISuggestions = dynamic(() => import('@/components/PotBotAISuggestions').then(m => m.PotBotAISuggestions))
const AIAgentPanel      = dynamic(() => import('@/components/AIAgentPanel').then(m => m.AIAgentPanel))
const PremiumFeatures   = dynamic(() => import('@/components/PremiumFeatures').then(m => m.PremiumFeatures))

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
const TABS = ['proposal', 'members', 'ai', 'features'] as const
type Tab = (typeof TABS)[number]

// Tab label *prefixes* — the user-facing word is translated at render
// time via useHumanText so light (Normie) mode swaps DeFi terminology
// to plain English (Proposal → Trade idea, etc.).
const TAB_EMOJIS: Record<Tab, string> = {
  proposal:  '🗳️',
  members:   '👥',
  ai:        '🤖',
  features:  '🌟',
}
const TAB_TERMS: Record<Tab, string> = {
  proposal:  'Proposal',
  members:   'Members',
  ai:        'AI Agent',
  features:  'Features',
}

/* Cluster — use NEXT_PUBLIC_SOLANA_CLUSTER if present, else default to devnet */
const CLUSTER: 'mainnet-beta' | 'devnet' =
  (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as 'mainnet-beta' | 'devnet') ?? 'devnet'

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


const YIELD_LABEL: Record<number, string> = {
  0: 'No yield', 1: 'Conservative ~6% APY', 2: 'Balanced ~15% APY',
  3: 'Aggressive ~30% APY', 4: 'JLP Hedged ~40% APY',
  5: 'Exponent PT ~22% APY', 6: 'JLP Delta-Neutral ~35% APY',
}

function PotContextCard({ pot, yieldStrategy }: { pot: any; yieldStrategy: number }) {
  const t = useHumanText()
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
          <div className="text-[10px] uppercase tracking-wider text-pot-muted font-bold">{t('Strategy')}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white font-semibold">⚙️ {stratLabel}</span>
          </div>
          <p className="text-xs text-pot-muted">
            Deposit SOL → members propose Jupiter swaps → majority vote executes on-chain. All governance parameters are transparent.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wide text-pot-muted">{t('TVL')}</div>
            <div className="text-base font-bold text-pot-green tabular-nums">
              <SolPrice sol={totalValue} compact />
            </div>
          </div>
          {yieldEarned > 0 && (
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wide text-pot-muted">{t('Yield')}</div>
              <div className="text-base font-bold text-pot-green tabular-nums">
                <SolPrice sol={yieldEarned} compact />
              </div>
            </div>
          )}
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wide text-pot-muted">{t('NAV')}/share</div>
            <div className={`text-base font-bold tabular-nums ${isPositive ? 'text-pot-green' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{navDisplay}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Subscription lock gate ──
   Blurs + locks premium content behind a subscription tier. Clicking the
   overlay opens the SubscriptionModal ("Upgrade your Pot Plan" flow). When
   `locked` is false the children render normally. */
function LockGate({
  locked,
  title,
  requiredTier,
  onUpgrade,
  children,
}: {
  locked: boolean
  title: string
  requiredTier: 'Pro' | 'Pro+'
  onUpgrade: () => void
  children: ReactNode
}) {
  if (!locked) return <>{children}</>
  return (
    <div className="relative overflow-hidden rounded-2xl border border-pot-border">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-sm opacity-50 p-5">
        {children}
      </div>
      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-pot-dark/70 backdrop-blur-[2px] p-6 text-center">
        <div className="text-3xl">🔒</div>
        <p className="text-white font-bold">{title}</p>
        <p className="text-xs text-pot-muted">
          Unlock with <span className="text-pot-green font-semibold">{requiredTier}</span>
        </p>
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-2 rounded-xl bg-pot-green px-4 py-2 text-sm font-bold text-pot-dark transition hover:brightness-110"
        >
          Upgrade your Pot Plan
        </button>
      </div>
    </div>
  )
}

export default function PotPage() {
  const t = useHumanText()
  const params = useParams()
  const searchParams = useSearchParams()
  const { publicKey: userPubkey } = useWallet()

  const pubkey = params.pubkey as string

  // Pre-validate the route pubkey. `new PublicKey()` can stack-
  // overflow for some near-base58 strings (the decoder doesn't bound
  // its recursion), and the crash isn't catchable inline. Filter via
  // a length+charset regex first, then run the constructor inside a
  // try/catch for the remaining edge cases.
  const validRoutePubkey = isLikelyBase58Pubkey(pubkey) ? pubkey : null

  // Vault PDA — feeds VaultPortfolio (Dune SIM real-time data)
  const vaultPda = useMemo(() => {
    if (!validRoutePubkey) return ''
    const potPk = tryPublicKey(validRoutePubkey)
    if (!potPk) return ''
    try {
      const programId = new PublicKey(
        process.env.NEXT_PUBLIC_PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'
      )
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), potPk.toBuffer()],
        programId
      )
      return pda.toBase58()
    } catch {
      return ''
    }
  }, [validRoutePubkey])

  // (Referral tracking removed — `referrals` table isn't provisioned. Will
  //  be re-added when the protocol-economics phase ships its own table.)

  const { data: pot, isLoading: isPotLoading } = usePot(pubkey)
  const { data: members = [] } = useMembers(pubkey)
  const {
    data: proposals = [],
    isLoading: proposalsLoading,
    isError: proposalsError,
    refetch: refetchProposals,
  } = useProposals(pubkey)
  const { role } = usePotRole(pubkey)

  const [activeTab, setActiveTab] = useState<Tab>('proposal')
  const [proposalFilter, setProposalFilter] = useState<'all' | 'active' | 'passed' | 'executed' | 'rejected'>('all')
  const [snsName, setSnsName] = useState<string>('')
  const [isMember, setIsMember] = useState(false)
  const [proposalModalOpen, setProposalModalOpen] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  // Deep-link into a specific proposal form (e.g. Holdings → Propose Staking).
  const [proposalInit, setProposalInit] = useState<{ category: any; option: string | null; amount?: number } | null>(null)

  const openStakingProposal = (amountSol: number) => {
    setProposalInit({ category: 'trading', option: 'staking', amount: amountSol })
    setProposalModalOpen(true)
  }

  useEffect(() => {
    (async () => {
      const name = await reverseSNS(pubkey)
      setSnsName(name ?? '')
    })()
  }, [pubkey])

  // Drive the browser tab title from the actual vault name. The page is
  // a client component so we can't use the metadata export — set
  // document.title imperatively instead. Falls back to a generic label
  // until the pot loads.
  useEffect(() => {
    document.title = pot?.name ? `${pot.name} · PotBot` : 'Vault · PotBot'
  }, [pot?.name])

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
  // Treat the local `isMember` flag (refreshed straight from the on-chain
  // members list) as a fallback for `role` — usePotRole can lag a beat
  // after a fresh deposit, which made the Propose button stay disabled
  // for the user that just joined the pot.
  const canManage = role === 'creator' || role === 'member' || isMember
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

  // Subscription gating — which premium features this pot has unlocked.
  const subscriptionTier = (potAny.subscriptionTier as string) ?? 'free'
  const hasPro = subscriptionTier === 'pro' || subscriptionTier === 'pro_plus'
  const hasProPlus = subscriptionTier === 'pro_plus'

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
        trustLevel={potAny.trustLevel}
        verifiedBy={potAny.verifiedBy}
        strategy={potAny.yieldStrategy}
        paused={potAny.paused}
        sentinel={potAny.sentinel}
        maxSwapPct={potAny.maxSwapPct}
        onDepositClick={goToDeposit}
        onProposeClick={goToPropose}
        canPropose={canManage}
        onMembersClick={() => setActiveTab('members')}
        onTamaClick={() => setActiveTab('features')}
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
              {TAB_EMOJIS[tab]} {t(TAB_TERMS[tab])}
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

            {/* The 1→2→3→4 stepper used to live here. The "?" button
                next to the Proposals heading below now folds it into a
                discoverable tooltip so the Trade tab opens with less
                visual noise. */}

            {/* ── Pot context card ── strategy + yield overview for judges ── */}
            <PotContextCard pot={potAny} yieldStrategy={potAny.yieldStrategy ?? 0} />

            {/* ── Holdings (multi-asset portfolio) ── */}
            <VaultPortfolioDisplay
              totalSol={pot.balance}
              totalUsd={undefined}
              onProposeStaking={canManage ? openStakingProposal : undefined}
            />

            {/* ── Deposit / Withdraw ── primary action */}
            <section id="deposit-section" className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">💰 {t('Deposit')} / {t('Withdraw')}</h2>
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">🗳️ {t('Proposals')}</h2>
                    {activeProposalsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-pot-accent/20 text-pot-accent text-[11px] font-bold animate-pulse">
                        {activeProposalsCount} active
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowHowItWorks((v) => !v)}
                      className="w-5 h-5 rounded-full bg-pot-card border border-pot-border text-pot-muted text-[10px] font-bold flex items-center justify-center hover:border-pot-accent hover:text-white transition shrink-0"
                      aria-label="How it works"
                    >
                      ?
                    </button>
                  </div>
                  {/* Create Proposal — visible when wallet is connected; the
                      hero "🗳️ Propose" still works as the primary CTA, but
                      surfacing the action here avoids a long scroll on
                      mobile and gives explicit feedback to depositors. */}
                  {userPubkey && (
                    canManage ? (
                      <button
                        type="button"
                        onClick={() => setProposalModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-pot-accent hover:bg-pot-accent/90 text-white transition"
                      >
                        + Create {t('Proposal')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Deposit first to become a member and create proposals"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-pot-card border border-pot-border text-pot-muted opacity-60 cursor-not-allowed"
                      >
                        + Create {t('Proposal')}
                      </button>
                    )
                  )}
                </div>
                {showHowItWorks && (
                  <div className="bg-pot-card border border-pot-border rounded-xl p-4 text-xs space-y-2">
                    {[
                      { n: '1', label: 'Deposit SOL to join the vault and receive share tokens' },
                      { n: '2', label: 'Create a proposal: pick tokens, amount, direction' },
                      { n: '3', label: 'Members vote yes / no, weighted by their shares' },
                      { n: '4', label: 'If quorum reached → Jupiter executes the swap on-chain automatically' },
                    ].map((step) => (
                      <div key={step.n} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-pot-accent/20 text-pot-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {step.n}
                        </span>
                        <span className="text-pot-muted leading-snug">{step.label}</span>
                      </div>
                    ))}
                  </div>
                )}

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

                {proposalsLoading ? (
                  <div className="space-y-3">
                    <ProposalCardSkeleton />
                    <ProposalCardSkeleton />
                  </div>
                ) : proposalsError ? (
                  <ProposalsErrorState onRetry={() => refetchProposals()} />
                ) : proposals.length === 0 ? (
                  <ProposalsEmptyState
                    canCreate={!!userPubkey && canManage}
                    onCreate={() => setProposalModalOpen(true)}
                  />
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
                          potBalance={(pot.balance ?? 0) + (potAny.meteoraLpBalance ?? 0)}
                          canVote={canVote}
                          canExecute={canExecute}
                          governance={{
                            quorumPct: potAny.quorumPct,
                            maxSwapPct: potAny.maxSwapPct,
                            voteTimeoutHours: potAny.votingWindowHours,
                          }}
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
                  <span>📊 {t('Shares')} &amp; portfolio</span>
                  <span className="text-pot-muted text-xs">expand ▾</span>
                </summary>
                <div className="px-5 pb-5 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2"><SharesPanel potPubkey={pubkey} /></div>
                    <div><PnLDashboard potPubkey={pubkey} vaultBalanceSol={pot.balance} /></div>
                  </div>
                  {vaultPda && (
                    <DeferredDetails
                      summary="🔎 Vault portfolio (live, Dune SIM)"
                      className="bg-pot-card/50 border border-pot-border rounded-2xl p-4"
                    >
                      <div className="mt-4">
                        <VaultPortfolio vaultPda={vaultPda} potName={pot.name} />
                      </div>
                    </DeferredDetails>
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
              onClose={() => { setProposalModalOpen(false); setProposalInit(null) }}
              potPubkey={pubkey}
              nextProposalId={nextProposalId}
              vaultBalance={pot.balance}
              potForBudgetGrant={potAny}
              currentUserPubkey={userPubkey?.toString()}
              initialCategory={proposalInit?.category ?? null}
              initialOption={proposalInit?.option ?? null}
              prefillAmount={proposalInit?.amount}
            />
          </div>
        )}

        {/* ════════════════════ MEMBERS TAB ════════════════════
            Renders the member roster inline (wallet, share %, deposit) from
            the same React-Query data the Community tab used to embed. */}
        {/* ════════════════════ MEMBERS TAB (= community view) ════════════════════
            Member roster + governance + referral, unified. There is no separate
            Community tab — Members IS the community view. */}
        {activeTab === 'members' && (
          <div className="space-y-8 w-full">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">👥 {t('Members')}</h2>
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

            {isOwner && (
              <PotSnsUpsell variant="creator" potPubkey={pubkey} potName={pot.name} />
            )}
            {isMember && !isOwner && (
              <PotSnsUpsell variant="member" potPubkey={pubkey} />
            )}

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">🏛️ {t('Governance')}</h2>
                {isLive && <StatusBadge tier="live" compact />}
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
              </div>
              <p className="text-xs text-pot-muted mb-4 break-words">
                Sits on top of the base layer. Configure rules, presets and a delegate so your AI
                can vote on or auto-create proposals when the base AI flags an opportunity.
              </p>
              <AIAgentPanel potPubkey={pubkey} pot={pot} />
            </div>

            {/* AI Rebalancing — Pro feature, gated */}
            <LockGate
              locked={!hasPro}
              title="AI Rebalancing Alerts"
              requiredTier="Pro"
              onUpgrade={() => setUpgradeOpen(true)}
            >
              <div className="bg-pot-card/50 border border-pot-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚖️</span>
                  <h3 className="font-bold text-white text-lg">AI Rebalancing Alerts</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pot-green/15 text-pot-green uppercase tracking-wide">Pro</span>
                </div>
                {[
                  '⚖️ Drift detected: SOL allocation 12% above target — rebalance suggested',
                  '📉 USDC reserve below 15% floor — AI proposes trimming JUP',
                  '🔔 Weekly digest: NAV +3.2%, 2 rebalances executed',
                ].map((a) => (
                  <div key={a} className="rounded-lg border border-pot-border bg-pot-dark px-3 py-2 text-sm text-pot-muted">
                    {a}
                  </div>
                ))}
              </div>
            </LockGate>
          </div>
        )}

        {/* ════════════════════ FEATURES TAB ════════════════════
            Roadmap surface: Tamagotchi · Premium · Privacy preview.
            Each block carries its phase chip; nothing is hidden, nothing is
            over-promised. Links to /roadmap for the full inventory. */}
        {activeTab === 'features' && (
          <div className="space-y-6 w-full">
            {/* Roadmap banner + STAMPPOT preview removed — both belong on
                /roadmap (and STAMPPOT is now a top-level mode on /create
                and the landing). The Features tab on the pot page is for
                what this specific vault unlocks today: Tamagotchi
                progression and the premium NFT/SNS extras. */}

            <TamagotchiBlock stats={tamaStats} />

            <PremiumFeatures
              potPubkey={tryPublicKey(pubkey) ?? new PublicKey('11111111111111111111111111111111')}
              potName={pot.name}
              tamagotchiLevel={Math.max(1, Math.min(5, Math.floor(tamaStats.hp / 20) + 1))}
              isTokenized={!!potAny.isTokenized}
              hasSnsdomain={!!snsName}
              hasTamagotchiNft={!!potAny.hasTamagotchiNft}
              snsAddress={snsName || undefined}
            />

            {/* Pro+ curated strategies — gated */}
            <LockGate
              locked={!hasProPlus}
              title="Curated Strategies & Alpha Vault"
              requiredTier="Pro+"
              onUpgrade={() => setUpgradeOpen(true)}
            >
              <div className="bg-pot-card border border-pot-accent/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  <h3 className="font-bold text-white text-lg">Curated Strategies</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pot-accent/15 text-pot-accent uppercase tracking-wide">Pro+</span>
                </div>
                <p className="text-sm text-pot-muted">
                  Hand-picked, risk-managed strategies from the PotBot research desk, plus
                  early access to the Alpha Vault.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'Delta-Neutral JLP', apy: '~35% APY', tag: 'Market-neutral' },
                    { name: 'Blue-chip Momentum', apy: '~48% APY', tag: 'Trend-following' },
                  ].map((s) => (
                    <div key={s.name} className="rounded-xl border border-pot-border bg-pot-dark p-3">
                      <p className="text-sm font-bold text-white">{s.name}</p>
                      <p className="text-xs text-pot-green mt-0.5">{s.apy}</p>
                      <p className="text-[10px] text-pot-muted mt-1">{s.tag}</p>
                    </div>
                  ))}
                </div>
              </div>
            </LockGate>
          </div>
        )}
      </div>

      <SubscriptionModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}

/**
 * Wraps a native <details> so its children mount lazily on first
 * expansion. Avoids running expensive child fetches (Dune SIM,
 * sub-queries) when the disclosure is collapsed — which is the default
 * state for the portfolio sections on /pots/[pubkey].
 */
function DeferredDetails({
  summary,
  className,
  children,
}: {
  summary: ReactNode
  className?: string
  children: ReactNode
}) {
  const [opened, setOpened] = useState(false)
  return (
    <details
      className={className}
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) setOpened(true)
      }}
    >
      <summary className="cursor-pointer text-xs text-white font-semibold">{summary}</summary>
      {opened ? children : null}
    </details>
  )
}
