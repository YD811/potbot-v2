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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-5xl">🪴</div>
      </div>
    )
  }

  if (!pot) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">🔍</div>
        <h2 className="text-xl font-bold text-white mb-2">POT not found</h2>
        <p className="text-pot-muted mb-4">This vault doesn't exist or hasn't been created yet.</p>
        <Link href="/" className="text-blue-400 hover:underline">← Back to all POTs</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0E11] to-[#1A1B22] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0D0E11]/95 backdrop-blur border-b border-[#1A2332]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{pot.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{pot.name}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Public key: {pubkey.slice(0, 10)}...{pubkey.slice(-10)}</p>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors text-sm ${
                  tab === t
                    ? 'bg-[#9945FF] text-white'
                    : 'bg-[#1A2332] text-gray-400 hover:bg-[#243044]'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="grid gap-6">
            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1A2332] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Balance</p>
                <p className="text-lg font-bold text-white">{pot.balance.toFixed(2)} SOL</p>
              </div>
              <div className="bg-[#1A2332] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Members</p>
                <p className="text-lg font-bold text-white">{pot.memberCount}</p>
              </div>
              <div className="bg-[#1A2332] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Trades</p>
                <p className="text-lg font-bold text-white">{pot.tradeCount}</p>
              </div>
              <div className="bg-[#1A2332] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Volume</p>
                <p className="text-lg font-bold text-white">{pot.totalVolume.toFixed(1)} SOL</p>
              </div>
            </div>

            {/* Tamagotchi section */}
            {true && (
              <div className="bg-gradient-to-br from-[#1A2332] to-[#0D1117] rounded-xl p-8 border border-[#243044]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-6xl">{pot.emoji}</div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Pot Health</h2>
                    <p className="text-gray-400">Level {pot.tamagotchiLevel} • {pot.tamagotchiXp.toLocaleString()} XP</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Experience</span>
                    <span>{pot.tamagotchiXp.toLocaleString()} / {(pot.tamagotchiLevel * 5000).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-[#0D1117] rounded-full h-2 overflow-hidden border border-[#1A2332]">
                    <div
                      className="bg-gradient-to-r from-[#9945FF] to-[#14F195] h-full transition-all"
                      style={{ width: `${Math.min(100, (pot.tamagotchiXp / (pot.tamagotchiLevel * 5000)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Holdings */}
            {pot.holdings && pot.holdings.length > 0 && (
              <div className="bg-[#1A2332] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Holdings</h3>
                <div className="space-y-3">
                  {pot.holdings.map((h) => (
                    <div key={h.mint} className="flex items-center justify-between p-3 bg-[#0D1117] rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{h.icon}</span>
                        <div>
                          <p className="font-semibold text-white text-sm">{h.symbol}</p>
                          <p className="text-xs text-gray-500">{h.mint.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <p className="font-bold text-white">{h.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shares tab */}
        {tab === 'shares' && (
          <SharesPanel pubkey={pubkey} />
        )}

        {/* Positions tab */}
        {tab === 'positions' && (
          <PnLDashboard pubkey={pubkey} />
        )}

        {/* Strategy tab */}
        {tab === 'strategy' && (
          <StrategyPanel pubkey={pubkey} />
        )}

        {/* Governance tab */}
        {tab === 'governance' && (
          <GovernanceSettings pubkey={pubkey} />
        )}

        {/* AI Agent tab */}
        {tab === 'agent' && (
          <AIAgentPanel pubkey={pubkey} />
        )}

        {/* Members tab */}
        {tab === 'members' && (
          <div className="bg-[#1A2332] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0D1117] border-b border-[#243044]">
                    <th className="px-6 py-4 text-left font-semibold text-gray-400">Member</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-400">Shares</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-400">%</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-400">Deposited</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-400">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243044]">
                  {/* Mock members */}
                  {[1, 2, 3].map((i) => {
                    const shares = Math.floor(Math.random() * 50000) + 1000
                    const sharePercent = (shares / pot.totalShares) * 100
                    const depositTotal = Math.random() * 50 + 1
                    const pnl = (Math.random() - 0.5) * 10
                    return (
                      <tr key={i} className="hover:bg-[#243044] transition-colors">
                        <td className="px-6 py-3"><span className="text-gray-300 font-mono">Member{i}</span></td>
                        <td className="text-right font-mono">{shares.toLocaleString()}</td>
                        <td className="text-right font-mono">{sharePercent.toFixed(1)}%</td>
                        <td className="text-right font-mono">{depositTotal.toFixed(2)}</td>
                        <td className={`text-right font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
