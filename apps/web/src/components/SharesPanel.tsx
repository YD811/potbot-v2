'use client'

import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { useDeposit, useWithdraw, usePot, useMembers } from '@/hooks/usePots'
import { useSolPrice, formatUsd } from '@/lib/prices'
import { withTxToast } from '@/components/TxToast'

interface Props {
  potPubkey: string
}

/** Fetch wallet SOL balance */
function useWalletBalance() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['walletBalance', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return 0
      const lamports = await connection.getBalance(publicKey, 'confirmed')
      // reserve ~0.01 SOL for tx fees
      return Math.max(0, (lamports - 10_000_000) / LAMPORTS_PER_SOL)
    },
    enabled: !!publicKey,
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
}

const DEPOSIT_PCT_BTNS = [10, 25, 50, 75, 100] as const
const WITHDRAW_PCT_BTNS = [25, 50, 75, 100] as const

export function SharesPanel({ potPubkey }: Props) {
  const { publicKey, connected } = useWallet()
  const { data: pot } = usePot(potPubkey)
  const { data: members } = useMembers(potPubkey)
  const { price: solPrice } = useSolPrice()
  const { data: walletSol = 0, isLoading: balanceLoading } = useWalletBalance()

  const deposit = useDeposit()
  const withdraw = useWithdraw()

  // Deposit state — % of wallet balance
  const [depositPct, setDepositPct] = useState(0)
  const depositAmount = ((depositPct / 100) * walletSol).toFixed(4)
  const depositAmountNum = parseFloat(depositAmount)

  // Withdraw state — % of shares
  const [withdrawPct, setWithdrawPct] = useState(0)

  const myWallet = publicKey?.toBase58() ?? ''
  type MemberRow = {
    wallet: string
    shares: number
    sharePercent: number
    depositTotal: number
    withdrawTotal: number
    pnl: number
  }
  const myMember = (members as MemberRow[] | undefined)?.find((m) => m.wallet === myWallet)

  const myShares       = myMember?.shares ?? 0
  const totalShares    = pot?.totalShares ?? 0
  const myPct          = totalShares > 0 ? (myShares / totalShares) * 100 : 0
  const vaultSol       = pot?.balance ?? 0
  const myValueSol     = totalShares > 0 ? (myShares / totalShares) * vaultSol : 0
  const myValueUsd     = solPrice ? myValueSol * solPrice : null
  const vaultValueUsd  = solPrice ? vaultSol * solPrice : null
  const sharePriceSol  = totalShares > 0 ? vaultSol / totalShares : 0
  const sharePriceUsd  = solPrice ? sharePriceSol * solPrice : null

  // Deposit preview
  const estimatedShares = Math.floor(depositAmountNum * 1000)
  const newOwnershipPct = totalShares > 0
    ? (estimatedShares / (totalShares + estimatedShares)) * 100
    : 100
  const depositValueUsd = solPrice && depositAmountNum > 0
    ? depositAmountNum * solPrice
    : null

  // Withdraw preview
  const sharesToWithdraw   = Math.floor((withdrawPct / 100) * myShares)
  const withdrawSolPreview = totalShares > 0 ? (sharesToWithdraw / totalShares) * vaultSol : 0
  const withdrawUsdPreview = solPrice ? withdrawSolPreview * solPrice : null

  const handleDeposit = async () => {
    if (!depositAmountNum || depositAmountNum <= 0) return
    await withTxToast(
      () => deposit.mutateAsync({ potAddress: potPubkey, amountSol: depositAmountNum }),
      `Depositing ${depositAmountNum} SOL…`,
      `Deposited ${depositAmountNum} SOL! 🎉`
    )
    setDepositPct(0)
  }

  const handleWithdraw = async () => {
    if (!sharesToWithdraw) return
    await withTxToast(
      () => withdraw.mutateAsync({ potAddress: potPubkey, shares: sharesToWithdraw }),
      `Withdrawing ${withdrawPct}% of your shares…`,
      `Received ~${withdrawSolPreview.toFixed(4)} SOL! ✅`
    )
    setWithdrawPct(0)
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
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Your Shares" value={myShares.toLocaleString()} sub={`of ${totalShares.toLocaleString()} total`} accent={myShares > 0} />
              <MetricBox label="Ownership"   value={`${myPct.toFixed(2)}%`}     sub="of this vault" accent={myShares > 0} />
              <MetricBox label="Your Value"  value={`${myValueSol.toFixed(4)} SOL`} sub={myValueUsd ? formatUsd(myValueUsd) : '—'} accent />
              <MetricBox label="Share Price" value={`${sharePriceSol.toFixed(6)}`}  sub={sharePriceUsd ? `${formatUsd(sharePriceUsd)} / share` : 'per share'} />
            </div>

            {myShares > 0 && (
              <div>
                <div className="flex justify-between text-xs text-pot-muted mb-1">
                  <span>Your allocation</span>
                  <span className="text-pot-green font-medium">{myPct.toFixed(2)}%</span>
                </div>
                <div className="h-2.5 bg-pot-dark rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${myPct}%`, background: 'linear-gradient(90deg,#14F195,#9945FF)' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-pot-muted mt-1">
                  <span>You</span>
                  <span>Others ({(100 - myPct).toFixed(1)}%)</span>
                </div>
              </div>
            )}

            {myMember && myMember.depositTotal > 0 && (
              <div className="bg-pot-dark rounded-xl p-3 border border-pot-border">
                <div className="text-xs text-pot-muted mb-2">Unrealised P&L</div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-pot-muted">
                    Deposited: {myMember.depositTotal.toFixed(4)} SOL
                  </span>
                  <span className={`text-sm font-bold font-mono ${myValueSol >= myMember.depositTotal ? 'text-green-400' : 'text-red-400'}`}>
                    {myValueSol >= myMember.depositTotal ? '+' : ''}
                    {(myValueSol - myMember.depositTotal).toFixed(4)} SOL
                    {' '}({myMember.depositTotal > 0 ? ((myValueSol - myMember.depositTotal) / myMember.depositTotal * 100).toFixed(1) : '0.0'}%)
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
          <MetricBox label="Total Balance" value={`${vaultSol.toFixed(4)} SOL`}        sub={vaultValueUsd ? formatUsd(vaultValueUsd) : '—'} accent />
          <MetricBox label="Total Shares"  value={totalShares.toLocaleString()}          sub="issued" />
          <MetricBox label="Members"       value={String(pot?.memberCount ?? 0)}         sub="participants" />
          <MetricBox label="Trades"        value={String(pot?.tradeCount ?? 0)}          sub="executed" />
        </div>
        {members && members.length > 0 && (
          <div>
            <div className="text-xs text-pot-muted mb-2">Member allocations</div>
            <div className="space-y-1.5">
              {(members as MemberRow[]).slice(0, 5).map((m) => (
                <div key={m.wallet} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-pot-muted w-20">{m.wallet.slice(0,4)}…{m.wallet.slice(-4)}</span>
                  <div className="flex-1 h-2 bg-pot-dark rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-pot-accent/60" style={{ width: `${m.sharePercent}%` }} />
                  </div>
                  <span className="text-xs text-pot-muted w-10 text-right">{m.sharePercent.toFixed(1)}%</span>
                </div>
              ))}
              {members.length > 5 && <p className="text-xs text-pot-muted/60 mt-1">+{members.length - 5} more</p>}
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

            {/* Wallet balance banner */}
            <div className="flex items-center justify-between bg-pot-dark border border-pot-border rounded-xl px-4 py-3">
              <div>
                <div className="text-xs text-pot-muted">Wallet Balance</div>
                <div className="text-sm font-bold font-mono text-white">
                  {balanceLoading ? '…' : `${walletSol.toFixed(4)} SOL`}
                </div>
                {solPrice && !balanceLoading && (
                  <div className="text-xs text-pot-muted">{formatUsd(walletSol * solPrice)}</div>
                )}
              </div>
              <div className="text-2xl">◎</div>
            </div>

            {/* % slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-pot-muted">Amount to deposit</span>
                <span className="text-xs font-mono text-white font-semibold">
                  {depositPct}% = {depositAmountNum.toFixed(4)} SOL
                  {depositValueUsd && <span className="text-pot-muted ml-1">({formatUsd(depositValueUsd)})</span>}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={depositPct}
                onChange={(e) => setDepositPct(Number(e.target.value))}
                className="w-full accent-pot-accent"
              />
              {/* Quick pct buttons */}
              <div className="flex gap-1.5 mt-2">
                {DEPOSIT_PCT_BTNS.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setDepositPct(pct)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
                      depositPct === pct
                        ? 'border-pot-accent text-pot-accent bg-pot-accent/10'
                        : 'border-pot-border text-pot-muted hover:text-white'
                    }`}
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {depositAmountNum > 0 && (
              <div className="bg-pot-dark rounded-xl p-3 border border-pot-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-pot-muted">You deposit</span>
                  <span className="text-white font-mono">{depositAmountNum.toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pot-muted">You'll receive</span>
                  <span className="text-white font-mono">~{estimatedShares.toLocaleString()} shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pot-muted">New ownership</span>
                  <span className="text-pot-green font-mono">~{newOwnershipPct.toFixed(2)}%</span>
                </div>
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={deposit.isPending || depositAmountNum <= 0 || walletSol <= 0}
              className="btn-primary w-full !py-3 disabled:opacity-40"
            >
              {deposit.isPending
                ? 'Depositing…'
                : depositAmountNum > 0
                ? `Deposit ${depositAmountNum.toFixed(4)} SOL`
                : 'Move slider to deposit'}
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
            <p className="text-pot-muted text-sm">No shares in this vault</p>
            <p className="text-pot-muted/60 text-xs mt-1">Deposit first to earn shares</p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* My balance banner */}
            <div className="flex items-center justify-between bg-pot-dark border border-pot-border rounded-xl px-4 py-3">
              <div>
                <div className="text-xs text-pot-muted">Your Vault Value</div>
                <div className="text-lg font-bold font-mono text-pot-green">{myValueSol.toFixed(4)} SOL</div>
                {myValueUsd && <div className="text-xs text-pot-muted">{formatUsd(myValueUsd)}</div>}
              </div>
              <div>
                <div className="text-xs text-pot-muted text-right">{myShares.toLocaleString()} shares</div>
                <div className="text-xs text-pot-muted text-right">{myPct.toFixed(2)}% ownership</div>
              </div>
            </div>

            {/* % slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-pot-muted">Amount to withdraw</span>
                <span className="text-xs font-mono text-white font-semibold">
                  {withdrawPct}% = ~{withdrawSolPreview.toFixed(4)} SOL
                  {withdrawUsdPreview && withdrawPct > 0 && (
                    <span className="text-pot-muted ml-1">({formatUsd(withdrawUsdPreview)})</span>
                  )}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={withdrawPct}
                onChange={(e) => setWithdrawPct(Number(e.target.value))}
                className="w-full accent-red-400"
              />
              <div className="flex gap-1.5 mt-2">
                {WITHDRAW_PCT_BTNS.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setWithdrawPct(pct)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
                      withdrawPct === pct
                        ? 'border-red-400 text-red-400 bg-red-400/10'
                        : 'border-pot-border text-pot-muted hover:text-white'
                    }`}
                  >
                    {pct === 100 ? 'ALL' : `${pct}%`}
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
                  <span className="text-pot-green font-mono font-bold">~{withdrawSolPreview.toFixed(4)} SOL</span>
                </div>
                {withdrawUsdPreview && (
                  <div className="flex justify-between">
                    <span className="text-pot-muted">USD value</span>
                    <span className="text-white font-mono">{formatUsd(withdrawUsdPreview)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-pot-muted">Remaining shares</span>
                  <span className="text-white font-mono">{(myShares - sharesToWithdraw).toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={withdraw.isPending || sharesToWithdraw === 0}
              className="w-full rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 py-3 text-sm font-medium transition disabled:opacity-40"
            >
              {withdraw.isPending
                ? 'Withdrawing…'
                : sharesToWithdraw > 0
                ? `Withdraw ${withdrawPct}% → ~${withdrawSolPreview.toFixed(4)} SOL`
                : 'Move slider to withdraw'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricBox({ label, value, sub, accent = false }: {
  label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className="bg-pot-dark rounded-xl p-3 border border-pot-border">
      <div className="text-xs text-pot-muted mb-0.5">{label}</div>
      <div className={`font-bold font-mono text-sm ${accent ? 'text-pot-green' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] text-pot-muted mt-0.5">{sub}</div>}
    </div>
  )
}
