'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import {
  usePot,
  useMembers,
  useProposals,
  useDeposit,
  useWithdraw,
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
import { BudgetGrantPanel } from '@/components/BudgetGrantPanel'
import { JupiterSwapPanel } from '@/components/JupiterSwapPanel'
import { VaultTab } from '@/components/VaultTab'
import DepositPanel from '@/components/DepositPanel'
import SharesTab from '@/components/SharesTab'
import { fetchPricesRaw } from '@/lib/useAIAgent-helpers'
import { reverseSNS, getPotShareText, buildPotDomain } from '@/lib/sns'

const TABS = ['overview', 'shares', 'positions', 'strategy', 'governance', 'agent', 'members', 'deposit', 'vault'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  overview:   'Overview',
  shares:     '🪙 Shares',
  positions:  '📊 P&L',
  strategy:   '⚙️ Strategy',
  governance: '🏛️ Gov',
  agent:      '🤖 AI',
  members:    'Members',
  deposit:    '💰 Deposit',
  vault:      '🏠 Vault',
}

export default function PotPage() {
  const params = useParams()
  const router = useRouter()
  const { publicKey: userPubkey } = useWallet()

  const pubkey = params.pubkey as string
  const { data: pot, isLoading: isPotLoading } = usePot(pubkey)
  const { data: members = [] } = useMembers(pubkey)
  const { data: proposals = [] } = useProposals(pubkey)

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [snsName, setSnsName] = useState<string>('')
  const [isMember, setIsMember] = useState(false)
  const [userShares, setUserShares] = useState<any>(null)

  // Fetch SNS name
  useEffect(() => {
    (async () => {
      const name = await reverseSNS(pubkey)
      setSnsName(name)
    })()
  }, [pubkey])

  // Check membership
  useEffect(() => {
    if (!userPubkey) return
    const member = members.find((m: any) => m.pubkey === userPubkey.toString())
    setIsMember(!!member)
    if (member) setUserShares(member.shares)
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

  const isOwner = userPubkey?.toString() === pot.owner
  const canManage = isOwner || isMember
  const tamaStats = calculateTamaStats(pot)

  return (
    <div className="min-h-screen bg-pot-dark pb-12">
      {/* Header with emoji, name, SNS */}
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
                  {isMember && (
                    <button className="px-3 py-2 text-xs bg-pot-border hover:bg-pot-accent/20 text-white rounded-lg transition">
                      👋 Leave
                    </button>
                  )}
                </div>
              )}
              <div className="text-right">
                <div className="text-xs text-pot-muted">Owner</div>
                <p className="text-xs font-mono text-pot-green break-all max-w-xs text-right">{pot.owner}</p>
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            {pot.isPublic && (
              <span className="px-3 py-1 bg-pot-accent/20 text-pot-accent text-xs rounded-full font-semibold">🌍 Public</span>
            )}
            {pot.isActive && (
              <span className="px-3 py-1 bg-pot-green/20 text-pot-green text-xs rounded-full font-semibold">✓ Active</span>
            )}
            {tamaStats.hunger > 70 && (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">🔥 Hungry!</span>
            )}
          </div>
        </div>
      </div>

      {/* Analytics strip */}
      {isMember && <VaultAnalyticsStrip pubkey={pubkey} />}

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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Hero stats grid */}
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
                <div className="text-xs text-pot-muted mb-1">Tamagotchi Health</div>
                <div className="text-2xl font-bold text-pot-green">{tamaStats.health}/100</div>
              </div>
            </div>

            {/* Main panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SharesPanel vault={pot} userShares={userShares} />
              </div>
              <div>
                <PnLDashboard pubkey={pubkey} />
              </div>
            </div>

            {/* Strategy callout */}
            {pot.strategy && (
              <div className="bg-pot-card border border-pot-border/50 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">⚙️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-2">Active Strategy</h3>
                    <p className="text-sm text-pot-muted mb-4">This vault runs an automated {pot.strategy} strategy.</p>
                    <button className="px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-lg text-sm font-semibold transition">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shares' && <SharesTab pubkey={pubkey} />}
        {activeTab === 'positions' && <PnLDashboard pubkey={pubkey} />}
        {activeTab === 'strategy' && <StrategyPanel pubkey={pubkey} />}
        {activeTab === 'governance' && <GovernanceSettings pubkey={pubkey} proposals={proposals} />}
        {activeTab === 'agent' && <AIAgentPanel pubkey={pubkey} />}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {members.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-pot-muted">No members yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m: any) => (
                  <div key={m.pubkey} className="flex items-center justify-between bg-pot-card border border-pot-border rounded-xl p-4">
                    <div>
                      <p className="text-white font-mono text-sm break-all">{m.pubkey}</p>
                      <p className="text-xs text-pot-muted">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{m.shares} shares</p>
                      <p className="text-xs text-pot-muted">{((m.shares / pot.totalShares) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'deposit' && canManage && <DepositPanel pubkey={pubkey} />}
        {activeTab === 'deposit' && !canManage && (
          <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
            <p className="text-pot-muted mb-4">You must be a member to access deposits.</p>
            <button
              onClick={() => setActiveTab('overview')}
              className="px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-lg font-semibold transition"
            >
              Back to Overview
            </button>
          </div>
        )}
        {activeTab === 'vault' && canManage && <VaultTab pubkey={pubkey} />}
        {activeTab === 'vault' && !canManage && (
          <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
            <p className="text-pot-muted mb-4">You must be a member to access vault settings.</p>
            <button
              onClick={() => setActiveTab('overview')}
              className="px-4 py-2 bg-pot-accent hover:bg-pot-accent/90 text-white rounded-lg font-semibold transition"
            >
              Back to Overview
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
