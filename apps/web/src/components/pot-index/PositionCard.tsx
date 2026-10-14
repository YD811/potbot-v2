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
export function PositionCard({ pot, sharesBase, indexPrice, connected, change7d }: { pot: PotView; sharesBase: number | undefined; indexPrice: number | undefined; connected: boolean; change7d?: number | null }) {
  const q = useWalletPosition(pot)
  const shares = (sharesBase ?? 0) / 1e6
  if (!connected || (!sharesBase && !(q.data && q.data.events > 0))) {
    return (
      <div className="rounded-3xl border border-pot-border bg-pot-card p-6">
        <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">Your position</h3>
        <p className="mt-2 font-mono text-2xl tabular-nums text-white">{shares.toFixed(4)} <span className="text-base text-pot-muted">${pot.symbol}</span></p>
        <p className="mt-1 text-sm text-pot-muted">{connected ? 'No deposits from this wallet yet.' : 'Connect a wallet to see your holding and P&L.'}</p>
      </div>
    )
  }
  const value = indexPrice != null ? shares * indexPrice : null
  const pos = q.data
  const cost = pos ? pos.costUsd : null
  const unrealized = value != null && cost != null ? value - cost : null
  const unrealizedPct = unrealized != null && cost && cost > 0 ? (unrealized / cost) * 100 : null
  const sign = (v: number) => (v >= 0 ? '+' : '−')
  const tone = (v: number) => (v >= 0 ? 'text-pot-green' : 'text-pot-muted')

  return (
    <div className="rounded-3xl border border-pot-border bg-pot-card p-6">
      <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">Your position</h3>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">Holding</p>
          <p className="mt-1 font-mono text-base tabular-nums text-white">{shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} {pot.symbol}</p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">Value now</p>
          <p className="mt-1 font-mono text-base tabular-nums text-white">{value != null ? usd(value) : '—'}</p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">Cost basis</p>
          <p className="mt-1 font-mono text-base tabular-nums text-white">{cost != null ? usd(cost) : q.isLoading ? '…' : '—'}</p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">Unrealized P&L</p>
          <p className={`mt-1 font-mono text-base tabular-nums ${unrealized != null ? tone(unrealized) : 'text-white'}`}>
            {unrealized != null ? `${sign(unrealized)}${usd(Math.abs(unrealized))}` : '—'}
            {unrealizedPct != null && <span className="ml-1 text-xs">({sign(unrealizedPct)}{Math.abs(unrealizedPct).toFixed(2)}%)</span>}
          </p>
        </div>
      </div>
      {pos && (pos.realizedUsd !== 0 || pos.withdrawnUsd > 0) && (
        <p className="mt-4 font-mono text-xs tabular-nums text-pot-muted">
          Deposited {usd(pos.depositedUsd)} · redeemed to USDC {usd(pos.withdrawnUsd)} · realized{' '}
          <span className={tone(pos.realizedUsd)}>{sign(pos.realizedUsd)}{usd(Math.abs(pos.realizedUsd))}</span>
        </p>
      )}
      {(() => {
        const avgEntry = pos && shares > 0 && pos.costUsd > 0 ? pos.costUsd / shares : null
        if (avgEntry == null || indexPrice == null) return null
        const vsEntry = ((indexPrice - avgEntry) / avgEntry) * 100
        return (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer select-none text-pot-muted">Stats</summary>
            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-pot-border pt-3 font-mono text-xs tabular-nums">
              <div><div className="text-pot-muted">Your entry</div><div className="mt-1 text-white">{usd(avgEntry, 4)}</div></div>
              <div><div className="text-pot-muted">Now</div><div className="mt-1 text-white">{usd(indexPrice, 4)}</div></div>
              <div><div className="text-pot-muted">You vs entry</div><div className={`mt-1 ${tone(vsEntry)}`}>{sign(vsEntry)}{Math.abs(vsEntry).toFixed(2)}%</div></div>
            </div>
            {change7d != null && (
              <p className="mt-3 text-pot-muted">Token price 7d: <span className={`font-mono tabular-nums ${tone(change7d)}`}>{sign(change7d)}{Math.abs(change7d).toFixed(2)}%</span>. Your entry is the dashed line on the chart.</p>
            )}
          </details>
        )
      })()}
      <p className="mt-3 text-xs text-pot-muted" title="Average cost from this wallet's own deposits and redemptions onchain, entry fees included.">From your onchain history.</p>
    </div>
  )
}
