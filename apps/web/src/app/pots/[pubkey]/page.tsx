'use client'

import { useState } from 'react'
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
import { ScamWarning } from '@/components/ScamWarning'
import { KNOWN_TOKENS } from '@/lib/prices'
import { TokenSearch } from '@/components/TokenSearch'
import { useJupiterQuote } from '@/lib/jupiter-tokens'
import type { JupiterToken } from '@/lib/jupiter-tokens'

const TABS = ['overview', 'shares', 'positions', 'strategy', 'governance', 'members'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  shares: '🪙 Shares',
  positions: '📊 P&L',
  strategy: '⚙️ Strategy',
  governance: 'Governance',
  members: 'Members',
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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-pot-card rounded-xl p-1 border border-pot-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
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
      {tab === 'swap' && <SwapPanel potPubkey={pubkey} pot={pot} />}
      {tab === 'governance' && <GovernancePanel potPubkey={pubkey} />}
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
    } catch (e) {
      console.error('Withdraw failed:', e)
    }
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
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        {!connected ? (
          <p className="text-pot-muted text-sm">Connect wallet to deposit or withdraw</p>
        ) : (
          <div className="space-y-4">
            {/* Deposit */}
            <div>
              <label className="text-xs text-pot-muted mb-1.5 block">Deposit SOL</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount in SOL"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input flex-1 !py-2 text-sm"
                />
                <button
                  onClick={handleDeposit}
                  disabled={deposit.isPending || !depositAmount}
                  className="btn-primary text-sm"
                >
                  {deposit.isPending ? 'Sending...' : 'Deposit'}
                </button>
              </div>
              {deposit.isSuccess && (
                <p className="text-pot-green text-xs mt-1">Deposit successful!</p>
              )}
              {deposit.isError && (
                <p className="text-red-400 text-xs mt-1">{(deposit.error as Error).message}</p>
              )}
            </div>

            <div className="border-t border-pot-border" />

            {/* Withdraw */}
            <div>
              <label className="text-xs text-pot-muted mb-1.5 block">Withdraw Shares</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Number of shares"
                  value={withdrawShares}
                  onChange={(e) => setWithdrawShares(e.target.value)}
                  className="input flex-1 !py-2 text-sm"
                />
                <button
                  onClick={handleWithdraw}
                  disabled={withdraw.isPending || !withdrawShares}
                  className="rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 px-6 py-2 text-sm font-medium transition disabled:opacity-50"
                >
                  {withdraw.isPending ? 'Sending...' : 'Withdraw'}
                </button>
              </div>
              {withdraw.isSuccess && (
                <p className="text-pot-green text-xs mt-1">Withdrawal successful!</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="card p-6 md:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Total Volume', `${pot.balance.toFixed(1)} SOL`],
            ['Total Trades', `${pot.tradeCount}`],
            ['Win Rate', '—'],
            ['Yield APY', '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-pot-dark rounded-lg p-3 text-center">
              <div className="text-xs text-pot-muted mb-1">{label}</div>
              <div className="font-mono font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Swap ── */

const SOL_MINT  = 'So11111111111111111111111111111111111111112'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SOL_DECIMALS = 9

function SwapPanel({ potPubkey, pot }: { potPubkey: string; pot: any }) {
  const { connected } = useWallet()
  const createProposal = useCreateProposal()

  const [fromToken, setFromToken] = useState<JupiterToken | null>(null)
  const [toToken,   setToToken]   = useState<JupiterToken | null>(null)
  const [amount, setAmount] = useState('')
  const [slippageBps, setSlippageBps] = useState(50) // 0.5%

  const fromMint = fromToken?.address ?? SOL_MINT
  const toMint   = toToken?.address   ?? USDC_MINT
  const fromDecimals = fromToken?.decimals ?? SOL_DECIMALS
  const rawAmount = Math.floor(parseFloat(amount || '0') * Math.pow(10, fromDecimals))

  // Live Jupiter quote
  const { data: quote, isFetching: quoteLoading } = useJupiterQuote(
    rawAmount > 0 ? { inputMint: fromMint, outputMint: toMint, amount: rawAmount, slippageBps } : null
  )

  const outAmount = quote
    ? parseFloat(quote.outAmount) / Math.pow(10, toToken?.decimals ?? 6)
    : null
  const priceImpact = quote ? parseFloat(quote.priceImpactPct) : null

  // Route: unique DEX labels
  const routeLabels = quote
    ? [...new Set(quote.routePlan.map((r) => r.swapInfo.label).filter(Boolean))]
    : []

  const fromSym = fromToken?.symbol ?? 'SOL'
  const toSym   = toToken?.symbol   ?? 'USDC'

  const handleProposeSwap = async () => {
    const amountVal = parseFloat(amount)
    if (isNaN(amountVal) || amountVal <= 0) return
    try {
      await createProposal.mutateAsync({
        potAddress: potPubkey,
        nextProposalId: pot.nextProposalId ?? 0,
        proposalType: { swap: { fromMint, toMint, amountIn: amountVal, minAmountOut: outAmount ? Math.floor(outAmount * 0.995) : 0 } },
        description: `Swap ${amountVal} ${fromSym} → ${toSym}`,
      })
      setAmount('')
    } catch (e) {
      console.error('Proposal failed:', e)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Propose Swap</h3>
            <p className="text-pot-muted text-xs">
              Requires governance vote (L{pot.governanceLevel ?? 0})
            </p>
          </div>
          {/* Slippage selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-pot-muted">Slippage:</span>
            {[50, 100, 200].map((bps) => (
              <button
                key={bps}
                onClick={() => setSlippageBps(bps)}
                className={`text-xs px-2 py-1 rounded-lg transition ${
                  slippageBps === bps
                    ? 'bg-pot-accent text-white'
                    : 'bg-pot-dark text-pot-muted border border-pot-border hover:text-white'
                }`}
              >
                {bps / 100}%
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {/* From */}
          <div className="bg-pot-dark rounded-2xl p-4 border border-pot-border">
            <div className="flex justify-between text-xs text-pot-muted mb-2">
              <span>From</span>
              <span>Vault balance: {pot.balance?.toFixed(4)} SOL</span>
            </div>
            <div className="flex items-center gap-3">
              <TokenSearch
                value={fromMint}
                onChange={setFromToken}
                exclude={toMint}
                className="w-44"
              />
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-right text-2xl font-bold text-white outline-none placeholder:text-pot-border"
              />
            </div>
            <div className="flex gap-2 mt-2 justify-end">
              {['25%', '50%', 'MAX'].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    const pctNum = pct === 'MAX' ? 100 : parseInt(pct)
                    setAmount(((pot.balance * pctNum) / 100).toFixed(4))
                  }}
                  className="text-xs px-2 py-0.5 rounded-lg bg-pot-card border border-pot-border text-pot-muted hover:text-white transition"
                >
                  {pct}
                </button>
              ))}
            </div>
          </div>

          {/* Swap arrow */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                const tmp = fromToken
                setFromToken(toToken)
                setToToken(tmp)
              }}
              className="w-8 h-8 rounded-full bg-pot-card border border-pot-border flex items-center justify-center text-pot-muted hover:text-white hover:border-pot-accent/50 transition"
            >
              ⇅
            </button>
          </div>

          {/* To */}
          <div className="bg-pot-dark rounded-2xl p-4 border border-pot-border">
            <div className="flex justify-between text-xs text-pot-muted mb-2">
              <span>To (estimated)</span>
              {quoteLoading && <span className="animate-pulse">Fetching quote…</span>}
            </div>
            <div className="flex items-center gap-3">
              <TokenSearch
                value={toMint}
                onChange={setToToken}
                exclude={fromMint}
                className="w-44"
              />
              <div className="flex-1 text-right">
                <div className={`text-2xl font-bold ${outAmount ? 'text-white' : 'text-pot-border'}`}>
                  {outAmount ? outAmount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'}
                </div>
                {priceImpact !== null && (
                  <div className={`text-xs ${Math.abs(priceImpact) > 2 ? 'text-red-400' : 'text-pot-muted'}`}>
                    Impact: {priceImpact.toFixed(3)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Route visualization */}
        {routeLabels.length > 0 && (
          <div className="mt-3 p-3 bg-pot-dark rounded-xl border border-pot-border">
            <div className="text-xs text-pot-muted mb-2">Route</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-white">{fromSym}</span>
              {routeLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-pot-muted">→</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-pot-accent/10 border border-pot-accent/20 text-pot-accent">
                    {label}
                  </span>
                </div>
              ))}
              <span className="text-pot-muted">→</span>
              <span className="text-xs font-semibold text-white">{toSym}</span>
            </div>
            <div className="text-[10px] text-pot-muted mt-1.5">
              Jupiter aggregates {routeLabels.length} DEX{routeLabels.length > 1 ? 'es' : ''} for best price
            </div>
          </div>
        )}

        {/* Scam warning for output token */}
        {toMint && (
          <div className="mt-3">
            <ScamWarning mint={toMint} symbol={toSym} />
          </div>
        )}

        <button
          onClick={handleProposeSwap}
          disabled={!connected || createProposal.isPending || !amount || parseFloat(amount) <= 0}
          className="btn-primary w-full !py-3 mt-4"
        >
          {createProposal.isPending
            ? 'Creating Proposal…'
            : connected
            ? `Propose: Swap ${amount || '0'} ${fromSym} → ${toSym}`
            : 'Connect Wallet'}
        </button>

        {createProposal.isSuccess && (
          <p className="text-pot-green text-xs text-center mt-2">
            ✅ Proposal created! Head to Governance to vote.
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Governance ── */

function GovernancePanel({ potPubkey }: { potPubkey: string }) {
  const { connected } = useWallet()
  const { data: proposals, isLoading } = useProposals(potPubkey)
  const vote = useVote()
  const execute = useExecuteProposal()

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Proposals</h3>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-pot-dark rounded-lg" />)}
          </div>
        ) : !proposals?.length ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-pot-muted text-sm">No proposals yet</p>
            <p className="text-pot-muted/60 text-xs mt-1">Use the Swap tab to create a trade proposal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <div key={p.pubkey} className="bg-pot-dark rounded-xl p-4 border border-pot-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs text-pot-accent font-mono">#{p.proposalId}</span>
                    <span className="text-sm ml-2 text-white">{p.description || 'Proposal'}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'active' ? 'bg-yellow-500/20 text-yellow-400' :
                    p.status === 'passed' ? 'bg-pot-green/20 text-pot-green' :
                    p.status === 'executed' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {p.status}
                  </span>
                </div>

                {/* Vote bars */}
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-400">Yes</span>
                      <span className="text-pot-muted">{p.yesPercent}%</span>
                    </div>
                    <div className="h-2 bg-pot-card rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${p.yesPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-400">No</span>
                      <span className="text-pot-muted">{p.noPercent}%</span>
                    </div>
                    <div className="h-2 bg-pot-card rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${p.noPercent}%` }} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {connected && p.status === 'active' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => vote.mutate({ potAddress: potPubkey, proposalAddress: p.pubkey, approve: true })}
                      disabled={vote.isPending}
                      className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs py-2 rounded-lg transition font-medium"
                    >
                      Vote Yes
                    </button>
                    <button
                      onClick={() => vote.mutate({ potAddress: potPubkey, proposalAddress: p.pubkey, approve: false })}
                      disabled={vote.isPending}
                      className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs py-2 rounded-lg transition font-medium"
                    >
                      Vote No
                    </button>
                  </div>
                )}
                {connected && p.status === 'passed' && (
                  <button
                    onClick={() => execute.mutate({ potAddress: potPubkey, proposalAddress: p.pubkey })}
                    disabled={execute.isPending}
                    className="btn-primary w-full text-xs !py-2"
                  >
                    {execute.isPending ? 'Executing...' : 'Execute Proposal'}
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
          {members.map((m) => (
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
