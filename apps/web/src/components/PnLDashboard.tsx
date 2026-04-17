'use client'

import { useMemo, useState } from 'react'
import { useTokenPrices, formatUsd, KNOWN_TOKENS } from '@/lib/prices'
import { calcPositionPnl, formatPct, SEED_POSITIONS } from '@/lib/positions'
import type { Position, PositionPnl } from '@/lib/positions'
import { useSolPrice } from '@/lib/prices'
import { useVaultAnalytics } from '@/hooks/useAnalytics'
import type { PositionWithPnl } from '@/lib/api-client'

interface Props {
  potPubkey: string
  vaultBalanceSol: number
}

const DEFI_ICONS: Record<string, string> = {
  none: '—',
  kamino: '🏦',
  drift: '📈',
  marginfi: '💰',
}

// ── Real API positions display ──────────────────────────────────────────────

function RealPositionCard({ pos, vaultNavUsd }: { pos: PositionWithPnl; vaultNavUsd: number }) {
  const [expanded, setExpanded] = useState(false)
  const allocationPct = vaultNavUsd > 0 ? (pos.currentValue / vaultNavUsd) * 100 : 0

  const pnlColor = pos.unrealizedPnlUsd >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="card p-4 border border-pot-border transition-all">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Token info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pot-accent/20 border border-pot-accent/30 flex items-center justify-center text-sm font-bold text-pot-accent">
            {pos.symbol.slice(0, 2)}
          </div>
          <div>
            <span className="font-semibold text-white">{pos.symbol}</span>
            <div className="text-xs text-pot-muted font-mono">
              {pos.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {pos.symbol}
            </div>
          </div>
        </div>

        {/* P&L */}
        <div className="text-right">
          <div className={`font-bold font-mono text-base ${pnlColor}`}>
            {pos.unrealizedPnlUsd >= 0 ? '+' : ''}{formatUsd(Math.abs(pos.unrealizedPnlUsd))}
          </div>
          <div className={`text-xs font-mono ${pnlColor}`}>
            {formatPct(pos.unrealizedPnlPct)}
          </div>
          <div className="text-xs text-pot-muted">
            {allocationPct.toFixed(1)}% of vault
          </div>
        </div>
        <span className="text-pot-muted ml-3 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-pot-border space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-pot-dark rounded-lg p-3 text-center">
              <div className="text-[10px] text-pot-muted mb-1">Entry Price</div>
              <div className="text-xs font-mono text-white">
                ${pos.entryPrice < 0.001 ? pos.entryPrice.toFixed(8) : pos.entryPrice.toFixed(4)}
              </div>
            </div>
            <div className="bg-pot-dark rounded-lg p-3 text-center">
              <div className="text-[10px] text-pot-muted mb-1">Current Price</div>
              <div className={`text-xs font-mono ${pnlColor}`}>
                ${pos.currentPrice < 0.001 ? pos.currentPrice.toFixed(8) : pos.currentPrice.toFixed(4)}
              </div>
            </div>
            <div className="bg-pot-dark rounded-lg p-3 text-center">
              <div className="text-[10px] text-pot-muted mb-1">Current Value</div>
              <div className="text-xs font-mono text-white">{formatUsd(pos.currentValue)}</div>
            </div>
          </div>

          {/* Price movement bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-pot-muted">Price movement from entry</span>
              <span className={pnlColor}>{formatPct(pos.unrealizedPnlPct)}</span>
            </div>
            <div className="h-2 bg-pot-dark rounded-full overflow-hidden relative">
              <div className="absolute inset-0 flex">
                <div className="flex-1 border-r border-pot-border/50" />
              </div>
              <div
                className={`h-full rounded-full transition-all ${
                  pos.unrealizedPnlPct >= 0 ? 'bg-green-500 ml-auto' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(50, Math.abs(pos.unrealizedPnlPct))}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-pot-muted">
            <span>Cost basis: {formatUsd(pos.entryValue)}</span>
            <span>•</span>
            <span>Mint: {pos.mint.slice(0, 6)}…{pos.mint.slice(-4)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export function PnLDashboard({ potPubkey, vaultBalanceSol }: Props) {
  const [sortBy, setSortBy] = useState<'pnl' | 'value' | 'allocation'>('value')
  const [showClosed, setShowClosed] = useState(false)

  // ── Real API analytics ─────────────────────────────────────────────────────
  const { data: analytics, isLoading: analyticsLoading } = useVaultAnalytics(potPubkey)
  const hasRealPositions = (analytics?.positions?.length ?? 0) > 0

  // ── Demo positions fallback (SEED_POSITIONS + live prices) ─────────────────
  const demoPositions = useMemo(
    () => SEED_POSITIONS.filter((p) => p.potPubkey === potPubkey && (showClosed || p.isOpen)),
    [potPubkey, showClosed]
  )
  const demoMints = useMemo(
    () => [...new Set(demoPositions.map((p) => p.tokenMint))],
    [demoPositions]
  )
  const { data: demoPrices } = useTokenPrices(demoMints)
  const { price: solPrice } = useSolPrice()
  const vaultBalanceUsd = solPrice ? vaultBalanceSol * solPrice : (analytics?.solBalanceUsd ?? 0)

  const demoPnlItems = useMemo<PositionPnl[]>(() => {
    return demoPositions.map((pos) => {
      const currentPrice = demoPrices?.[pos.tokenMint] ?? pos.entryPriceUsd
      return calcPositionPnl(pos, currentPrice, vaultBalanceUsd)
    })
  }, [demoPositions, demoPrices, vaultBalanceUsd])

  // ── Unified real positions (sorted) ────────────────────────────────────────
  const realPositionsSorted = useMemo(() => {
    if (!analytics?.positions) return []
    const navUsd = analytics.navUsd
    return [...analytics.positions].sort((a, b) => {
      if (sortBy === 'pnl')        return b.unrealizedPnlUsd - a.unrealizedPnlUsd
      if (sortBy === 'value')      return b.currentValue - a.currentValue
      if (sortBy === 'allocation') {
        const aAlloc = navUsd > 0 ? a.currentValue / navUsd : 0
        const bAlloc = navUsd > 0 ? b.currentValue / navUsd : 0
        return bAlloc - aAlloc
      }
      return 0
    })
  }, [analytics, sortBy])

  // ── Demo positions (sorted) ─────────────────────────────────────────────────
  const demoSorted = useMemo(() => {
    return [...demoPnlItems].sort((a, b) => {
      if (sortBy === 'pnl')   return b.pnlPct - a.pnlPct
      if (sortBy === 'value') return b.currentValueUsd - a.currentValueUsd
      return b.allocationPct - a.allocationPct
    })
  }, [demoPnlItems, sortBy])

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalPnlUsd = hasRealPositions
    ? analytics!.pnlUsd
    : demoPnlItems.reduce((s, p) => s + p.pnlUsd, 0)

  const totalValueUsd = hasRealPositions
    ? analytics!.navUsd
    : demoPnlItems.reduce((s, p) => s + p.currentValueUsd, 0)

  const totalPnlPct = hasRealPositions
    ? analytics!.pnlPct
    : (() => {
        const entry = demoPnlItems.reduce((s, p) => s + p.entryValueUsd, 0)
        return entry > 0 ? (totalPnlUsd / entry) * 100 : 0
      })()

  const positionCount = hasRealPositions
    ? analytics!.positions!.length
    : demoPnlItems.length

  const navUsd = analytics?.navUsd ?? vaultBalanceUsd

  // Empty state
  if (!analyticsLoading && !hasRealPositions && demoPositions.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-lg font-semibold text-white mb-1">No Open Positions</h3>
        <p className="text-pot-muted text-sm">
          When your POT executes swaps, positions will appear here with live P&L tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Source indicator */}
      {hasRealPositions ? (
        <div className="flex items-center gap-2 text-xs text-pot-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-pot-green animate-pulse" />
          <span className="text-pot-green font-medium">Live data</span>
          <span>· {analytics!.positions!.length} positions from API · updated {new Date(analytics!.updatedAt).toLocaleTimeString()}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-pot-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          <span>Demo positions</span>
          <span>· Connect API backend to see real data</span>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Open Positions"
          value={String(positionCount)}
          sub="active trades"
        />
        <SummaryCard
          label="Total Value"
          value={formatUsd(totalValueUsd)}
          sub="current market value"
          accent
        />
        <SummaryCard
          label="Total P&L"
          value={`${totalPnlUsd >= 0 ? '+' : ''}${formatUsd(Math.abs(totalPnlUsd))}`}
          sub={formatPct(totalPnlPct)}
          pnl={totalPnlUsd}
        />
        <SummaryCard
          label="In Positions"
          value={`${navUsd > 0 ? (totalValueUsd / navUsd * 100).toFixed(1) : 0}%`}
          sub="of vault in open trades"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['value', 'pnl', 'allocation'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition capitalize ${
                sortBy === s
                  ? 'border-pot-accent text-pot-accent bg-pot-accent/10'
                  : 'border-pot-border text-pot-muted hover:text-white'
              }`}
            >
              Sort by {s}
            </button>
          ))}
        </div>
        {!hasRealPositions && (
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-pot-border text-pot-muted hover:text-white transition"
          >
            {showClosed ? '🔴 Hide Closed' : '📁 Show Closed'}
          </button>
        )}
      </div>

      {/* Positions */}
      <div className="space-y-3">
        {hasRealPositions
          ? realPositionsSorted.map((pos) => (
              <RealPositionCard key={pos.mint} pos={pos} vaultNavUsd={navUsd} />
            ))
          : demoSorted.map((item) => (
              <PositionCard key={item.position.id} item={item} />
            ))
        }
      </div>

      {/* APY strip (real data only) */}
      {hasRealPositions && analytics!.apy30d > 0 && (
        <div className="card p-4 flex items-center gap-4">
          <div>
            <div className="text-xs text-pot-muted">30d APY</div>
            <div className="text-lg font-bold text-pot-accent font-mono">{analytics!.apy30d.toFixed(1)}%</div>
          </div>
          {analytics!.apy7d != null && (
            <div>
              <div className="text-xs text-pot-muted">7d APY</div>
              <div className="text-lg font-bold text-white font-mono">{analytics!.apy7d.toFixed(1)}%</div>
            </div>
          )}
          <div className="ml-auto text-xs text-pot-muted">Annualized from NAV history</div>
        </div>
      )}
    </div>
  )
}

// ── Legacy demo position card (from SEED_POSITIONS) ─────────────────────────

function PositionCard({ item }: { item: PositionPnl }) {
  const [expanded, setExpanded] = useState(false)
  const { position: pos } = item

  const tokenAmount = pos.amount / Math.pow(10, pos.tokenDecimals)

  const statusColor = {
    normal: 'border-pot-border',
    near_stop: 'border-orange-500/40',
    near_tp: 'border-yellow-500/40',
    triggered_stop: 'border-red-500/50',
    triggered_tp: 'border-green-500/50',
  }[item.strategyStatus]

  const statusBadge = {
    normal: null,
    near_stop: { text: '⚠️ Near Stop-Loss', cls: 'bg-orange-500/20 text-orange-400' },
    near_tp: { text: '🎯 Near Take-Profit', cls: 'bg-yellow-500/20 text-yellow-400' },
    triggered_stop: { text: '🛑 Stop-Loss Hit', cls: 'bg-red-500/20 text-red-400' },
    triggered_tp: { text: '✅ Take-Profit Hit', cls: 'bg-green-500/20 text-green-400' },
  }[item.strategyStatus]

  return (
    <div className={`card p-4 border ${statusColor} transition-all`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pot-accent/20 border border-pot-accent/30 flex items-center justify-center text-sm font-bold text-pot-accent">
            {pos.tokenSymbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{pos.tokenSymbol}</span>
              {statusBadge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
                  {statusBadge.text}
                </span>
              )}
              {pos.strategy.defiRoute !== 'none' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  {DEFI_ICONS[pos.strategy.defiRoute]} {pos.strategy.defiRoute}
                </span>
              )}
            </div>
            <div className="text-xs text-pot-muted font-mono">
              {tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {pos.tokenSymbol}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`font-bold font-mono text-base ${item.pnlUsd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {item.pnlUsd >= 0 ? '+' : ''}{formatUsd(Math.abs(item.pnlUsd))}
          </div>
          <div className={`text-xs font-mono ${item.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPct(item.pnlPct)}
          </div>
          <div className="text-xs text-pot-muted">
            {item.allocationPct.toFixed(1)}% of vault
          </div>
        </div>

        <span className="text-pot-muted ml-3 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-pot-border space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-pot-dark rounded-lg p-3 text-center">
              <div className="text-[10px] text-pot-muted mb-1">Entry Price</div>
              <div className="text-xs font-mono text-white">
                ${pos.entryPriceUsd < 0.001 ? pos.entryPriceUsd.toFixed(8) : pos.entryPriceUsd.toFixed(4)}
              </div>
            </div>
            <div className="bg-pot-dark rounded-lg p-3 text-center">
              <div className="text-[10px] text-pot-muted mb-1">Current Price</div>
              <div className={`text-xs font-mono ${item.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${item.currentPriceUsd < 0.001 ? item.currentPriceUsd.toFixed(8) : item.currentPriceUsd.toFixed(4)}
              </div>
            </div>
            <div className="bg-pot-dark rounded-lg p-3 text-center">
              <div className="text-[10px] text-pot-muted mb-1">Current Value</div>
              <div className="text-xs font-mono text-white">{formatUsd(item.currentValueUsd)}</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-pot-muted">Price movement from entry</span>
              <span className={item.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPct(item.pnlPct)}
              </span>
            </div>
            <div className="h-2 bg-pot-dark rounded-full overflow-hidden relative">
              <div className="absolute inset-0 flex">
                <div className="flex-1 border-r border-pot-border/50" />
              </div>
              <div
                className={`h-full rounded-full transition-all ${item.pnlPct >= 0 ? 'bg-green-500 ml-auto' : 'bg-red-500'}`}
                style={{ width: `${Math.min(50, Math.abs(item.pnlPct))}%` }}
              />
            </div>
          </div>

          {(item.stopLossTriggerUsd || item.takeProfitTriggerUsd) && (
            <div className="grid grid-cols-2 gap-2">
              {item.stopLossTriggerUsd && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2.5">
                  <div className="text-[10px] text-red-400/70 mb-0.5">Stop-Loss</div>
                  <div className="text-xs font-mono text-red-400">
                    ${item.stopLossTriggerUsd.toFixed(6)} (-{pos.strategy.stopLossPct}%)
                  </div>
                </div>
              )}
              {item.takeProfitTriggerUsd && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2.5">
                  <div className="text-[10px] text-green-400/70 mb-0.5">Take-Profit</div>
                  <div className="text-xs font-mono text-green-400">
                    ${item.takeProfitTriggerUsd.toFixed(6)} (+{pos.strategy.takeProfitPct}%)
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-pot-muted">
            <span>Opened {new Date(pos.openedAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>Cost basis: {formatUsd(item.entryValueUsd)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  accent = false,
  pnl,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  pnl?: number
}) {
  const color = pnl !== undefined
    ? pnl >= 0 ? 'text-green-400' : 'text-red-400'
    : accent ? 'text-pot-green' : 'text-white'
  return (
    <div className="card p-4">
      <div className="text-xs text-pot-muted mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-pot-muted mt-0.5">{sub}</div>}
    </div>
  )
}
