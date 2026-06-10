'use client'

import { useEffect, useState } from 'react'
import { StatusBadge } from './StatusBadge'
import { TrustBadge, type TrustLevel } from './TrustBadge'
import { VerifiedModal } from './VerifiedModal'

/**
 * PotHeroStrip — compact, sticky-on-scroll hero for /pots/[pubkey].
 *
 * Replaces the old heavy gradient header. The judge gets vault identity,
 * key metrics, network status, and the two primary CTAs (Deposit + Propose)
 * in a single ~120px tall strip that stays anchored on scroll.
 */

interface Props {
  emoji: string
  name: string
  snsName?: string
  pubkey: string
  ownerLabel?: string
  isPublic?: boolean
  isLive?: boolean
  squadsManaged?: boolean
  tvlSol: number
  members: number
  yourSharePct?: number
  activeProposals: number
  tamaHp?: number
  trustLevel?: TrustLevel
  verifiedBy?: string | null
  /** yieldStrategy — number (mock) or string key (on-chain) */
  strategy?: number | string
  /** Frozen state — deposits & execution paused, exits remain open. Defaults to active. */
  paused?: boolean
  /** Independent guardian wallet that can freeze the pot (never move funds). */
  sentinel?: string | null
  /** Risk cap — max % of the vault a single swap may move. Omitted if unset. */
  maxSwapPct?: number
  onDepositClick: () => void
  onProposeClick: () => void
  canPropose: boolean
  /** Clicking the Members metric activates the Members tab. */
  onMembersClick?: () => void
  /** Clicking the Tama HP metric activates the AI/Features tab. */
  onTamaClick?: () => void
}

/** Maps a yieldStrategy value to a Safe/Balanced/Aggressive/Custom pill. */
function strategyMeta(strategy?: number | string): { label: string; cls: string } {
  const key =
    strategy === 1 || strategy === 'conservative' ? 'safe' :
    strategy === 2 || strategy === 'balanced' ? 'balanced' :
    strategy === 3 || strategy === 'aggressive' ? 'aggressive' :
    'custom'
  switch (key) {
    case 'safe':       return { label: '🛡️ Safe',       cls: 'bg-pot-green/15 text-pot-green border-pot-green/30' }
    case 'balanced':   return { label: '⚖️ Balanced',   cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' }
    case 'aggressive': return { label: '⚡ Aggressive', cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
    default:           return { label: '✏️ Custom',      cls: 'bg-pot-border/40 text-pot-muted border-pot-border' }
  }
}

function abbreviate(addr: string) {
  if (!addr) return ''
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

export function PotHeroStrip({
  emoji,
  name,
  snsName,
  pubkey,
  ownerLabel,
  isPublic,
  isLive,
  squadsManaged,
  tvlSol,
  members,
  yourSharePct,
  activeProposals,
  tamaHp,
  trustLevel,
  verifiedBy,
  strategy,
  paused,
  sentinel,
  maxSwapPct,
  onDepositClick,
  onProposeClick,
  canPropose,
  onMembersClick,
  onTamaClick,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [verifiedOpen, setVerifiedOpen] = useState(false)
  const strat = strategyMeta(strategy)

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 120)
    handle()
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  const copyAddress = () => {
    navigator.clipboard.writeText(pubkey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div
      className={`sticky top-0 z-30 transition-all border-b border-pot-border bg-pot-dark/90 backdrop-blur ${
        scrolled ? 'shadow-lg shadow-black/40' : ''
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`shrink-0 transition-all ${scrolled ? 'text-3xl' : 'text-4xl sm:text-5xl'}`}>
              {emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`font-bold text-white truncate transition-all ${scrolled ? 'text-base' : 'text-lg sm:text-xl'}`}>
                  {name}
                </h1>
                <StatusBadge tier={isLive ? 'live' : 'devnet'} compact />
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${strat.cls}`}>
                  {strat.label}
                </span>
                {paused ? (
                  <span
                    className="px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px] font-bold uppercase tracking-wide cursor-help"
                    title="Frozen — deposits & execution paused, exits remain open"
                  >
                    🧊 Frozen
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full border bg-pot-green/15 text-pot-green border-pot-green/30 text-[10px] font-bold uppercase tracking-wide"
                    title="Active — deposits, trading and exits all open"
                  >
                    🟢 Active
                  </span>
                )}
                {sentinel && (
                  <span
                    className="px-1.5 py-0.5 rounded-full border bg-pot-card border-pot-border text-pot-muted text-[10px] font-semibold uppercase tracking-wide cursor-help"
                    title="An independent guardian can freeze this pot in an emergency. It can never move funds."
                  >
                    🛡 Sentinel enabled
                  </span>
                )}
                {maxSwapPct != null && (
                  <span
                    className="px-1.5 py-0.5 rounded-full border bg-pot-card border-pot-border text-pot-muted text-[10px] font-semibold uppercase tracking-wide cursor-help"
                    title="Onchain risk cap — no single trade can move more than this share of the vault"
                  >
                    Max swap: {maxSwapPct}% per trade
                  </span>
                )}
                {isPublic && (
                  <span className="px-1.5 py-0.5 rounded-full bg-pot-accent/15 text-pot-accent text-[10px] font-semibold uppercase tracking-wide">
                    Public
                  </span>
                )}
                {squadsManaged && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[10px] font-semibold uppercase tracking-wide">
                    🛡 Squads
                  </span>
                )}
                {ownerLabel && (
                  <span className="px-1.5 py-0.5 rounded-full bg-pot-card border border-pot-border text-pot-muted text-[10px] font-medium uppercase tracking-wide">
                    {ownerLabel}
                  </span>
                )}
                {trustLevel && trustLevel !== 'unverified' && (
                  <TrustBadge
                    level={trustLevel}
                    verifiedBy={verifiedBy}
                    size="md"
                    showAuditStatus
                    onClick={() => setVerifiedOpen(true)}
                  />
                )}
              </div>
              {/* Vault PDA row — funds live in a program-owned account, not with a person */}
              <div
                className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[11px]"
                title="Funds live in a program-owned account, not with a person."
              >
                <span className="text-pot-muted uppercase tracking-wide text-[9px] font-semibold cursor-help">
                  Vault (on-chain)
                </span>
                <button
                  type="button"
                  onClick={copyAddress}
                  title="Copy full vault address"
                  className="text-pot-muted font-mono hover:text-pot-green transition flex items-center gap-1"
                >
                  {snsName ? (
                    <span className="text-pot-green">{snsName}</span>
                  ) : (
                    <span>{abbreviate(pubkey)}</span>
                  )}
                  <span className="opacity-60">{copied ? '✓ copied' : '📋'}</span>
                </button>
                <a
                  href={`https://explorer.solana.com/address/${pubkey}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  title="View vault account on Solana Explorer"
                  className="text-pot-muted hover:text-pot-green transition"
                >
                  ↗
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap">
            <Metric label="TVL" value={`${tvlSol.toFixed(2)} SOL`} accent="green" />
            <Metric label="Members" value={String(members)} onClick={onMembersClick} />
            {yourSharePct != null && yourSharePct > 0 && (
              <Metric label="Your share" value={`${yourSharePct.toFixed(1)}%`} accent="accent" />
            )}
            {activeProposals > 0 && (
              <Metric label="Active votes" value={String(activeProposals)} accent="accent" pulse />
            )}
            {tamaHp != null && (
              <Metric label="Tama HP" value={`${tamaHp}/100`} onClick={onTamaClick} />
            )}

            <div className="flex items-center gap-2 ml-1">
              <button
                onClick={onDepositClick}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pot-green hover:bg-pot-green/90 text-pot-dark transition shrink-0"
              >
                💰 Deposit
              </button>
              <button
                onClick={onProposeClick}
                disabled={!canPropose}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pot-accent hover:bg-pot-accent/90 text-white transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title={canPropose ? 'Open proposal builder' : 'Members only'}
              >
                🗳️ Propose
              </button>
            </div>
          </div>
        </div>
      </div>

      <VerifiedModal isOpen={verifiedOpen} onClose={() => setVerifiedOpen(false)} />
    </div>
  )
}

function Metric({
  label,
  value,
  accent,
  pulse,
  onClick,
}: {
  label: string
  value: string
  accent?: 'green' | 'accent'
  pulse?: boolean
  onClick?: () => void
}) {
  const valueClass =
    accent === 'green' ? 'text-pot-green' : accent === 'accent' ? 'text-pot-accent' : 'text-white'
  const className = `bg-pot-card border border-pot-border rounded-xl px-3 py-1.5 min-w-[78px] text-left ${
    pulse ? 'animate-pulse' : ''
  } ${onClick ? 'cursor-pointer hover:border-pot-green/50 transition' : ''}`
  const inner = (
    <>
      <div className="text-[9px] uppercase tracking-wide text-pot-muted leading-none">{label}</div>
      <div className={`text-sm sm:text-base font-bold tabular-nums ${valueClass} mt-0.5`}>{value}</div>
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} title={`View ${label}`}>
        {inner}
      </button>
    )
  }
  return <div className={className}>{inner}</div>
}
