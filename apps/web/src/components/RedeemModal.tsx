'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRedeemTokens } from '@/hooks/usePots'
import { withTxToast } from '@/components/TxToast'
import { ExplorerLink } from '@/components/ExplorerLink'

interface Props {
  open: boolean
  onClose: () => void
  potPubkey: string
  symbol: string
  /** SPL token balance the member holds (in raw token units, not internal shares). */
  userTokenBalance: number
  /** Vault SOL balance — basis for NAV preview. */
  vaultBalanceSol: number
  /** Total internal shares outstanding (pot.totalShares). */
  totalShares: number
  /** SPL-tokens-per-internal-share scale (default 100 from create_pot). */
  sharesPerSol?: number
}

/**
 * Liquid ETF exit modal: input SPL token amount → preview NAV + reserve check
 * → call useRedeemTokens. After success, show ExplorerLink to the on-chain tx.
 *
 * The on-chain program rejects token amounts that aren't clean multiples of
 * `pot.shares_per_sol`; we pre-validate here and disable the button to give
 * an obvious UX hint instead of letting the tx fail.
 */
export function RedeemModal({
  open,
  onClose,
  potPubkey,
  symbol,
  userTokenBalance,
  vaultBalanceSol,
  totalShares,
  sharesPerSol = 100,
}: Props) {
  const redeem = useRedeemTokens()
  const [amountStr, setAmountStr] = useState('')
  const [lastTx, setLastTx] = useState<string | null>(null)

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setAmountStr('')
      setLastTx(null)
    }
  }, [open])

  const amount = useMemo(() => {
    const n = parseFloat(amountStr.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  }, [amountStr])

  // Convert SPL → internal shares for NAV pricing.
  const internalShares = useMemo(() => Math.floor(amount / sharesPerSol), [amount, sharesPerSol])

  // NAV preview — internal shares × (vault / total_shares).
  const previewSol = useMemo(() => {
    if (totalShares <= 0 || internalShares <= 0) return 0
    return (internalShares * vaultBalanceSol) / totalShares
  }, [internalShares, totalShares, vaultBalanceSol])

  // 80% reserve guard (mirror of on-chain check).
  const maxSolThisExit = vaultBalanceSol * 0.8
  const breachesReserve = previewSol > maxSolThisExit
  const isMultiple = amount > 0 && amount % sharesPerSol === 0
  const overBalance = amount > userTokenBalance

  const canSubmit = !!potPubkey && amount > 0 && isMultiple && !overBalance && !breachesReserve

  const minStep = sharesPerSol
  const maxRedeemBySupply = Math.floor((maxSolThisExit / Math.max(vaultBalanceSol, 1e-9)) * totalShares) * sharesPerSol

  async function handleRedeem() {
    if (!canSubmit) return
    const result = await withTxToast<{ tx: string }>(
      () => redeem.mutateAsync({ potAddress: potPubkey, tokenAmount: amount }) as Promise<{ tx: string }>,
      `Redeeming ${amount.toLocaleString()} ${symbol}…`,
      'Redeemed at NAV',
      (r) => r.tx,
    )
    if (result?.tx) setLastTx(result.tx)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pot-dark/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        className="card w-full max-w-md p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Redeem {symbol}</h2>
          <button
            onClick={onClose}
            className="text-pot-muted hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {lastTx ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-pot-green/10 border border-pot-green/30 p-4 text-sm">
              <div className="font-semibold text-pot-green mb-2">✅ Redeemed at NAV</div>
              <div className="text-pot-muted">
                Burned <span className="text-white font-mono">{amount.toLocaleString()} {symbol}</span> →
                received <span className="text-white font-mono">~{previewSol.toFixed(4)} SOL</span>.
              </div>
            </div>
            <ExplorerLink txSig={lastTx} variant="pill" />
            <button onClick={onClose} className="btn-secondary w-full text-sm">Done</button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs text-pot-muted mb-1.5">
                Amount to burn ({symbol})
              </label>
              <div className="relative">
                <input
                  className="input pr-20"
                  type="number"
                  inputMode="numeric"
                  step={minStep}
                  min={minStep}
                  max={userTokenBalance}
                  placeholder={`Multiple of ${minStep}`}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    // MAX = min(user balance, supply-based 80% cap), rounded down to multiple of scale
                    const limit = Math.min(userTokenBalance, maxRedeemBySupply)
                    const rounded = Math.floor(limit / minStep) * minStep
                    setAmountStr(String(rounded))
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-lg
                             bg-pot-accent/20 text-pot-accent hover:bg-pot-accent/30 transition"
                >
                  MAX
                </button>
              </div>
              <div className="mt-1.5 text-xs text-pot-muted flex items-center justify-between">
                <span>
                  Balance:{' '}
                  <button
                    type="button"
                    onClick={() => setAmountStr(String(Math.floor(userTokenBalance / minStep) * minStep))}
                    className="text-pot-green hover:underline font-mono"
                  >
                    {userTokenBalance.toLocaleString()} {symbol}
                  </button>
                </span>
                <span>step: {minStep.toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-xl bg-pot-dark border border-pot-border p-4 space-y-2 text-sm">
              <Row
                label="Internal shares burned"
                value={internalShares > 0 ? internalShares.toLocaleString() : '—'}
              />
              <Row
                label="You receive (at NAV)"
                value={previewSol > 0 ? `${previewSol.toFixed(4)} SOL` : '—'}
                highlight
              />
              <Row
                label="80% reserve cap"
                value={`${maxSolThisExit.toFixed(4)} SOL`}
                muted
              />
            </div>

            {!isMultiple && amount > 0 && (
              <p className="text-xs text-amber-300">
                Amount must be a clean multiple of <span className="font-mono">{minStep}</span> (= 1 internal share).
              </p>
            )}
            {overBalance && (
              <p className="text-xs text-red-400">Exceeds your balance.</p>
            )}
            {breachesReserve && (
              <p className="text-xs text-red-400">
                Exceeds 80% liquidity reserve. Split into smaller redemptions.
              </p>
            )}

            <button
              onClick={handleRedeem}
              disabled={!canSubmit || redeem.isPending}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {redeem.isPending
                ? 'Redeeming…'
                : !amount
                  ? 'Enter amount'
                  : `🔥 Burn ${amount.toLocaleString()} ${symbol} → ~${previewSol.toFixed(3)} SOL`}
            </button>
            <p className="text-[11px] text-pot-muted text-center">
              Redemption is at NAV. The vault always honours redemptions up to 80% of liquid balance per tx.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  highlight = false,
  muted = false,
}: {
  label: string
  value: string
  highlight?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-pot-muted">{label}</span>
      <span
        className={`font-mono ${
          highlight ? 'text-pot-green font-semibold' : muted ? 'text-pot-muted' : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export default RedeemModal
