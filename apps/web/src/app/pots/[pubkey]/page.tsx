'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
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
import { StrategyPanel } from '@/components/StrategyPanel'
import { AIAgentPanel } from '@/components/AIAgentPanel'
import { GovernanceSettings } from '@/components/GovernanceSettings'
import { BudgetGrantPanel } from '@/components/BudgetGrantPanel'
import { JupiterSwapPanel } from '@/components/JupiterSwapPanel'
import { fetchPricesRaw } from '@/lib/useAIAgent-helpers'
import { reverseSNS, getPotShareText, buildPotDomain } from '@/lib/sns'

const TABS = ['overview', 'shares', 'positions', 'strategy', 'governance', 'agent', 'members'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  overview:   'Overview',
  shares:     '🪙 Shares',
  positions:  '📊 P&L',
  strategy:   '⚙️ Strategy',
  governance: '🏛️ Gov',
  agent:      '🤖 AI',
  members:    'Members',
}

export default function PotDetailPage() {
  const { pubkey } = useParams<{ pubkey: string }>()
  const { publicKey, connected } = useWallet()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: pot, isLoading } = usePot(pubkey)
  const [snsName, setSnsName] = useState<string | null>(null)

  // Resolve SNS domain for this pot
  useEffect(() => {
    if (pubkey) {
      reverseSNS(pubkey).then(name => setSnsName(name ?? null))
    }
  }, [pubkey])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-5xl">🪴</div>
      </div>
    )
  }

  if (!pot) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-2xl text-gray-500">Pot not found</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header with pot name, SNS domain, and emoji */}
      <div className="mb-8 border-b pb-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{pot.emoji}</span>
          <div>
            <h1 className="text-4xl font-bold text-white">{pot.name}</h1>
            {snsName && (
              <p className="text-lg text-gray-400 font-mono">{snsName}</p>
            )}
          </div>
        </div>
        <p className="text-gray-400 text-sm font-mono break-all">{pot.pubkey}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-700 overflow-x-auto">
        {TABS.map(tabName => (
          <button
            key={tabName}
            onClick={() => setTab(tabName)}
            className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
              tab === tabName
                ? 'text-white border-b-2 border-green-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {TAB_LABELS[tabName]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {tab === 'overview' && (
          <OverviewTab pot={pot} />
        )}
        {tab === 'shares' && (
          <SharesTab pot={pot} pubkey={pubkey} />
        )}
        {tab === 'positions' && (
          <PositionsTab pot={pot} />
        )}
        {tab === 'strategy' && (
          <StrategyTab pot={pot} pubkey={pubkey} />
        )}
        {tab === 'governance' && (
          <GovernanceTab pot={pot} pubkey={pubkey} />
        )}
        {tab === 'agent' && (
          <AgentTab pot={pot} pubkey={pubkey} />
        )}
        {tab === 'members' && (
          <MembersTab pot={pot} pubkey={pubkey} />
        )}
      </div>
    </div>
  )
}

function OverviewTab({ pot }: { pot: any }) {
  const stats = calculateTamaStats(pot.tamagotchiLevel, pot.tamagotchiXp)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left: Stats */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-white">Pot Stats</h2>
        <div className="space-y-4">
          <StatItem label="Balance" value={`${pot.balance.toFixed(2)} SOL`} />
          <StatItem label="Members" value={pot.memberCount.toString()} />
          <StatItem label="Trades" value={pot.tradeCount.toString()} />
          <StatItem label="Total Volume" value={`${(pot.totalVolume / 1e9).toFixed(2)} SOL`} />
          <StatItem label="Yield Strategy" value={['None', 'Conservative', 'Balanced', 'Aggressive', 'JLP'][pot.yieldStrategy] || 'Unknown'} />
          <StatItem label="Yield Earned" value={`${(pot.yieldEarned || 0).toFixed(4)} SOL`} />
          <StatItem label="Created" value={new Date(pot.createdAt).toLocaleDateString()} />
        </div>
      </div>

      {/* Right: Tamagotchi */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-white">Tamagotchi Status</h2>
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <div className="text-center text-6xl mb-4">🪴</div>
          <StatItem label="Level" value={pot.tamagotchiLevel.toString()} />
          <StatItem label="XP" value={pot.tamagotchiXp.toString()} />
          <StatItem label="Health" value={`${stats.health}%`} />
          <StatItem label="Happiness" value={`${stats.happiness}%`} />
          <StatItem label="Growth" value={`${stats.growth}%`} />
        </div>
      </div>
    </div>
  )
}

function SharesTab({ pot, pubkey }: { pot: any, pubkey: string }) {
  const { data: members } = useMembers(pubkey)

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Share Distribution</h2>
      <SharesPanel pot={pot} />
      
      {members && members.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4 text-white">Members</h3>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-800 p-4 rounded">
                <span className="text-gray-300 font-mono text-sm">{m.pubkey.slice(0, 8)}...</span>
                <span className="text-white font-bold">{m.shares.toFixed(2)} shares</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PositionsTab({ pot }: { pot: any }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">P&L Dashboard</h2>
      <PnLDashboard pot={pot} />
    </div>
  )
}

function StrategyTab({ pot, pubkey }: { pot: any, pubkey: string }) {
  return (
    <div className="space-y-8">
      <StrategyPanel pot={pot} />
      <BudgetGrantPanel potPubkey={pubkey} />
    </div>
  )
}

function GovernanceTab({ pot, pubkey }: { pot: any, pubkey: string }) {
  const { data: proposals, isLoading: proposalsLoading } = useProposals(pubkey)
  const { mutate: executeProposal } = useExecuteProposal()
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (proposalsLoading) {
    return <div className="text-gray-400">Loading proposals...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-6 text-white">Governance</h2>
        <GovernanceSettings pot={pot} />
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 text-white">Proposals ({proposals?.length || 0})</h3>
        {proposals && proposals.length > 0 ? (
          <div className="space-y-3">
            {proposals.map((p: any) => {
              // Determine badge for proposal type
              const getBadge = () => {
                if (p.proposalType === 'limitOrder') return '⚡ Limit Order'
                if (p.proposalType === 'dca') return '🔄 DCA'
                return '🔀 Swap'
              }

              return (
                <div
                  key={p.id}
                  className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-900 text-blue-100 rounded text-sm font-medium">
                          {getBadge()}
                        </span>
                        <h4 className="font-bold text-white">{p.title}</h4>
                      </div>
                      <p className="text-gray-400 text-sm">{p.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ml-2 ${
                      p.status === 'active' ? 'bg-yellow-900 text-yellow-100' :
                      p.status === 'passed' ? 'bg-green-900 text-green-100' :
                      p.status === 'executed' ? 'bg-blue-900 text-blue-100' :
                      'bg-red-900 text-red-100'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Voting info */}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Yes:</span>
                      <span className="text-green-400 font-bold">{p.yesVotes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">No:</span>
                      <span className="text-red-400 font-bold">{p.noVotes}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedId === p.id && (
                    <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                      <DetailRow label="ID" value={p.id.toString()} />
                      <DetailRow label="Type" value={p.proposalType} />
                      <DetailRow label="Status" value={p.status} />
                      {p.inputMint && <DetailRow label="Input Mint" value={p.inputMint.slice(0, 8) + '...'} />}
                      {p.outputMint && <DetailRow label="Output Mint" value={p.outputMint.slice(0, 8) + '...'} />}
                      {p.inputAmount && <DetailRow label="Amount" value={p.inputAmount.toFixed(2)} />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (p.status === 'passed') {
                            executeProposal({ proposalId: p.id.toString(), potPubkey: pubkey })
                          }
                        }}
                        disabled={p.status !== 'passed' || p.executed}
                        className={`mt-3 px-4 py-2 rounded font-medium transition ${
                          p.status === 'passed' && !p.executed
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {p.executed ? 'Executed' : 'Execute'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400">No proposals yet</p>
        )}
      </div>
    </div>
  )
}

function AgentTab({ pot, pubkey }: { pot: any, pubkey: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">AI Agent Control</h2>
      <AIAgentPanel pot={pot} potPubkey={pubkey} />
    </div>
  )
}

function MembersTab({ pot, pubkey }: { pot: any, pubkey: string }) {
  const { data: members } = useMembers(pubkey)

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Members</h2>
      {members && members.length > 0 ? (
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
              <span className="text-gray-300 font-mono text-sm">{m.pubkey}</span>
              <span className="text-white font-bold">{m.shares.toFixed(2)} shares</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No members yet</p>
      )}
    </div>
  )
}

/* ── Helper Components ────────────────────────────────────────────────────────── */

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  )
}
