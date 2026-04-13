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
        <Link href="/" className="btn-primary text-sm">Back to Dashboard</Link>
      </div>
    )
  }

  const tama = calculateTamaStats({
    tradeVolume: 0,
    memberCount: pot.memberCount,
    winRate: 0.6,
    yieldApy: 0.05,
    ageSeconds: (Date.now() - pot.createdAt.getTime()) / 1000,
  })

  // Determine if current user is admin (pot creator)
  const isAdmin = publicKey?.toString() === pot.admin

  return (
    <div>
      {/* Back link */}
      <Link href="/" className="text-pot-muted hover:text-white text-sm mb-6 inline-block">
        &larr; Back to Dashboard
      </Link>

      {/* Header card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{pot.emoji}</span>
              <div>
                <h1 className="text-2xl font-bold text-white">{pot.name}</h1>
                <span className="text-xs text-pot-muted font-mono">
                  {pot.pubkey.slice(0, 8)}...{pot.pubkey.slice(-8)}
                </span>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-pot-muted mt-2">
              <span>Balance: <span className="text-pot-green font-mono font-bold">{pot.balance.toFixed(4)} SOL</span></span>
              <span>Members: <span className="text-white">{pot.memberCount}</span></span>
              <span>Trades: <span className="text-white">{pot.tradeCount}</span></span>
            </div>
          </div>

          {/* Tamagotchi */}
          <div className="text-center">
            <div className="text-4xl mb-1">{tama.emoji}</div>
            <div className="text-xs text-pot-muted">Lv.{tama.level} {tama.stage}</div>
            <div className="w-20 h-1.5 bg-pot-dark rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-pot-accent rounded-full transition-all"
                style={{ width: `${Math.min(100, (tama.xp / Math.max(tama.xp + tama.xpToNext, 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-2 mt-4">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            pot.isPublic ? 'bg-pot-green/10 text-pot-green' : 'bg-pot-accent/10 text-pot-accent'
          }`}>
            {pot.isPublic ? 'Public' : 'Private'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-pot-border text-pot-muted">
            {pot.yieldStrategy}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-pot-border text-pot-muted">
            L{pot.governanceLevel} Trade Gov
          </span>
          {/* ETF tokenization mode badge */}
          {pot.mode === 'tokenized' ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1">
              🪙 TOKENIZED · ${pot.tokenTicker}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-pot-dark text-pot-muted border border-pot-border">
              Virtual shares
            </span>
          )}
          {isAdmin && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              👑 Admin
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-pot-card rounded-xl p-1 border border-pot-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === t
                ? 'bg-pot-accent text-white shadow-lg shadow-pot-accent/20'
                : 'text-pot-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === 'overview' && <OverviewPanel potPubkey={pubkey} pot={pot} />}
      {tab === 'shares' && <SharesPanel potPubkey={pubkey} />}
      {tab === 'positions' && (
        <PnLDashboard potPubkey={pubkey} vaultBalanceSol={pot.balance} />
      )}
      {tab === 'strategy' && <StrategyPanel potPubkey={pubkey} />}
      {tab === 'governance' && (
        <GovernancePanel
          potPubkey={pubkey}
          pot={pot}
          isAdmin={isAdmin}
          currentUserPubkey={publicKey?.toString()}
        />
      )}
      {tab === 'agent' && (
        <AIAgentPanel potPubkey={pubkey} pot={pot} />
      )}
      {tab === 'members' && <MembersPanel potPubkey={pubkey} />}
    </div>
  )
}

/* ── Overview ── */

function OverviewPanel({ potPubkey, pot }: { potPubkey: string; pot: any }) {
  const { connected } = useWallet()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawShares, setWithdrawShares] = useState('')

  const deposit = useDeposit()
  const withdraw = useWithdraw()

  const handleDeposit = async () => {
    const sol = parseFloat(depositAmount)
    if (isNaN(sol) || sol <= 0) return
    try {
      await deposit.mutateAsync({ potAddress: potPubkey, amountSol: sol })
      setDepositAmount('')
    } catch (e) { console.error('Deposit failed:', e) }
  }

  const handleWithdraw = async () => {
    const shares = parseInt(withdrawShares)
    if (isNaN(shares) || shares <= 0) return
    try {
      await withdraw.mutateAsync({ potAddress: potPubkey, shares })
      setWithdrawShares('')
    } catch (e) { console.error('Withdraw failed:', e) }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Vault info */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Vault</h3>
        <div className="space-y-3">
          {[
            ['Total Balance', `${pot.balance.toFixed(4)} SOL`, 'text-pot-green'],
            ['Total Shares', pot.totalShares.toLocaleString(), ''],
            ['Strategy', pot.yieldStrategy, ''],
            ['Created', pot.createdAt.toLocaleDateString(), ''],
          ].map(([label, value, color]) => (
            <div key={label as string} className="flex justify-between text-sm">
              <span className="text-pot-muted">{label}</span>
              <span className={`font-mono ${color || 'text-white'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        {!connected ? (
          <p className="text-pot-muted text-sm">Connect wallet to deposit or withdraw</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-pot-muted mb-1.5 block">Deposit SOL</label>
              <div className="flex gap-2">
                <input
                  type="number" step="0.01" min="0" placeholder="Amount in SOL"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input flex-1 !py-2 text-sm"
                />
                <button onClick={handleDeposit} disabled={deposit.isPending || !depositAmount} className="btn-primary text-sm">
                  {deposit.isPending ? 'Sending...' : 'Deposit'}
                </button>
              </div>
            </div>
            <div className="border-t border-pot-border" />
            <div>
              <label className="text-xs text-pot-muted mb-1.5 block">Withdraw Shares</label>
              <div className="flex gap-2">
                <input
                  type="number" step="1" min="0" placeholder="Number of shares"
                  value={withdrawShares}
                  onChange={(e) => setWithdrawShares(e.target.value)}
                  className="input flex-1 !py-2 text-sm"
                />
                <button onClick={handleWithdraw} disabled={withdraw.isPending || !withdrawShares}
                  className="rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 px-6 py-2 text-sm font-medium transition disabled:opacity-50">
                  {withdraw.isPending ? 'Sending...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="card p-6 md:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Total Volume', `${(pot.totalVolume ?? pot.balance).toFixed(1)} SOL`],
            ['Total Trades', `${pot.tradeCount}`],
            ['NAV/Share', pot.navPerShareBps
              ? `${((pot.navPerShareBps / 10000 - 1) * 100).toFixed(2)}%`
              : '—'],
            ['Yield Earned', pot.totalYieldEarned
              ? `${pot.totalYieldEarned.toFixed(4)} SOL`
              : '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-pot-dark rounded-lg p-3 text-center">
              <div className="text-xs text-pot-muted mb-1">{label}</div>
              <div className={`font-mono font-semibold text-sm ${
                label === 'NAV/Share' && pot.navPerShareBps > 10000 ? 'text-pot-green' : ''
              }`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Yield panel — only show if strategy is not None */}
      {pot.yieldStrategy > 0 && (
        <div className="card p-6 md:col-span-2">
          <YieldPanel pot={pot} />
        </div>
      )}

      {/* Portfolio */}
      <div className="card p-6 md:col-span-2">
        <VaultPortfolio pot={pot} />
      </div>
    </div>
  )
}

/* ── Vault Portfolio ── */

const SOL_MINT_ADDR = 'So11111111111111111111111111111111111111112'

function VaultPortfolio({ pot }: { pot: any }) {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const holdings: Array<{ mint: string; symbol: string; icon: string; amount: number; decimals: number }> = pot.holdings ?? []

  const allMints = [SOL_MINT_ADDR, ...holdings.map((h: any) => h.mint)]

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPricesRaw(allMints).then((p) => {
      if (!cancelled) { setPrices(p); setLoading(false) }
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pot.pubkey])

  const solPrice = prices[SOL_MINT_ADDR] ?? 0

  // Build unified position list: SOL + token holdings
  const positions = [
    {
      mint: SOL_MINT_ADDR,
      symbol: 'SOL',
      icon: '◎',
      colorClass: 'bg-purple-500',
      amount: pot.balance,
      usdValue: pot.balance * solPrice,
    },
    ...holdings.map((h: any) => {
      const price = prices[h.mint] ?? 0
      return {
        mint: h.mint,
        symbol: h.symbol,
        icon: h.icon,
        colorClass: 'bg-pot-accent',
        amount: h.amount,
        usdValue: h.amount * price,
      }
    }),
  ].filter((p) => p.amount > 0)

  const totalUsd = positions.reduce((s, p) => s + p.usdValue, 0)

  // Color palette for allocation bar segments
  const COLORS = [
    'bg-purple-500', 'bg-blue-500', 'bg-teal-500', 'bg-orange-500',
    'bg-pink-500', 'bg-yellow-500', 'bg-green-500', 'bg-red-500',
  ]

  if (positions.length === 0) {
    return (
      <div className="text-center py-6 text-pot-muted text-sm">
        <div className="text-3xl mb-2">📭</div>
        No token positions yet — propose a swap to start building the portfolio
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Portfolio</h3>
        {loading ? (
          <span className="text-xs text-pot-muted animate-pulse">Fetching prices…</span>
        ) : totalUsd > 0 ? (
          <span className="text-sm text-white font-mono font-bold">
            ≈ ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        ) : null}
      </div>

      {/* Allocation bar */}
      {totalUsd > 0 && (
        <div className="flex rounded-full overflow-hidden h-2 mb-5 gap-0.5">
          {positions.map((p, i) => {
            const pct = totalUsd > 0 ? (p.usdValue / totalUsd) * 100 : 0
            if (pct < 0.5) return null
            return (
              <div
                key={p.mint}
                className={`${COLORS[i % COLORS.length]} h-full rounded-sm`}
                style={{ width: `${pct}%` }}
                title={`${p.symbol}: ${pct.toFixed(1)}%`}
              />
            )
          })}
        </div>
      )}

      {/* Position rows */}
      <div className="space-y-2">
        {positions.map((p, i) => {
          const pct = totalUsd > 0 ? (p.usdValue / totalUsd) * 100 : null
          const fmtAmount = p.symbol === 'SOL'
            ? p.amount.toFixed(4)
            : p.amount >= 1_000_000
              ? `${(p.amount / 1_000_000).toFixed(2)}M`
              : p.amount >= 1_000
                ? `${(p.amount / 1_000).toFixed(2)}K`
                : p.amount.toFixed(4)

          return (
            <div key={p.mint} className="flex items-center gap-3 p-2.5 rounded-xl bg-pot-dark">
              <div className={`w-8 h-8 rounded-full ${COLORS[i % COLORS.length]} flex items-center justify-center text-sm shrink-0`}>
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{p.symbol}</span>
                  <span className="text-sm font-mono text-white">
                    {p.usdValue > 0 ? `$${p.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-pot-muted font-mono">{fmtAmount} {p.symbol}</span>
                  {pct !== null && (
                    <span className="text-xs text-pot-muted">{pct.toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── Yield Panel ── */

const YIELD_APY: Record<string, number> = {
  None: 0,
  Conservative: 0.06,
  Balanced: 0.15,
  Aggressive: 0.30,
}

const YIELD_RESERVE_PCT: Record<string, number> = {
  None: 0,
  Conservative: 0.30,
  Balanced: 0.60,
  Aggressive: 0.80,
}

function YieldPanel({ pot }: { pot: any }) {
  const apy = YIELD_APY[pot.yieldStrategy] ?? 0
  const reservePct = YIELD_RESERVE_PCT[pot.yieldStrategy] ?? 0

  const liquidBal = pot.balance ?? 0
  const meteoraBal = pot.meteoraLpBalance ?? 0
  const totalYieldEarned = pot.totalYieldEarned ?? 0
  const navPerShareBps = pot.navPerShareBps ?? 10000

  const totalAssets = liquidBal + meteoraBal
  const liquidPct = totalAssets > 0 ? (liquidBal / totalAssets) * 100 : 100
  const meteoraPct = totalAssets > 0 ? (meteoraBal / totalAssets) * 100 : 0

  const navGrowthPct = ((navPerShareBps / 10000 - 1) * 100)
  const navLabel = navGrowthPct >= 0
    ? `+${navGrowthPct.toFixed(2)}%`
    : `${navGrowthPct.toFixed(2)}%`

  const strategyColors: Record<string, string> = {
    None:         'text-pot-muted',
    Conservative: 'text-blue-400',
    Balanced:     'text-teal-400',
    Aggressive:   'text-orange-400',
  }
  const strategyColor = strategyColors[pot.yieldStrategy] ?? 'text-pot-muted'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-white">Yield Strategy</h3>
          <p className="text-xs text-pot-muted mt-0.5">Powered by Meteora Dynamic Vaults</p>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold font-mono ${strategyColor}`}>
            {(apy * 100).toFixed(0)}% APY
          </div>
          <div className={`text-xs ${strategyColor}`}>{pot.yieldStrategy}</div>
        </div>
      </div>

      {/* Allocation bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-pot-muted mb-1.5">
          <span>Liquid (trading) <span className="text-white font-mono">{liquidPct.toFixed(0)}%</span></span>
          <span>In Meteora <span className="text-teal-400 font-mono">{meteoraPct.toFixed(0)}%</span></span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          <div className="bg-purple-500 h-full rounded-l-full transition-all" style={{ width: `${liquidPct}%` }} />
          {meteoraPct > 0 && (
            <div className="bg-teal-500 h-full rounded-r-full transition-all" style={{ width: `${meteoraPct}%` }} />
          )}
        </div>
        <div className="flex justify-between text-xs text-pot-muted mt-1">
          <span className="font-mono">{liquidBal.toFixed(4)} SOL</span>
          <span className="font-mono text-teal-400">{meteoraBal.toFixed(4)} SOL equivalent</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-pot-dark rounded-xl p-3 text-center">
          <div className="text-xs text-pot-muted mb-1">Yield Earned</div>
          <div className="text-sm font-mono font-semibold text-teal-400">
            +{totalYieldEarned.toFixed(4)} SOL
          </div>
        </div>
        <div className="bg-pot-dark rounded-xl p-3 text-center">
          <div className="text-xs text-pot-muted mb-1">NAV Growth</div>
          <div className={`text-sm font-mono font-semibold ${navGrowthPct >= 0 ? 'text-pot-green' : 'text-red-400'}`}>
            {navLabel}
          </div>
        </div>
        <div className="bg-pot-dark rounded-xl p-3 text-center">
          <div className="text-xs text-pot-muted mb-1">Yield Target</div>
          <div className="text-sm font-mono font-semibold text-white">
            {(reservePct * 100).toFixed(0)}% earning
          </div>
        </div>
      </div>

      {/* Live accrual indicator */}
      {apy > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-pot-muted">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
          </span>
          Live accrual — yield updates every 10 seconds from Meteora simulation
        </div>
      )}
    </div>
  )
}

/* ── Governance (full panel with settings + budgets + proposals) ── */

// Mint → symbol map for PnL display
const MINT_SYMBOLS: Record<string, string> = {
  'So11111111111111111111111111111111111111112':    'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'JitoSOL',
}

function GovernancePanel({
  potPubkey, pot, isAdmin, currentUserPubkey,
}: {
  potPubkey: string; pot: any; isAdmin: boolean; currentUserPubkey?: string
}) {
  const { connected } = useWallet()
  const { data: proposals, isLoading } = useProposals(potPubkey)
  const vote = useVote()
  const execute = useExecuteProposal()
  const createProposal = useCreateProposal()

  const [govTab, setGovTab] = useState<'proposals' | 'swap' | 'budget' | 'tokenize' | 'yield' | 'settings'>('proposals')

  const handleProposeSwap = async ({ fromMint, toMint, amountSol, description }: {
    fromMint: string; toMint: string; amountSol: number; description: string
  }) => {
    await createProposal.mutateAsync({
      potAddress: potPubkey,
      nextProposalId: pot.nextProposalId ?? 0,
      proposalType: { swap: { fromMint, toMint, amountIn: amountSol, minAmountOut: 0 } },
      description,
    })
  }

  const govSubTabs = [
    { key: 'proposals',  label: '📋 Proposals' },
    { key: 'swap',       label: '🔄 Swap' },
    { key: 'budget',     label: '💰 Budget' },
    ...(pot.mode !== 'tokenized' ? [{ key: 'tokenize', label: '🪙 Tokenize' }] : []),
    ...(pot.yieldStrategy !== 'None' && pot.yieldStrategy !== 0
      ? [{ key: 'yield', label: '🌱 Yield' }]
      : []),
    { key: 'settings',   label: isAdmin ? '⚙️ Settings' : '📖 Rules' },
  ] as { key: typeof govTab; label: string }[]

  return (
    <div className="space-y-4">
      {/* Gov sub-tabs */}
      <div className="flex gap-1 bg-pot-dark rounded-xl p-1 border border-pot-border overflow-x-auto">
        {govSubTabs.map(({ key, label }) => (
          <button key={key} onClick={() => setGovTab(key)}
            className={`flex-shrink-0 flex-1 py-2 text-xs font-medium rounded-lg transition ${
              govTab === key ? 'bg-pot-card text-white shadow' : 'text-pot-muted hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Proposals list */}
      {govTab === 'proposals' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-24 bg-pot-dark rounded-2xl" />)}
            </div>
          ) : !proposals?.length ? (
            <div className="bg-pot-card border border-pot-border rounded-2xl p-12 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-pot-muted text-sm">No proposals yet</p>
              <p className="text-pot-muted/60 text-xs mt-1">Use "Propose Swap" or "Budget Grant" to create one</p>
            </div>
          ) : (
            proposals.map((p: any) => (
              <ProposalCard
                key={p.pubkey}
                proposal={p}
                potPubkey={potPubkey}
                connected={connected}
                vote={vote}
                execute={execute}
              />
            ))
          )}
        </div>
      )}

      {govTab === 'swap' && (
        <JupiterSwapPanel
          mode="vault"
          potPubkey={potPubkey}
          vaultBalance={pot.balance}
          onPropose={handleProposeSwap}
        />
      )}

      {govTab === 'budget' && (
        <BudgetGrantPanel
          potPubkey={potPubkey}
          pot={pot}
          currentUserPubkey={currentUserPubkey}
          maxBudgetGrantPct={20}
        />
      )}

      {govTab === 'tokenize' && (
        <TokenizeProposalPanel
          pot={pot}
          potPubkey={potPubkey}
          connected={connected}
          createProposal={createProposal}
        />
      )}

      {govTab === 'yield' && (
        <YieldProposalPanel
          pot={pot}
          potPubkey={potPubkey}
          connected={connected}
          createProposal={createProposal}
        />
      )}

      {govTab === 'settings' && (
        <GovernanceSettings potPubkey={potPubkey} isAdmin={isAdmin} />
      )}
    </div>
  )
}

/* ── Tokenize Proposal Panel ── */

function TokenizeProposalPanel({
  pot, potPubkey, connected, createProposal,
}: {
  pot: any; potPubkey: string; connected: boolean; createProposal: any
}) {
  const [ticker, setTicker] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    const t = ticker.trim().toUpperCase()
    if (!t || t.length < 2 || t.length > 10) return
    setSubmitting(true)
    try {
      await createProposal.mutateAsync({
        potAddress: potPubkey,
        nextProposalId: pot.nextProposalId ?? 0,
        proposalType: { tokenizePot: { ticker: t } },
        description: `Tokenize POT shares as $${t} SPL token (ETF mode)`,
      })
      setDone(true)
      setTicker('')
    } catch (e) { console.error(e) }
    finally { setSubmitting(false) }
  }

  if (pot.mode === 'tokenized') {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl mb-3">🪙</div>
        <h3 className="text-white font-semibold mb-2">Already Tokenized</h3>
        <p className="text-pot-muted text-sm">
          This POT has been tokenized as <span className="text-yellow-400 font-mono">${pot.tokenTicker}</span>.
          Shares are now transferable SPL tokens — this transition is one-way.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="text-3xl">🏦</div>
        <div>
          <h3 className="text-white font-semibold">Tokenize This POT</h3>
          <p className="text-xs text-pot-muted mt-0.5">Convert virtual shares to transferable SPL tokens (ETF mode)</p>
        </div>
      </div>

      {/* Info boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {[
          { icon: '✅', title: 'After tokenization', items: ['Shares become transferable SPL tokens', 'Trade $TICKER on secondary markets', 'NAV tracked on-chain per share'] },
          { icon: '⚠️', title: 'Irreversible action', items: ['One-way transition — cannot revert', 'Requires governance supermajority', 'All members get equivalent tokens'] },
        ].map(({ icon, title, items }) => (
          <div key={title} className="bg-pot-dark rounded-xl p-4">
            <div className="text-sm font-medium text-white mb-2">{icon} {title}</div>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item} className="text-xs text-pot-muted flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {done && (
        <div className="mb-4 bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 text-center">
          <div className="text-teal-400 text-sm font-medium">
            ✅ Tokenization proposal created! Members can now vote.
          </div>
        </div>
      )}

      {!connected ? (
        <p className="text-pot-muted text-sm text-center">Connect wallet to propose tokenization</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-pot-muted mb-1.5 block">Token Ticker (2–10 chars)</label>
            <input
              type="text"
              maxLength={10}
              placeholder="e.g. ALPHA, VAULT, DEGN"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="input w-full !py-2.5 text-sm font-mono tracking-widest"
            />
            {ticker && (
              <p className="text-xs text-pot-muted mt-1">
                Will create: <span className="text-yellow-400 font-mono">${ticker.toUpperCase()}</span> SPL token
              </p>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !ticker.trim() || ticker.trim().length < 2}
            className="btn-primary w-full !py-2.5 disabled:opacity-50"
          >
            {submitting ? 'Creating Proposal...' : '🏦 Propose Tokenization'}
          </button>
          <p className="text-xs text-pot-muted text-center">
            This proposal requires a governance vote to pass before execution.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Yield Management Proposal Panel ── */

function YieldProposalPanel({
  pot, potPubkey, connected, createProposal,
}: {
  pot: any; potPubkey: string; connected: boolean; createProposal: any
}) {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const liquidBal = pot.balance ?? 0
  const meteoraBal = pot.meteoraLpBalance ?? 0

  const handleSubmit = async () => {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    setSubmitting(true)
    try {
      if (mode === 'deposit') {
        await createProposal.mutateAsync({
          potAddress: potPubkey,
          nextProposalId: pot.nextProposalId ?? 0,
          proposalType: { depositToYield: { meteoraVault: 'MeteoraVault111', amount: amt } },
          description: `Deposit ${amt.toFixed(4)} SOL into Meteora yield vault (${pot.yieldStrategy})`,
        })
      } else {
        await createProposal.mutateAsync({
          potAddress: potPubkey,
          nextProposalId: pot.nextProposalId ?? 0,
          proposalType: { withdrawFromYield: { lpAmount: amt } },
          description: `Withdraw ${amt.toFixed(4)} SOL equivalent from Meteora yield vault`,
        })
      }
      setDone(true)
      setAmount('')
    } catch (e) { console.error(e) }
    finally { setSubmitting(false) }
  }

  const maxAmount = mode === 'deposit' ? liquidBal * 0.9 : meteoraBal

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="text-3xl">🌱</div>
        <div>
          <h3 className="text-white font-semibold">Yield Management</h3>
          <p className="text-xs text-pot-muted mt-0.5">Move funds between trading vault and Meteora yield strategy</p>
        </div>
      </div>

      {/* Current state */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-pot-dark rounded-xl p-3 text-center">
          <div className="text-xs text-pot-muted mb-1">💧 Liquid (trading)</div>
          <div className="font-mono text-white font-semibold">{liquidBal.toFixed(4)} SOL</div>
        </div>
        <div className="bg-pot-dark rounded-xl p-3 text-center">
          <div className="text-xs text-pot-muted mb-1">🌱 In Meteora</div>
          <div className="font-mono text-teal-400 font-semibold">{meteoraBal.toFixed(4)} SOL</div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-pot-dark rounded-xl p-1 border border-pot-border mb-4">
        <button
          onClick={() => { setMode('deposit'); setAmount('') }}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${mode === 'deposit' ? 'bg-teal-500/20 text-teal-400' : 'text-pot-muted hover:text-white'}`}
        >
          ↓ Deposit to Meteora
        </button>
        <button
          onClick={() => { setMode('withdraw'); setAmount('') }}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${mode === 'withdraw' ? 'bg-orange-500/20 text-orange-400' : 'text-pot-muted hover:text-white'}`}
        >
          ↑ Withdraw from Meteora
        </button>
      </div>

      {done && (
        <div className="mb-4 bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 text-center">
          <div className="text-teal-400 text-sm font-medium">
            ✅ Yield proposal created! Members can now vote.
          </div>
        </div>
      )}

      {!connected ? (
        <p className="text-pot-muted text-sm text-center">Connect wallet to propose yield management</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-pot-muted mb-1.5 block">
              Amount (SOL) — max {maxAmount.toFixed(4)}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max={maxAmount}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input flex-1 !py-2 text-sm"
              />
              <button
                onClick={() => setAmount(maxAmount.toFixed(4))}
                className="text-xs text-pot-accent hover:text-white px-3 rounded-xl bg-pot-dark border border-pot-border transition"
              >
                MAX
              </button>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
            className={`w-full !py-2.5 rounded-xl font-medium text-sm transition disabled:opacity-50 ${
              mode === 'deposit'
                ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'
                : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
            }`}
          >
            {submitting ? 'Creating...' : mode === 'deposit'
              ? `🌱 Propose Deposit ${amount ? parseFloat(amount).toFixed(2) : '0'} SOL → Meteora`
              : `💸 Propose Withdraw ${amount ? parseFloat(amount).toFixed(2) : '0'} SOL ← Meteora`
            }
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Proposal card with PnL tracking ── */

function ProposalCard({
  proposal, potPubkey, connected, vote, execute,
}: {
  proposal: any; potPubkey: string; connected: boolean; vote: any; execute: any
}) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const isBudgetGrant = proposal.description?.startsWith('[BUDGET GRANT]')

  // Extract swap info from description for PnL tracking
  // Format: "Swap X TOKEN → TOKEN2"
  const swapMatch = proposal.description?.match(/Swap ([\d.]+) (\w+) → (\w+)/)
  const proposalAmountIn = swapMatch ? parseFloat(swapMatch[1]) : null
  const fromSymbol = swapMatch ? swapMatch[2] : null
  const toSymbol   = swapMatch ? swapMatch[3] : null

  // Find mints from proposal data
  const fromMint = proposal.swap?.fromMint
  const toMint   = proposal.swap?.toMint

  // Fetch current price of from-token (SOL etc)
  useEffect(() => {
    if (!fromMint) return
    fetchPricesRaw([fromMint, toMint].filter(Boolean)).then((prices) => {
      if (prices[fromMint]) setCurrentPrice(prices[fromMint])
    })
  }, [fromMint, toMint])

  // Price at proposal creation — stored in localStorage keyed by proposal pubkey
  const [priceAtCreation, setPriceAtCreation] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(`prop-price-${proposal.pubkey}`)
      return raw ? parseFloat(raw) : null
    } catch { return null }
  })

  // Store price at creation if not yet stored
  useEffect(() => {
    if (!priceAtCreation && currentPrice && fromMint) {
      try {
        localStorage.setItem(`prop-price-${proposal.pubkey}`, currentPrice.toString())
        setPriceAtCreation(currentPrice)
      } catch {}
    }
  }, [currentPrice, priceAtCreation, proposal.pubkey, fromMint])

  // Calculate PnL since proposal was created
  const pnlPct = priceAtCreation && currentPrice
    ? ((currentPrice - priceAtCreation) / priceAtCreation) * 100
    : null

  const pnlSol = pnlPct !== null && proposalAmountIn !== null
    ? (pnlPct / 100) * proposalAmountIn
    : null

  const isFomo = pnlPct !== null && pnlPct > 0 && proposal.status !== 'executed'

  return (
    <div className={`bg-pot-card border rounded-2xl overflow-hidden ${
      isFomo ? 'border-yellow-500/30' : 'border-pot-border'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-pot-accent font-mono shrink-0">#{proposal.proposalId}</span>
              {isBudgetGrant && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 rounded-full shrink-0">
                  💰 Budget Grant
                </span>
              )}
            </div>
            <span className="text-sm text-white leading-snug">{proposal.description || 'Proposal'}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
            proposal.status === 'active'   ? 'bg-yellow-500/20 text-yellow-400' :
            proposal.status === 'passed'   ? 'bg-pot-green/20 text-pot-green' :
            proposal.status === 'executed' ? 'bg-blue-500/20 text-blue-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {proposal.status}
          </span>
        </div>

        {/* PnL tracker for swap proposals */}
        {fromSymbol && pnlPct !== null && (
          <div className={`mb-3 rounded-xl p-3 border ${
            isFomo
              ? 'bg-yellow-500/5 border-yellow-500/20'
              : pnlPct < 0
              ? 'bg-green-500/5 border-green-500/20'
              : 'bg-pot-dark border-pot-border/50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-pot-muted mb-0.5">
                  {fromSymbol} price since proposal
                </div>
                <div className={`text-sm font-bold ${
                  pnlPct > 0 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                  {pnlSol !== null && (
                    <span className="text-xs font-normal text-pot-muted ml-1">
                      ({pnlSol >= 0 ? '+' : ''}{pnlSol.toFixed(3)} SOL equivalent)
                    </span>
                  )}
                </div>
              </div>
              {isFomo && (
                <div className="text-right">
                  <div className="text-[10px] text-yellow-400/80">🔥 FOMO alert</div>
                  <div className="text-[10px] text-pot-muted">Price moved while waiting</div>
                </div>
              )}
              {pnlPct < 0 && proposal.status !== 'executed' && (
                <div className="text-right">
                  <div className="text-[10px] text-green-400">✅ Good timing</div>
                  <div className="text-[10px] text-pot-muted">Saved {Math.abs(pnlSol ?? 0).toFixed(3)} SOL</div>
                </div>
              )}
            </div>
            {priceAtCreation && currentPrice && (
              <div className="flex justify-between text-[10px] text-pot-muted mt-1.5 border-t border-white/5 pt-1.5">
                <span>At proposal: ${priceAtCreation.toFixed(4)}</span>
                <span>Now: ${currentPrice.toFixed(4)}</span>
              </div>
            )}
          </div>
        )}

        {/* Vote bars */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-400">Yes</span>
              <span className="text-pot-muted">{proposal.yesPercent}%</span>
            </div>
            <div className="h-2 bg-pot-card rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${proposal.yesPercent}%` }} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-red-400">No</span>
              <span className="text-pot-muted">{proposal.noPercent}%</span>
            </div>
            <div className="h-2 bg-pot-card rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${proposal.noPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Actions */}
        {connected && proposal.status === 'active' && (
          <div className="flex gap-2">
            <button
              onClick={() => vote.mutate({ potAddress: potPubkey, proposalAddress: proposal.pubkey, approve: true })}
              disabled={vote.isPending}
              className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs py-2 rounded-xl transition font-medium">
              ✅ Vote Yes
            </button>
            <button
              onClick={() => vote.mutate({ potAddress: potPubkey, proposalAddress: proposal.pubkey, approve: false })}
              disabled={vote.isPending}
              className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs py-2 rounded-xl transition font-medium">
              ❌ Vote No
            </button>
          </div>
        )}
        {connected && proposal.status === 'passed' && (
          <button
            onClick={() => execute.mutate({ potAddress: potPubkey, proposalAddress: proposal.pubkey })}
            disabled={execute.isPending}
            className="btn-primary w-full text-xs !py-2">
            {execute.isPending ? 'Executing...' : '⚡ Execute Proposal'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Members ── */

function MembersPanel({ potPubkey }: { potPubkey: string }) {
  const { data: members, isLoading } = useMembers(potPubkey)

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Members</h3>
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-pot-dark rounded-lg" />)}
        </div>
      ) : !members?.length ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-pot-muted text-sm">No members yet</p>
          <p className="text-pot-muted/60 text-xs mt-1">Deposit SOL to become the first member</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-5 text-xs text-pot-muted px-3 py-1">
            <span>Wallet</span>
            <span className="text-right">Shares</span>
            <span className="text-right">%</span>
            <span className="text-right">Deposited</span>
            <span className="text-right">P&L</span>
          </div>
          {members.map((m: any) => (
            <div key={m.wallet} className="grid grid-cols-5 bg-pot-dark rounded-lg px-3 py-3 text-sm border border-pot-border">
              <span className="font-mono text-xs truncate">{m.wallet.slice(0, 4)}...{m.wallet.slice(-4)}</span>
              <span className="text-right font-mono">{m.shares.toLocaleString()}</span>
              <span className="text-right font-mono">{m.sharePercent.toFixed(1)}%</span>
              <span className="text-right font-mono">{m.depositTotal.toFixed(2)}</span>
              <span className={`text-right font-mono ${m.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {m.pnl >= 0 ? '+' : ''}{m.pnl.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
