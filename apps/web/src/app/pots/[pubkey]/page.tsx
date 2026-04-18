'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import {
  usePot,
  useMembers,
  useProposals,
  useCreateProposal,
  useVote,
  useExecuteProposal,
} from '@/hooks/usePots'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'
import { SharesPanel } from '@/components/SharesPanel'
import { PnLDashboard } from '@/components/PnLDashboard'
import { VaultAnalyticsStrip } from '@/components/VaultAnalyticsStrip'
import { StrategyPanel } from '@/components/StrategyPanel'
import { AIAgentPanel } from '@/components/AIAgentPanel'
import { GovernanceSettings } from '@/components/GovernanceSettings'
import { VaultTab } from '@/components/VaultTab'
import DepositPanel from '@/components/DepositPanel'
import SharesTab from '@/components/SharesTab'
import { JupiterSwapPanel } from '@/components/JupiterSwapPanel'
import { BudgetGrantPanel } from '@/components/BudgetGrantPanel'
import { reverseSNS } from '@/lib/sns'

const TABS = ['overview', 'proposals', 'shares', 'positions', 'strategy', 'governance', 'agent', 'members', 'deposit', 'vault'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  overview:   'Overview',
  proposals:  '🗳️ Proposals',
  shares:     '🪙 Shares',
  positions:  '📊 P&L',
  strategy:   '⚙️ Strategy',
  governance: '🏛️ Gov',
  agent:      '🤖 AI',
  members:    'Members',
  deposit:    '💰 Deposit',
  vault:      '🏠 Vault',
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
  const execute = useExecuteProposal()
  const statusClass = STATUS_COLORS[proposal.status] ?? 'bg-pot-muted/20 text-pot-muted'
  const statusLabel = STATUS_LABELS[proposal.status] ?? proposal.status

  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
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
            <div
              className="h-full bg-pot-green rounded-full transition-all"
              style={{ width: `${proposal.yesPercent ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-pot-green font-mono w-10 text-right">{proposal.yesPercent ?? 0}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-pot-muted w-8">NO</span>
          <div className="flex-1 h-2 bg-pot-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all"
              style={{ width: `${proposal.noPercent ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-red-400 font-mono w-10 text-right">{proposal.noPercent ?? 0}%</span>
        </div>
      </div>

      {/* Actions */}
      {canVote && proposal.status === 'active' && (
        <div className="flex gap-3 pt-1">
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
        <button
          onClick={() => execute.mutate({ potAddress, proposalAddress: proposal.pubkey })}
          disabled={execute.isPending}
          className="w-full py-2 rounded-xl text-sm font-bold bg-pot-accent hover:bg-pot-accent/90 text-white transition disabled:opacity-50"
        >
          🚀 Execute Proposal
        </button>
      )}
    </div>
  )
}

export default function PotPage() {
  const params = useParams()
  const { publicKey: userPubkey } = useWallet()

  const pubkey = params.pubkey as string
  const { data: pot, isLoading: isPotLoading } = usePot(pubkey)
  const { data: members = [] } = useMembers(pubkey)
  const { data: proposals = [] } = useProposals(pubkey)

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [snsName, setSnsName] = useState<string>('')
  const [isMember, setIsMember] = useState(false)
  const [showSwapProposal, setShowSwapProposal] = useState(false)
  const [showBudgetGrant, setShowBudgetGrant] = useState(false)

  const createProposal = useCreateProposal()

  // Fetch SNS name
  useEffect(() => {
    (async () => {
      const name = await reverseSNS(pubkey)
      setSnsName(name)
    })()
  }, [pubkey])

  // Check membership — mock data uses m.wallet, on-chain uses m.wallet too
  useEffect(() => {
    if (!userPubkey) { setIsMember(false); return }
    const userStr = userPubkey.toString()
    const member = members.find(
      (m: any) => (m.wallet ?? m.pubkey) === userStr
    )
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
  const ownerAddress: string = potAny.authority ?? potAny.owner ?? ''
  const isOwner = userPubkey?.toString() === ownerAddress
  const canManage = isOwner || isMember
  const canVote = canManage  // members + owner can vote
  const canExecute = isOwner // only owner can execute proposals

  const tamaStats = calculateTamaStats({
    tradeVolume: potAny.totalVolume ?? 0,
    memberCount: potAny.memberCount ?? 0,
    winRate: 0.5,
    yieldApy: 0,
    ageSeconds: 86400,
  })

  // nextProposalId for creating proposals
  const nextProposalId = (potAny.nextProposalId ?? proposals.length) as number

  return (
    <div className="min-h-screen bg-pot-dark pb-12">
      {/* Header */}
      <div className="bg-gradient-to-b from-pot-card to-pot-dark border-b border-pot-border px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-6xl">{pot.emoji}</div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{pot.name}</h1>
                {snsName && (
                  <p className="text-sm font-mono text-pot-green">{snsName}</p>
                )}
                <p className="text-xs text-pot-muted font-mono mt-1 break-all">{pubkey}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {userPubkey && (
                <div className="flex gap-2">
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
            {potAny.isPublic && (
              <span className="px-3 py-1 bg-pot-accent/20 text-pot-accent text-xs rounded-full font-semibold">🌍 Public</span>
            )}
            {potAny.isActive && (
              <span className="px-3 py-1 bg-pot-green/20 text-pot-green text-xs rounded-full font-semibold">✓ Active</span>
            )}
            {isMember && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-semibold">🙋 Member</span>
            )}
            {isOwner && (
              <span className="px-3 py-1 bg-pot-accent/30 text-pot-accent text-xs rounded-full font-semibold">👑 Owner</span>
            )}
            {tamaStats.hp < 30 && (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">🔥 Low HP!</span>
            )}
          </div>
        </div>
      </div>

      {/* Analytics strip — members only */}
      {canManage && <VaultAnalyticsStrip pubkey={pubkey} />}

      {/* Tabs */}
      <div className="border-b border-pot-border bg-pot-dark sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto">
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-pot-card border border-pot-border rounded-2xl p-4">
                <div className="text-xs text-pot-muted mb-1">Total Value Locked (SOL)</div>
                <div className="text-2xl font-bold text-white">{pot.balance.toFixed(2)}</div>
              </div>
              <div className="bg-pot-card border border-pot-border rounded-2xl p-4">
                <div className="text-xs text-pot-muted mb-1">Members</div>
                <div className="text-2xl font-bold text-white">{pot.memberCount}</div>
              </div>
              <div className="bg-pot-card border border-pot-border rounded-2xl p-4">
                <div className="text-xs text-pot-muted mb-1">Trades Executed</div>
                <div className="text-2xl font-bold text-white">{pot.tradeCount}</div>
              </div>
              <div className="bg-pot-card border border-pot-border rounded-2xl p-4">
                <div className="text-xs text-pot-muted mb-1">Tamagotchi HP</div>
                <div className="text-2xl font-bold text-pot-green">{tamaStats.hp}/100</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SharesPanel potPubkey={pubkey} />
              </div>
              <div>
                <PnLDashboard potPubkey={pubkey} vaultBalanceSol={pot.balance} />
              </div>
            </div>

            {/* Active proposals callout */}
            {proposals.filter((p: any) => p.status === 'active').length > 0 && (
              <div className="bg-pot-accent/10 border border-pot-accent/30 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-pot-accent font-bold">🗳️ {proposals.filter((p: any) => p.status === 'active').length} active proposal{proposals.filter((p: any) => p.status === 'active').length > 1 ? 's' : ''} need your vote</p>
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

            {potAny.yieldStrategy && (
              <div className="bg-pot-card border border-pot-border/50 rounded-2xl p-6">
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
          </div>
        )}

        {/* ── Proposals ── */}
        {activeTab === 'proposals' && (
          <div className="space-y-6">
            {/* Create proposal actions */}
            {canManage && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setShowSwapProposal(!showSwapProposal); setShowBudgetGrant(false) }}
                  className="px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-xl text-sm font-bold transition"
                >
                  🔄 Propose Swap
                </button>
                <button
                  onClick={() => { setShowBudgetGrant(!showBudgetGrant); setShowSwapProposal(false) }}
                  className="px-4 py-2 bg-pot-green/20 hover:bg-pot-green/30 text-pot-green border border-pot-green/30 rounded-xl text-sm font-bold transition"
                >
                  💸 Budget Grant
                </button>
              </div>
            )}

            {/* Swap proposal form */}
            {showSwapProposal && canManage && (
              <div className="bg-pot-card border border-pot-border rounded-2xl overflow-hidden">
                <div className="px-5 pt-5 pb-2 border-b border-pot-border flex items-center justify-between">
                  <h3 className="font-bold text-white">Propose Swap</h3>
                  <button onClick={() => setShowSwapProposal(false)} className="text-pot-muted hover:text-white text-lg">✕</button>
                </div>
                <JupiterSwapPanel
                  mode="vault"
                  potPubkey={pubkey}
                  vaultBalance={pot.balance}
                  onPropose={async ({ fromMint, toMint, amountSol, description }) => {
                    await createProposal.mutateAsync({
                      potAddress: pubkey,
                      nextProposalId,
                      proposalType: { swap: { fromMint, toMint, amount: Math.round(amountSol * 1e9) } },
                      description,
                    })
                    setShowSwapProposal(false)
                  }}
                />
              </div>
            )}

            {/* Budget grant form */}
            {showBudgetGrant && canManage && (
              <div className="bg-pot-card border border-pot-border rounded-2xl overflow-hidden">
                <div className="px-5 pt-5 pb-2 border-b border-pot-border flex items-center justify-between">
                  <h3 className="font-bold text-white">Budget Grant</h3>
                  <button onClick={() => setShowBudgetGrant(false)} className="text-pot-muted hover:text-white text-lg">✕</button>
                </div>
                <BudgetGrantPanel
                  potPubkey={pubkey}
                  pot={{ ...potAny, nextProposalId }}
                  currentUserPubkey={userPubkey?.toString()}
                />
              </div>
            )}

            {/* Proposals list */}
            {proposals.length === 0 ? (
              <div className="text-center py-16 bg-pot-card border border-pot-border rounded-2xl">
                <div className="text-5xl mb-4">🗳️</div>
                <p className="text-white font-semibold mb-1">No proposals yet</p>
                <p className="text-pot-muted text-sm">
                  {canManage ? 'Create the first proposal above.' : 'Join the vault to create proposals.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((p: any) => (
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
        )}

        {/* ── Shares ── */}
        {activeTab === 'shares' && <SharesTab potPubkey={pubkey} />}

        {/* ── Positions / P&L ── */}
        {activeTab === 'positions' && <PnLDashboard potPubkey={pubkey} vaultBalanceSol={pot.balance} />}

        {/* ── Strategy ── */}
        {activeTab === 'strategy' && <StrategyPanel potPubkey={pubkey} />}

        {/* ── Governance Settings ── */}
        {activeTab === 'governance' && <GovernanceSettings isAdmin={isOwner} potPubkey={pubkey} />}

        {/* ── AI Agent ── */}
        {activeTab === 'agent' && <AIAgentPanel potPubkey={pubkey} pot={pot} />}

        {/* ── Members ── */}
        {activeTab === 'members' && (
          <div className="space-y-4">
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
                          <p className="text-xs text-pot-muted mt-0.5">
                            Joined {new Date(m.joinedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold">{m.shares?.toLocaleString() ?? 0} shares</p>
                        <p className="text-xs text-pot-muted">{sharesPct}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Deposit ── open to ANY connected wallet so non-members can join */}
        {activeTab === 'deposit' && userPubkey && (
          <DepositPanel potPubkey={pubkey} potName={pot.name} vaultBalance={pot.balance} />
        )}
        {activeTab === 'deposit' && !userPubkey && (
          <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">💰</div>
            <p className="text-white font-semibold mb-2">Connect your wallet to deposit</p>
            <p className="text-pot-muted text-sm">Depositing SOL will give you shares in this vault.</p>
          </div>
        )}

        {/* ── Vault ── members / owner only */}
        {activeTab === 'vault' && canManage && (
          <VaultTab potPubkey={pubkey} isCreator={isOwner} />
        )}
        {activeTab === 'vault' && !canManage && (
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
        )}
      </div>
    </div>
  )
}
