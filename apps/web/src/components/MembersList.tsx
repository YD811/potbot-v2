'use client'

import { useState } from 'react'

/**
 * MembersList — richer member roster with copy-pubkey, share %, joined date,
 * delegate status, owner crown.
 *
 * Replaces the inline rendering that was previously in pots/[pubkey]/page.tsx
 * Members tab. Drop-in: same shape of `members` and `pot` from React-Query.
 */

interface Member {
  wallet?: string
  pubkey?: string
  shares?: number
  joinedAt?: string | number
  delegateActive?: boolean
}

interface Props {
  members: Member[]
  totalShares: number
  ownerAddress?: string
  cluster?: 'mainnet-beta' | 'devnet'
}

function abbreviate(addr?: string) {
  if (!addr) return 'unknown'
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`
}

function jdenticonGradient(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h1 = hash & 0xff
  const h2 = (hash >> 8) & 0xff
  return `linear-gradient(135deg, hsl(${h1},70%,50%), hsl(${h2},70%,40%))`
}

export function MembersList({ members, totalShares, ownerAddress, cluster = 'devnet' }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const explorerSuffix = cluster === 'mainnet-beta' ? '' : '?cluster=devnet'

  const copy = (s: string) => {
    navigator.clipboard.writeText(s)
    setCopied(s)
    setTimeout(() => setCopied(null), 1200)
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-12 bg-pot-card border border-pot-border rounded-2xl">
        <div className="text-4xl mb-3">👻</div>
        <p className="text-white font-semibold mb-1">No members yet</p>
        <p className="text-sm text-pot-muted">Share this pot or post it as a Solana Blink to invite people.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {members.map((m, i) => {
        const addr = m.wallet ?? m.pubkey ?? 'unknown'
        const shares = m.shares ?? 0
        const sharesPct = totalShares > 0 ? (shares / totalShares) * 100 : 0
        const isOwner = ownerAddress && addr === ownerAddress
        return (
          <div
            key={addr + i}
            className="flex items-center justify-between gap-3 bg-pot-card border border-pot-border hover:border-pot-accent/30 rounded-xl p-3 sm:p-4 transition"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="shrink-0 w-10 h-10 rounded-full ring-2 ring-pot-border"
                style={{ background: jdenticonGradient(addr) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => copy(addr)}
                    className="text-white font-mono text-sm hover:text-pot-green transition truncate"
                    title={addr}
                  >
                    {abbreviate(addr)}
                  </button>
                  {copied === addr && (
                    <span className="text-[10px] text-pot-green">copied ✓</span>
                  )}
                  {isOwner && (
                    <span className="px-1.5 py-0.5 rounded-full bg-pot-accent/20 text-pot-accent text-[10px] font-bold uppercase tracking-wide">
                      👑 Creator
                    </span>
                  )}
                  {m.delegateActive && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[10px] font-semibold uppercase tracking-wide">
                      🤖 AI delegate
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-pot-muted mt-0.5 flex items-center gap-2">
                  {m.joinedAt && <span>Joined {new Date(m.joinedAt).toLocaleDateString()}</span>}
                  <a
                    href={`https://explorer.solana.com/address/${addr}${explorerSuffix}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-pot-green transition"
                  >
                    Explorer ↗
                  </a>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-bold tabular-nums text-sm">{shares.toLocaleString()}</p>
              <p className="text-[11px] text-pot-muted tabular-nums">{sharesPct.toFixed(1)}%</p>
              <div className="mt-1 w-20 h-1 bg-pot-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pot-green to-pot-accent"
                  style={{ width: `${Math.min(100, sharesPct)}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
