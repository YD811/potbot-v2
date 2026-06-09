'use client'

import { useMemo, useState } from 'react'
import { useSolPrice } from '@/lib/prices'
import { useHumanText } from '@/hooks/useHumanText'

interface Props {
  totalSol: number
  totalUsd?: number
  /** When provided, the SOL holding shows a "stake idle SOL" suggestion with
   *  a quick action that pre-fills the staking proposal form. */
  onProposeStaking?: (amountSol: number) => void
}

export function VaultPortfolioDisplay({ totalSol, totalUsd, onProposeStaking }: Props) {
  const t = useHumanText()
  const { price: solPrice } = useSolPrice()
  const [showSuggest, setShowSuggest] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const usd = useMemo(
    () => (totalUsd != null ? totalUsd : solPrice ? totalSol * solPrice : null),
    [totalSol, totalUsd, solPrice],
  )

  const canSuggest = !!onProposeStaking && totalSol > 0 && !dismissed

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold text-white">{t('Vault Holdings')}</h3>
        <span className="text-xs text-pot-muted">Live balance</span>
      </div>

      {/* SOL position — hover/click to reveal the staking suggestion */}
      <div
        className={`rounded-xl p-2 -m-2 transition ${canSuggest ? 'cursor-pointer hover:bg-pot-dark/50' : ''}`}
        onMouseEnter={() => canSuggest && setShowSuggest(true)}
        onClick={() => canSuggest && setShowSuggest((v) => !v)}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white tabular-nums">{totalSol.toFixed(3)} SOL</span>
          {usd != null && (
            <span className="text-sm text-pot-muted">≈ ${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          )}
        </div>
      </div>

      {canSuggest && showSuggest && (
        <div className="mt-3 rounded-xl border border-pot-green/30 bg-pot-green/5 p-3">
          <p className="text-sm text-white mb-3">
            💡 Earn yield on idle SOL — stake via Marinade (~7% APY) or Jito (~8% APY)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onProposeStaking?.(parseFloat(totalSol.toFixed(3))) }}
              className="btn-primary text-xs px-3 py-2"
            >
              Propose Staking
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSuggest(false); setDismissed(true) }}
              className="btn-secondary text-xs px-3 py-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VaultPortfolioDisplay
