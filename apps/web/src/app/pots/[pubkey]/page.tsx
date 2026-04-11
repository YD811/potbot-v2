'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)
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
import { calculateTamaStats, type TamaInput } from '@/lib/tamagotchi/stats'

const TABS = ['overview', 'swap', 'governance', 'members'] as const
type Tab = (typeof TABS)[number]

export default function PotDetailPage() {
  const { pubkey } = useParams<{ pubkey: string }>()
  const { publicKey, connected } = useWallet()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: pot, isLoading } = usePot(pubkey)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-4xl">\ud83e\udeb4</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">&larr; Dashboard</a>
            <span className="text-gray-600">/</span>
            <span className="font-display font-bold">\ud83e\udeb4 POT</span>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">\ud83e\udeb4</span>
                <h1 className="text-2xl font-display font-bold">{pubkey?.slice(0, 8)}...</h1>
              </div>
              <div className="flex gap-4 text-sm text-gray-400">
                <span>Balance: <span className="text-white font-mono">{pot?.balance?.toFixed(4) ?? '\u2014'} SOL</span></span>
                <span>Members: <span className="text-white">\u2014</span></span>
                <span>Trades: <span className="text-white">\u2014</span></span>
              </div>
            </div>
            <TamagotchiBadge />
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t
                  ? 'bg-purple text-white shadow-lg shadow-purple/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewPanel potPubkey={pubkey} vaultBalance={pot?.balance ?? 0} />}
        {tab === 'swap' && <SwapPanel potPubkey={pubkey} />}
        {tab === 'governance' && <GovernancePanel potPubkey={pubkey} />}
        {tab === 'members' && <MembersPanel potPubkey={pubkey} />}
      </div>
    </main>
  )
}

function TamagotchiBadge() {
  const stats = calculateTamaStats({
    tradeVolume: 0,
    memberCount: 1,
    winRate: 0,
    yieldApy: 0,
    ageSeconds: 0,
  })

  return (
    <div className="text-center">
      <div className="text-4xl mb-1">{stats.emoji}</div>
      <div className="text-xs text-gray-400">Lv.{stats.level} {stats.stage}</div>
      <div className="w-20 h-1.5 bg-surface rounded-full mt-1">
        <div
          className="h-full bg-purple rounded-full transition-all"
          style={{ width: `${Math.min(100, (stats.xp / (stats.xp + stats.xpToNext)) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function OverviewPanel({ potPubkey, vaultBalance }: { potPubkey: string; vaultBalance: number }) {
  const { connected } = useWallet()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawShares, setWithdrawShares] = useState('')
  const [activeAction, setActiveAction] = useState<'deposit' | 'withdraw' | null>(null)

  const deposit = useDeposit()
  const withdraw = useWithdraw()

  const handleDeposit = async () => {
    const sol = parseFloat(depositAmount)
    if (isNaN(sol) || sol <= 0) return
    try {
      await deposit.mutateAsync({ potAddress: potPubkey, amountSol: sol })
      setDepositAmount('')
      setActiveAction(null)
    } catch (e) {
      console.error('Deposit failed:', e)
    }
  }

  const handleWithdraw = async () => {
    const shares = parseInt(withdrawShares)
    if (isNaN(shares) || shares <= 0) return
    try {
      await withdraw.mutateAsync({ potAddress: potPubkey, shares })
      setWithdrawShares('')
      setActiveAction(null)
    } catch (e) {
      console.error('Withdraw failed:', e)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Vault</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Balance</span>
            <span className="font-mono text-white">{vaultBalance.toFixed(4)} SOL</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Your Shares</span>
            <span className="font-mono text-white">\u2014</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Share Value</span>
            <span className="font-mono text-white">\u2014</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Your P&L</span>
            <span className="font-mono text-green-400">\u2014</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        {!connected ? (
          <p className="text-gray-400 text-sm">Connect wallet to deposit or withdraw</p>
        ) : (
          <div className="space-y-4">
            {activeAction !== 'withdraw' && (
              <div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount in SOL"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple/50"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={deposit.isPending || !depositAmount}
                    className="btn-primary text-sm px-6 disabled:opacity-50"
                  >
                    {deposit.isPending ? 'Depositing...' : 'Deposit'}
                  </button>
                </div>
                {deposit.isError && (
                  <p className="text-red-400 text-xs mt-1">
                    {(deposit.error as Error).message}
                  </p>
                )}
                {deposit.isSuccess && (
                  <p className="text-green-400 text-xs mt-1">Deposit successful!</p>
                )}
              </div>
            )}
            <div className="border-t border-border" />
            {activeAction !== 'deposit' && (
              <div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Shares to withdraw"
                    value={withdrawShares}
                    onChange={(e) => setWithdrawShares(e.target.value)}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple/50"
                  />
                  <button
                    onClick={handleWithdraw}
                    disabled={withdraw.isPending || !withdrawShares}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {withdraw.isPending ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>
                {withdraw.isError && (
                  <p className="text-red-400 text-xs mt-1">
                    {(withdraw.error as Error).message}
                  </p>
                )}
                {withdraw.isSuccess && (
                  <p className="text-green-400 text-xs mt-1">Withdrawal successful!</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card p-6 md:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Total Volume" value="\u2014 SOL" />
          <StatBox label="Total Trades" value="\u2014" />
          <StatBox label="Win Rate" value="\u2014%" />
          <StatBox label="Yield APY" value="\u2014%" />
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-lg p-3 text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  )
}

function SwapPanel({ potPubkey }: { potPubkey: string }) {
  const { connected } = useWallet()
  const createProposal = useCreateProposal()
  const [fromToken, setFromToken] = useState('SOL')
  const [toToken, setToToken] = useState('USDC')
  const [amount, setAmount] = useState('')

  const TOKENS = ['SOL', 'USDC', 'BONK', 'JUP', 'WIF', 'JTO']

  const handleProposeSwap = async () => {
    const amountVal = parseFloat(amount)
    if (isNaN(amountVal) || amountVal <= 0) return

    try {
      await createProposal.mutateAsync({
        potAddress: potPubkey,
        nextProposalId: 0,
        proposalType: {
          swap: {
            fromMint: fromToken,
            toMint: toToken,
            amountIn: amountVal,
            minAmountOut: 0,
          },
        },
        description: `Swap ${amountVal} ${fromToken} \u2192 ${toToken}`,
      })
    } catch (e) {
      console.error('Proposal failed:', e)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Propose Swap</h3>
        <p className="text-gray-400 text-xs mb-4">
          Swaps require governance approval based on your POT's trade level.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">From</label>
            <div className="flex gap-2">
              <select
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
              >
                {TOKENS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.001"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple/50"
              />
            </div>
          </div>

          <div className="text-center text-gray-500 text-lg">\u2193</div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">To</label>
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
            >
              {TOKENS.filter((t) => t !== fromToken).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleProposeSwap}
            disabled={!connected || createProposal.isPending || !amount}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {createProposal.isPending
              ? 'Creating Proposal...'
              : connected
              ? 'Propose Swap'
              : 'Connect Wallet'}
          </button>

          {createProposal.isSuccess && (
            <p className="text-green-400 text-xs text-center">Proposal created! Head to Governance to vote.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function GovernancePanel({ potPubkey }: { potPubkey: string }) {
  const { connected } = useWallet()
  const { data: proposals, isLoading } = useProposals(potPubkey)
  const vote = useVote()
  const execute = useExecuteProposal()

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-3">Governance Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-gray-400">Trades</div>
            <div className="font-medium">L2 Majority</div>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-gray-400">Withdrawals</div>
            <div className="font-medium">L0 Autocracy</div>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <div className="text-xs text-gray-400">Vote Timeout</div>
            <div className="font-medium">24h</div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Proposals</h3>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 bg-surface rounded-lg" />)}
          </div>
        ) : !proposals?.length ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">\ud83d\udccb</div>
            <p className="text-gray-400 text-sm">No proposals yet</p>
            <p className="text-gray-500 text-xs mt-1">Use the Swap tab to create a trade proposal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <div key={p.pubkey} className="bg-surface rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs text-purple font-mono">#{p.proposalId}</span>
                    <span className="text-sm ml-2">{p.description || 'Proposal'}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'active' ? 'bg-yellow-500/20 text-yellow-400' :
                    p.status === 'passed' ? 'bg-green-500/20 text-green-400' :
                    p.status === 'executed' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-400">Yes</span>
                      <span>{p.yesPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-bg rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.yesPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-400">No</span>
                      <span>{p.noPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-bg rounded-full">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.noPercent}%` }} />
                    </div>
                  </div>
                </div>

                {connected && p.status === 'active' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => vote.mutate({ potAddress: potPubkey, proposalAddress: p.pubkey, approve: true })}
                      disabled={vote.isPending}
                      className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs py-1.5 rounded-lg transition-colors"
                    >
                      Vote Yes
                    </button>
                    <button
                      onClick={() => vote.mutate({ potAddress: potPubkey, proposalAddress: p.pubkey, approve: false })}
                      disabled={vote.isPending}
                      className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs py-1.5 rounded-lg transition-colors"
                    >
                      Vote No
                    </button>
                  </div>
                )}
                {connected && p.status === 'passed' && (
                  <button
                    onClick={() => execute.mutate({ potAddress: potPubkey, proposalAddress: p.pubkey })}
                    disabled={execute.isPending}
                    className="w-full btn-primary text-xs py-1.5"
                  >
                    {execute.isPending ? 'Executing...' : 'Execute'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MembersPanel({ potPubkey }: { potPubkey: string }) {
  const { data: members, isLoading } = useMembers(potPubkey)

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Members</h3>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-surface rounded-lg" />)}
        </div>
      ) : !members?.length ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">\ud83d\udc65</div>
          <p className="text-gray-400 text-sm">No members yet</p>
          <p className="text-gray-500 text-xs mt-1">Deposit SOL to become the first member</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-5 text-xs text-gray-400 px-3 py-1">
            <span>Wallet</span>
            <span className="text-right">Shares</span>
            <span className="text-right">%</span>
            <span className="text-right">Deposited</span>
            <span className="text-right">P&L</span>
          </div>
          {members.map((m) => (
            <div key={m.wallet} className="grid grid-cols-5 bg-surface rounded-lg px-3 py-3 text-sm">
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
