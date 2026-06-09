'use client'

export type TrustLevel = 'unverified' | 'community' | 'audited' | 'institutional'

interface TrustBadgeProps {
  level: TrustLevel
  verifiedBy?: string | null
  auditUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  /** When provided, the badge becomes a button that calls this instead of
   *  linking to `auditUrl` — used to open the VerifiedModal. */
  onClick?: (e: React.MouseEvent) => void
}

const TRUST_CONFIG: Record<TrustLevel, {
  icon: string
  label: string
  color: string
  bg: string
  border: string
  description: string
}> = {
  unverified: {
    icon: '○',
    label: 'Unverified',
    color: 'text-pot-muted',
    bg: 'bg-pot-border/30',
    border: 'border-pot-border',
    description: 'This vault has not been reviewed',
  },
  community: {
    icon: '✦',
    label: 'Community',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    description: 'Reviewed by the PotBot community',
  },
  audited: {
    icon: '✔',
    label: 'Audited',
    color: 'text-pot-green',
    bg: 'bg-pot-green/10',
    border: 'border-pot-green/30',
    description: 'Professionally audited vault',
  },
  institutional: {
    icon: '⬡',
    label: 'Institutional',
    color: 'text-pot-accent',
    bg: 'bg-pot-accent/10',
    border: 'border-pot-accent/30',
    description: 'Institutional-grade security audit',
  },
}

export function TrustBadge({
  level,
  verifiedBy,
  auditUrl,
  size = 'sm',
  showLabel = true,
  onClick,
}: TrustBadgeProps) {
  if (level === 'unverified') return null

  const cfg = TRUST_CONFIG[level]

  const sizeClass = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size]

  const badge = (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} ${sizeClass}`}
      title={verifiedBy ? `${cfg.description} · ${verifiedBy}` : cfg.description}
    >
      <span>{cfg.icon}</span>
      {showLabel && <span>{cfg.label}</span>}
    </span>
  )

  // An explicit onClick (e.g. open VerifiedModal) takes priority over the
  // audit-report link.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="hover:opacity-80 transition cursor-pointer">
        {badge}
      </button>
    )
  }

  if (auditUrl) {
    return (
      <a href={auditUrl} target="_blank" rel="noreferrer" className="hover:opacity-80 transition">
        {badge}
      </a>
    )
  }

  return badge
}

/** Full trust card — used in pot detail page */
export function TrustCard({
  level,
  verifiedBy,
  verifiedAt,
  auditUrl,
  trustNote,
}: {
  level: TrustLevel
  verifiedBy?: string | null
  verifiedAt?: string | null
  auditUrl?: string | null
  trustNote?: string | null
}) {
  const cfg = TRUST_CONFIG[level]

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-2 font-bold ${cfg.color}`}>
          <span className="text-lg">{cfg.icon}</span>
          <span>{cfg.label}</span>
        </div>
        {auditUrl && (
          <a
            href={auditUrl}
            target="_blank"
            rel="noreferrer"
            className={`text-xs ${cfg.color} underline hover:opacity-80`}
          >
            View Report ↗
          </a>
        )}
      </div>

      <p className="text-sm text-pot-muted mb-2">{cfg.description}</p>

      {trustNote && (
        <p className="text-xs text-white/70 mb-2 italic">"{trustNote}"</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-pot-muted">
        {verifiedBy && (
          <span>
            <span className="text-white/50">Auditor:</span>{' '}
            <span className="text-white">{verifiedBy}</span>
          </span>
        )}
        {verifiedAt && (
          <span>
            <span className="text-white/50">Date:</span>{' '}
            <span className="text-white">
              {new Date(verifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
