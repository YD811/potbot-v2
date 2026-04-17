'use client'

/**
 * VaultAnalyticsStrip — compact live analytics bar for vault/pot headers.
 * Shows NAV (USD), all-time PnL%, 30d APY, open positions count, and last-updated time.
 * Silently disappears if the API backend is unreachable (isError + no cached data).
 */
import { useVaultAnalytics } from '@/hooks/useAnalytics'

interface Props {
  pubkey: string
}

function Stat({
  label,
  value,
  color = 'text-white',
  loading = false,
}: {
  label: string
  value: string
  color?: string
  loading?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[72px]">
      <span className="text-[10px] text-pot-muted uppercase tracking-wide font-medium">{label}</span>
      {loading ? (
        <div className="h-4 w-14 bg-pot-border rounded animate-pulse" />
      ) : (
        <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
      )}
    </div>
  )
}

function pnlColor(pct: number): string {
  if (pct > 0) return 'text-pot-green'
  if (pct < 0) return 'text-red-400'
  return 'text-pot-muted'
}

function fmtUsd(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(1)}K`
  if (usd > 0)          return `$${usd.toFixed(0)}`
  return '—'
}

export function VaultAnalyticsStrip({ pubkey }: Props) {
  const { data, isLoading, isError } = useVaultAnalytics(pubkey)

  // Graceful degradation: if API is completely unreachable, hide the strip
  if (isError && !data) return null

  const navUsd   = data?.navUsd   ?? 0
  const pnlPct   = data?.pnlPct   ?? 0
  const apy30d   = data?.apy30d   ?? 0
  const openPos  = data?.positions?.length ?? 0
  const updatedAt = data?.updatedAt

  const navFmt = data ? fmtUsd(navUsd) : '—'
  const pnlFmt = data ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%` : '—'
  const apyFmt = data ? `${apy30d.toFixed(1)}% APY` : '—'

  const lastUpdated = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex items-center gap-6 mt-3 pt-3 border-t border-pot-border/50 flex-wrap">
      <Stat
        label="NAV"
        value={navFmt}
        loading={isLoading}
        color="text-pot-green"
      />
      <Stat
        label="PnL (all-time)"
        value={pnlFmt}
        loading={isLoading}
        color={data ? pnlColor(pnlPct) : 'text-pot-muted'}
      />
      <Stat
        label="APY 30d"
        value={apyFmt}
        loading={isLoading}
        color="text-pot-accent"
      />
      {(isLoading || openPos > 0) && (
        <Stat
          label="Positions"
          value={isLoading ? '—' : String(openPos)}
          loading={isLoading}
          color="text-white"
        />
      )}

      {/* Live indicator */}
      {(data || isLoading) && (
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-pot-muted shrink-0">
          {isLoading ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-pot-muted" />
              <span>Loading…</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-pot-green animate-pulse" />
              <span className="text-pot-green">Live</span>
              {lastUpdated && <span>· {lastUpdated}</span>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
