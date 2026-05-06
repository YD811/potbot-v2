'use client'

interface StrategyBadgeProps {
  mode: 'MOCK' | 'LIVE'
  className?: string
}

export function StrategyBadge({ mode, className = '' }: StrategyBadgeProps) {
  const isLive = mode === 'LIVE'

  const tone = isLive
    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'

  const label = isLive ? '🔗 On-chain' : '🧪 Demo'
  const title = isLive
    ? 'Live: backed by an on-chain Anchor account on Solana'
    : 'Demo: simulated data, no on-chain account'

  return (
    <span
      data-testid="strategy-badge"
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${tone} ${className}`}
    >
      {label}
    </span>
  )
}

export default StrategyBadge
