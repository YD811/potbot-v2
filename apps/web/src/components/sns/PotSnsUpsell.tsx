'use client'

import { normalizeLabel, validateLabel } from '@/lib/sns'

export default function PotSnsUpsell({ variant = 'member', potPubkey, potName }:
  { variant?: 'creator' | 'member'; potPubkey: string; potName?: string }) {
  const suggested = potName ? normalizeLabel(potName) : ''
  const suggestedValid = suggested ? validateLabel(suggested) === null : false
  const params = new URLSearchParams()
  if (variant === 'creator' && suggestedValid) params.set('name', suggested)
  if (potPubkey) params.set('pot', potPubkey)
  const href = `/name${params.toString() ? `?${params}` : ''}`
  const isCreator = variant === 'creator'
  const title = isCreator ? 'Give this pot a name' : 'Claim your .potbot.sol'
  const body = isCreator
    ? (suggestedValid ? `Grab ${suggested}.potbot.sol — a clean, shareable handle for this pot.` : 'Grab a clean, shareable .potbot.sol handle for this pot.')
    : 'One human-readable name across PotBot, Y-DAO & SOLO.'
  const cta = isCreator && suggestedValid ? `Claim ${suggested}.potbot.sol` : 'Browse names'

  return (
    <div className="flex items-center gap-3.5 p-4 bg-pot-card border border-pot-green/20 rounded-2xl" style={{ backgroundImage: 'linear-gradient(90deg, rgba(20,241,149,0.06), rgba(153,69,255,0.06))' }}>
      <div className="text-3xl leading-none">{'🌿'}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-pot-muted text-xs mt-0.5">{body}</div>
      </div>
      <a href={href} className="shrink-0 px-4 py-2.5 rounded-lg bg-pot-green text-pot-dark text-sm font-bold no-underline whitespace-nowrap">{cta}</a>
    </div>
  )
}
