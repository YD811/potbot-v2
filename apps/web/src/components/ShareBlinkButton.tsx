'use client'

import { useState } from 'react'

interface Props {
  potPubkey: string
  proposalId?: number | string
  /** kind of Blink to share */
  kind?: 'deposit' | 'vote'
  className?: string
}

/**
 * Renders a "Share as Blink" button. Copies a Twitter intent URL pre-filled
 * with the pot's Solana Action endpoint — Twitter renders it as an interactive
 * Blink card so anyone can deposit / vote without leaving X.
 *
 * Spec: https://docs.dialect.to/documentation/actions/blinks
 */
export function ShareBlinkButton({
  potPubkey,
  proposalId,
  kind = 'deposit',
  className = '',
}: Props) {
  const [copied, setCopied] = useState(false)

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://potbot.fun')

  const actionUrl =
    kind === 'vote'
      ? `${appUrl}/api/actions/${potPubkey}/vote?proposalId=${proposalId ?? 'latest'}`
      : `${appUrl}/api/actions/${potPubkey}/deposit`

  const tweetText =
    kind === 'vote'
      ? `Vote on PotBot proposal — straight from this tweet 🪴`
      : `Join this PotBot pot — deposit and pool funds with the group 🪴`

  const tweetIntent = `https://x.com/intent/tweet?text=${encodeURIComponent(
    `${tweetText}\n\n${actionUrl}`
  )}`

  function copyLink() {
    navigator.clipboard.writeText(actionUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href={tweetIntent}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pot-border bg-pot-card hover:border-pot-green/50 text-xs text-white transition"
      >
        <span>⚡</span>
        Share as Blink on X
      </a>
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pot-border bg-pot-card hover:border-pot-accent/50 text-xs text-pot-muted hover:text-white transition"
        title="Copy Action URL"
      >
        {copied ? '✓ Copied' : '📋 Copy URL'}
      </button>
    </div>
  )
}
