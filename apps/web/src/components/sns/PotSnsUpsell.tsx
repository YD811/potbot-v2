'use client'

import { normalizeLabel, validateLabel } from '@/lib/sns'

const GREEN = '#14F195'
const MUTED = '#6B7280'

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#111827', border: `1px solid ${GREEN}33`, borderRadius: 14, backgroundImage: 'linear-gradient(90deg, rgba(20,241,149,0.06), rgba(153,69,255,0.06))' }}>
      <div style={{ fontSize: 28, lineHeight: 1 }}>{'🌿'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{body}</div>
      </div>
      <a href={href} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 10, background: GREEN, color: '#04150C', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>{cta}</a>
    </div>
  )
}
