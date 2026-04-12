'use client'

import { useState } from 'react'
import { useTokenRisk, RISK_CONFIG } from '@/lib/scam-check'
import type { TokenRisk } from '@/lib/scam-check'

interface Props {
  mint: string
  symbol?: string
  /** If true, shows as compact inline badge */
  compact?: boolean
}

/**
 * Shows a risk badge for a Solana token.
 * Pulls from RugCheck.xyz — expands to show risk breakdown.
 */
export function ScamWarning({ mint, symbol, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { data: risk, isLoading } = useTokenRisk(mint)

  if (isLoading) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 animate-pulse">
        Checking…
      </span>
    )
  }

  if (!risk) return null

  // Don't show anything for known safe tokens in compact mode
  if (compact && risk.level === 'safe' && risk.isKnown) return null

  const cfg = RISK_CONFIG[risk.level]

  if (compact) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
        className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} transition-all hover:opacity-80`}
        title={`Risk score: ${risk.score === -1 ? 'N/A' : risk.score}/1000`}
      >
        {cfg.icon} {cfg.label}
      </button>
    )
  }

  return (
    <div className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <div>
            <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
            {symbol && (
              <span className="text-xs text-pot-muted ml-1">— {symbol}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {risk.score >= 0 && (
            <span className="text-xs text-pot-muted">
              Score: <span className={cfg.color}>{risk.score}/1000</span>
            </span>
          )}
          {risk.risks.length > 0 && (
            <span className="text-pot-muted text-xs">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {/* Risk breakdown */}
      {expanded && risk.risks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {risk.risks.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs mt-0.5">{r.level === 'danger' ? '🚨' : '⚠️'}</span>
              <div>
                <div className="text-xs font-medium text-white">{r.name}</div>
                {r.description && (
                  <div className="text-xs text-pot-muted">{r.description}</div>
                )}
              </div>
            </div>
          ))}

          {/* Token flags */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
            <FlagRow label="Mint Authority" value={risk.hasMintAuthority} danger />
            <FlagRow label="Freeze Authority" value={risk.hasFreezeAuthority} danger />
            {risk.topHoldersPct > 0 && (
              <div className="col-span-2">
                <span className="text-xs text-pot-muted">Top 10 holders: </span>
                <span className={`text-xs font-mono ${risk.topHoldersPct > 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {risk.topHoldersPct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Danger CTA */}
      {risk.level === 'danger' && (
        <div className="mt-2 text-xs text-red-300 bg-red-500/5 rounded-lg p-2 border border-red-500/10">
          ⚠️ This token shows high-risk signals. Consider proposing a different asset or proceed with extreme caution.
        </div>
      )}
    </div>
  )
}

function FlagRow({ label, value, danger }: { label: string; value: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs ${value && danger ? 'text-red-400' : value ? 'text-yellow-400' : 'text-green-400'}`}>
        {value ? '●' : '○'}
      </span>
      <span className="text-xs text-pot-muted">{label}</span>
      <span className={`text-xs ${value && danger ? 'text-red-400' : 'text-green-400'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  )
}

/**
 * Inline risk badge — use inside token lists/dropdowns
 */
export function RiskBadge({ mint }: { mint: string }) {
  return <ScamWarning mint={mint} compact />
}