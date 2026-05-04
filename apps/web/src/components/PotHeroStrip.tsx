'use client'

import { useEffect, useState } from 'react'
import { StatusBadge } from './StatusBadge'

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
  onDepositClick: () => void
  onProposeClick: () => void
  canPropose: boolean
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
  onDepositClick,
  onProposeClick,
  canPropose,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
              </div>
              <button
                type="button"
                onClick={copyAddress}
                title="Copy full pubkey"
                className="mt-0.5 text-[11px] text-pot-muted font-mono hover:text-pot-green transition flex items-center gap-1"
              >
                {snsName ? (
                  <span className="text-pot-green">{snsName}</span>
                ) : (
                  <span>{abbreviate(pubkey)}</span>
                )}
                <span className="opacity-60">{copied ? '✓ copied' : '📋'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap">
            <Metric label="TVL" value={`${tvlSol.toFixed(2)} SOL`} accent="green" />
            <Metric label="Members" value={String(members)} />
            {yourSharePct != null && yourSharePct > 0 && (
              <Metric label="Your share" value={`${yourSharePct.toFixed(1)}%`} accent="accent" />
            )}
            {activeProposals > 0 && (
              <Metric label="Active votes" value={String(activeProposals)} accent="accent" pulse />
            )}
            {tamaHp != null && (
              <Metric label="Tama HP" value={`${tamaHp}/100`} />
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
    </div>
  )
}

function Metric({
  label,
  value,
  accent,
  pulse,
}: {
  label: string
  value: string
  accent?: 'green' | 'accent'
  pulse?: boolean
}) {
  const valueClass =
    accent === 'green' ? 'text-pot-green' : accent === 'accent' ? 'text-pot-accent' : 'text-white'
  return (
    <div
      className={`bg-pot-card border border-pot-border rounded-xl px-3 py-1.5 min-w-[78px] ${
        pulse ? 'animate-pulse' : ''
      }`}
    >
      <div className="text-[9px] uppercase tracking-wide text-pot-muted leading-none">{label}</div>
      <div className={`text-sm sm:text-base font-bold tabular-nums ${valueClass} mt-0.5`}>{value}</div>
    </div>
  )
}
