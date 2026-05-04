'use client'

/**
 * StatusBadge — single source of truth for the 5-tier feature lifecycle chip.
 * Used everywhere in the UI + on /roadmap + mirrored in markdown via 🟢🟡🔵🟣⚪.
 */
export type StatusTier = 'live' | 'devnet' | 'phase-2' | 'phase-3' | 'vision'

const TIERS: Record<StatusTier, { dot: string; text: string; bg: string; border: string; label: string; emoji: string }> = {
  'live':    { dot: 'bg-pot-green',   text: 'text-pot-green',    bg: 'bg-pot-green/10',    border: 'border-pot-green/30',    label: 'Live · mainnet',          emoji: '🟢' },
  'devnet':  { dot: 'bg-yellow-400',  text: 'text-yellow-300',   bg: 'bg-yellow-400/10',   border: 'border-yellow-400/30',   label: 'Devnet',                  emoji: '🟡' },
  'phase-2': { dot: 'bg-blue-400',    text: 'text-blue-300',     bg: 'bg-blue-400/10',     border: 'border-blue-400/30',     label: 'Phase 2 · Q3 2026',       emoji: '🔵' },
  'phase-3': { dot: 'bg-pot-accent',  text: 'text-pot-accent',   bg: 'bg-pot-accent/10',   border: 'border-pot-accent/30',   label: 'Phase 3 · Q4 2026',       emoji: '🟣' },
  'vision':  { dot: 'bg-pot-muted',   text: 'text-pot-muted',    bg: 'bg-pot-card',        border: 'border-pot-border',      label: 'Vision · 2027+',          emoji: '⚪' },
}

interface Props {
  tier: StatusTier
  /** override default label */
  label?: string
  /** smaller version for inline use */
  compact?: boolean
  className?: string
}

export function StatusBadge({ tier, label, compact, className = '' }: Props) {
  const t = TIERS[tier]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${t.bg} ${t.border} ${t.text} ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'} font-semibold uppercase tracking-wide whitespace-nowrap ${className}`}
      title={t.label}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {label ?? t.label}
    </span>
  )
}
