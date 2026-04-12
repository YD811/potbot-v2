'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useDeposit, useWithdraw, usePot, useMembers } from '@/hooks/usePots'
import { useSolPrice, formatUsd } from '@/lib/prices'
import { withTxToast } from '@/components/TxToast'

const DEPOSIT_TOKENS = [
  { symbol: 'SOL', decimals: 9, icon: '◎', note: 'native' },
  { symbol: 'USDC', decimals: 6, icon: '💵', note: 'stablecoin' },
  { symbol: 'USDT', decimals: 6, icon: '💲', note: 'stablecoin' },
]

interface Props {
  potPubkey: string
}

export function SharesPanel({ potPubkey }: Props) {
  const { publicKey, connected } = useWallet()
  const { data: pot } = usePot(potPubkey)
  const { data: members } = useMembers(potPubkey)
  const { price: solPrice } = useSolPrice()
  const deposit = useDeposit()
  const withdraw = useWithdraw()

  const [depositToken, setDepositToken] = useState<'SOL' | 'USDC' | 'USDT'>('SOL')
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawPct, setWithdrawPct] = useState('')

  const myWallet = publicKey?.toBase58() ?? ''
  const myMember = members?.find((m) => m.wallet === myWallet)

  const myShares = myMember?.shares ?? 0
  const totalShares = pot?.totalShares ?? 0
  const myPct = totalShares > 0 ? (myShares / totalShares) * 100 : 0

  // SOL value of my shares
  const vaultSol = pot?.balance ?? 0
  const myValueSol = totalShares > 0 ? (myShares / totalShares) * vaultSol : 0
  const myValueUsd = solPrice ? myValueSol * solPrice : null

  // Vault value
  const vaultValueUsd = solPrice ? vaultSol * solPrice : null

  // Share price
  const sharePriceSol = totalShares > 0 ? vaultSol / totalShares : 0
  const sharePriceUsd = solPrice ? sharePriceSol * solPrice : null

  // Estimate shares from deposit
  const depositSolEquiv = parseFloat(depositAmount) || 0
  const estimatedShares = Math.floor(depositSolEquiv * 1000)

  // Withdraw preview
  const withdrawPctNum = Math.min(100, Math.max(0, parseFloat(withdrawPct) || 0))
  const sharesToWithdraw = Math.floor((withdrawPctNum / 100) * myShares)
  const withdrawSolPreview = totalShares > 0 ? (sharesToWithdraw / totalShares) * vaultSol : 0

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) return
    await withTxToast(
      () => deposit.mutateAsync({ potAddress: potPubkey, amountSol: amount }),
      `Depositing ${amount} ${depositToken}…`,
      `Deposited ${amount} ${depositToken}!`
    )
    setDepositAmount('')
  }

  const handleWithdraw = async () => {
    if (!sharesToWithdraw) return
    await withTxToast(
      () => withdraw.mutateAsync({ potAddress: potPubkey, shares: sharesToWithdraw }),
      `Withdrawing ${withdrawPctNum}% of your shares…`,
      `Withdrawal successful! Received ~${withdrawSolPreview.toFixed(4)} SOL`
    )
    setWithdrawPct('')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── Your Position ── */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Your Position</h3>

        {!connected ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔌</div>
            <p className="text-pot-muted text-sm">Connect wallet to see your shares</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shares summary */}
            <div className="grid grid-cols-2 gap-3">
              <MetricBox
                label="Your Shares"
                value={myShares.toLocaleString()}
                sub={`of ${totalShares.toLocaleString()} total`}
                accent={myShares > 0}
              />
              <MetricBox
                label="Ownership"
                value={`${myPct.toFixed(2)}%`}
                sub="of this vault"
                accent={myShares > 0}
              />
              <MetricBox
                label="Your Value"
                value={`${myValueSol.toFixed(4)} SOL`}
                sub={myValueUsd ? formatUsd(myValueUsd) : '—'}
                accent
              />
              <MetricBox
                label="Share Price"
                value={`${sharePriceSol.toFixed(6)}`}
                sub={sharePriceUsd ? `${formatUsd(sharePriceUsd)} / share` : 'per share (SOL)'}
              />
            </div>

            {/* Ownership bar */}
            {myShares > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-pot-muted mb-1">
                  <span>Your allocation in vault</span>
                  <span className="text-pot-green font-medium">{myPct.toFixed(2)}%</span>
                </div>
                <div className="h-2.5 bg-pot-dark rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${myPct}%`,
                      background: 'linear-gradient(90deg, #00ff88, #8b5cf6)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-pot-muted mt-1">
                  <span>You</span>
                  <span>Others ({(100 - myPct).toFixed(1)}%)</span>
                </div>
              </div>
            )}

            {/* PnL estimate */}
            {myMember && myMember.depositTotal > 0 && (
              <div className="bg-pot-dark rounded-xl p-3 border border-pot-border">
                <div className="text-xs text-pot-muted mb-2">Unrealised P&L</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-pot-muted">
                    Deposited: {myMember.depositTotal.toFixed(4)} SOL
                  </span>
                  <span className={`text-sm font-bold font-mono ${
                    myValueSol >= myMember.depositTotal ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {myValueSol >= myMember.depositTotal ? '+' : ''}
                    {(myValueSol - myMember.depositTotal).toFixed(4)} SOL
                    {' '}
                    ({myMember.depositTotal > 0
                      ? ((myValueSol - myMember.depositTotal) / myMember.depositTotal * 100).toFixed(1)
                      : '0.0'}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Vault Overview ── */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Vault Overview</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <MetricBox
            label="Total Balance"
            value={`${vaultSol.toFixed(4)} SOL`}
            sub={vaultValueUsd ? formatUsd(vaultValueUsd) : '—'}
            accent
          />
          <MetricBox
            label="Total Shares"
            value={totalShares.toLocaleString()}
            sub="issued"
          />
          <MetricBox
            label="Members"
            value={String(pot?.memberCount ?? 0)}
            sub="participants"
          />
          <MetricBox
            label="Trades"
            value={String(pot?.tradeCount ?? 0)}
            sub="executed"
          />
        </div>

        {/* Member share bars */}
        {members && members.length > 0 && (
          <div>
            <div className="text-xs text-pot-muted mb-2">Member allocations</div>
            <div className="space-y-1.5">
              {members.slice(0, 5).map((m) => (
                <div key={m.wallet} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-pot-muted w-20">
                    {m.wallet.slice(0, 4)}…{m.wallet.slice(-4)}
                  </span>
                  <div className="flex-1 h-2 bg-pot-dark rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-pot-accent/60"
                      style={{ width: `${m.sharePercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-pot-muted w-10 text-right">
                    {m.sharePercent.toFixed(1)}%
                  </span>
                </div>
              ))}
              {members.length > 5 && (
                <p className="text-xs text-pot-muted/60 mt-1">
                  +{members.length - 5} more members
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Deposit ── */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Deposit</h3>

        {!connected ? (
          <p className="text-pot-muted text-sm">Connect wallet to deposit</p>
        ) : (
          <div className="space-y-4">
            {/* Token tabs */}
            <div className="flex gap-1 p-1 bg-pot-dark rounded-xl">
              {DEPOSIT_TOKENS.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => setDepositToken(t.symbol as any)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    depositToken === t.symbol
                      ? 'bg-pot-accent text-white'
                      : 'text-pot-muted hover:text-white'
                  }`}
                >
                  {t.icon} {t.symbol}
                  <span className="block text-[10px] opacity-60">{t.note}</span>
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs text-pot-muted mb-1.5 block">
                Amount ({depositToken})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`0.00`}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input w-full !py-3 !pr-16 text-sm font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-pot-muted">
                  {depositToken}
                </span>
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2">
                {['0.1', '0.5', '1', '5'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDepositAmount(v)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-pot-dark border border-pot-border text-pot-muted hover:text-white hover:border-pot-accent/50 transition"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {depositAmount && parseFloat(depositAmount) > 0 && (
              <div className="bg-pot-dark rounded-xl p-3 border border-pot-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-pot-muted">You'll receive</span>
                  <span className="text-white font-mono">
                    ~{estimatedShares.toLocaleString()} shares
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pot-muted">New ownership</span>
                  <span className="text-pot-green font-mono">
                    ~{totalShares > 0
                      ? ((estimatedShares / (totalShares + estimatedShares)) * 100).toFixed(2)
                      : '100.00'}%
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={deposit.isPending || !depositAmount || parseFloat(depositAmount) <= 0}
              className="btn-primary w-full !py-3"
            >
              {deposit.isPending ? 'Depositing…' : `Deposit ${depositToken}`}
            </button>
          </div>
        )}
      </div>

      {/* ── Withdraw ── */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Withdraw</h3>

        {!connected ? (
          <p className="text-pot-muted text-sm">Connect wallet to withdraw</p>
        ) : !myShares ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🪙</div>
            <p className="text-pot-muted text-sm">You have no shares in this vault.</p>
            <p className="text-pot-muted/60 text-xs mt-1">Deposit first to get shares.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-pot-dark rounded-xl p-3 border border-pot-border">
              <div className="text-xs text-pot-muted mb-1">Your withdrawable balance</div>
              <div className="text-xl font-bold text-pot-green font-mono">
                {myValueSol.toFixed(4)} SOL
              </div>
              {myValueUsd && (
                <div className="text-xs text-pot-muted">{formatUsd(myValueUsd)}</div>
              )}
            </div>

            {/* Slider */}
            <div>
              <div className="flex justify-between text-xs text-pot-muted mb-1.5">
                <span>Withdraw amount</span>
                <span className="text-white">{withdrawPctNum}% of your position</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={withdrawPctNum}
                onChange={(e) => setWithdrawPct(e.target.value)}
                className="w-full accent-pot-accent"
              />
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setWithdrawPct(String(pct))}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
                      withdrawPctNum === pct
                        ? 'border-pot-accent text-pot-accent bg-pot-accent/10'
                        : 'border-pot-border text-pot-muted hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {sharesToWithdraw > 0 && (
              <div className="bg-pot-dark rounded-xl p-3 border border-pot-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-pot-muted">Shares burned</span>
                  <span className="text-white font-mono">{sharesToWithdraw.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pot-muted">You'll receive</span>
                  <span className="text-pot-green font-mono font-semibold">
                    ~{withdrawSolPreview.toFixed(4)} SOL
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={withdraw.isPending || sharesToWithdraw === 0}
              className="w-full rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 py-3 text-sm font-medium transition disabled:opacity-50"
            >
              {withdraw.isPending
                ? 'Withdrawing…'
                : sharesToWithdraw > 0
                ? `Withdraw ${withdrawPctNum}% → ~${withdrawSolPreview.toFixed(4)} SOL`
                : 'Select amount to withdraw'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricBox({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="bg-pot-dark rounded-xl p-3 border border-pot-border">
      <div className="text-xs text-pot-muted mb-0.5">{label}</div>
      <div className={`font-bold font-mono text-sm ${accent ? 'text-pot-green' : 'text-white'}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-pot-muted mt-0.5">{sub}</div>}
    </div>
  )
}
