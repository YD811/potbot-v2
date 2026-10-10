'use client'

import { useWalletPosition } from '@/hooks/usePotIndex'
import type { PotView } from '@/lib/pot-index/client'

function usd(v: number, digits = 2) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

/**
 * The connected wallet's P&L in this Pot. Value = tokens held × index price (live). Cost basis comes
 * from the wallet's own deposits and exits on-chain (average cost, entry fees included).
 */
export function PositionCard({ pot, sharesBase, indexPrice }: { pot: PotView; sharesBase: number | undefined; indexPrice: number | undefined }) {
  const q = useWalletPosition(pot)
  const shares = (sharesBase ?? 0) / 1e6
  if (!sharesBase && !(q.data && q.data.events > 0)) return null
  const value = indexPrice != null ? shares * indexPrice : null
  const pos = q.data
  const cost = pos ? pos.costUsd : null
  const unrealized = value != null && cost != null ? value - cost : null
  const unrealizedPct = unrealized != null && cost && cost > 0 ? (unrealized / cost) * 100 : null
  const sign = (v: number) => (v >= 0 ? '+' : '−')
  const tone = (v: number) => (v >= 0 ? 'text-pot-green' : 'text-red-300')

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-white">Your position</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-white/70">Holding</p>
          <p className="font-semibold text-white">{shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} {pot.symbol}</p>
        </div>
        <div>
          <p className="text-xs text-white/70">Value now</p>
          <p className="font-semibold text-white">{value != null ? usd(value) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-white/70">Cost basis</p>
          <p className="font-semibold text-white">{cost != null ? usd(cost) : q.isLoading ? '…' : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-white/70">Unrealized P&L</p>
          <p className={`font-semibold ${unrealized != null ? tone(unrealized) : 'text-white'}`}>
            {unrealized != null ? `${sign(unrealized)}${usd(Math.abs(unrealized))}` : '—'}
            {unrealizedPct != null && <span className="ml-1 text-xs opacity-80">({sign(unrealizedPct)}{Math.abs(unrealizedPct).toFixed(2)}%)</span>}
          </p>
        </div>
      </div>
      {pos && (pos.realizedUsd !== 0 || pos.withdrawnUsd > 0) && (
        <p className="mt-3 text-xs text-white/70">
          Deposited {usd(pos.depositedUsd)} · redeemed to USDC {usd(pos.withdrawnUsd)} · realized{' '}
          <span className={tone(pos.realizedUsd)}>{sign(pos.realizedUsd)}{usd(Math.abs(pos.realizedUsd))}</span>
        </p>
      )}
      <p className="mt-2 text-[11px] text-white/50">Cost basis is computed from this wallet&apos;s own deposits and redemptions on-chain, entry fees included. Redemptions to assets reduce cost at average price.</p>
    </div>
  )
}
