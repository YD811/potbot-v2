'use client'

import { useState } from 'react'

/**
 * SponsorRail — slim horizontal rail of sponsor / integration chips.
 *
 * Lifts the killer claim ("real Jupiter v6 CPI from a vault PDA") above the
 * fold for hackathon judges. No "Powered by" label, no indicator dots —
 * just emoji + name + sub-line. Compact (py-1.5).
 *
 * Sources of truth:
 * - Jupiter CPI happens in pot_vault::execute_swap. Any swap proposal that
 *   resolved to executed has an Explorer tx — we point to the most recent.
 * - Helius RPC is wired in apps/web/src/lib/rpc.ts via NEXT_PUBLIC_HELIUS_RPC.
 * - Squads is conditional — only shown if creator is a multisig vault.
 * - Solana Blink — copies the Action URL to clipboard.
 * - MCP — links to the npm package.
 */

interface Props {
  potPubkey: string
  /** Last execute_swap tx signature, if any */
  lastSwapTx?: string
  /** True when creator authority is a Squads v4 multisig vault PDA */
  squadsManaged?: boolean
  /** Cluster — controls the Explorer link suffix */
  cluster?: 'mainnet-beta' | 'devnet'
}

export function SponsorRail({
  potPubkey,
  lastSwapTx,
  squadsManaged,
  cluster = 'devnet',
}: Props) {
  const [copied, setCopied] = useState(false)

  const explorerSuffix = cluster === 'mainnet-beta' ? '' : '?cluster=devnet'

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://potbot.fun')

  const blinkUrl = `${appUrl}/api/actions/${potPubkey}/deposit`

  const copyBlink = () => {
    navigator.clipboard.writeText(blinkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="border-b border-pot-border/50 bg-pot-card/20">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip
            href={
              lastSwapTx
                ? `https://explorer.solana.com/tx/${lastSwapTx}${explorerSuffix}`
                : 'https://docs.jup.ag/'
            }
            color="green"
            title={
              lastSwapTx
                ? 'View last on-chain swap on Solana Explorer'
                : 'Jupiter v6 CPI — pot_vault::execute_swap'
            }
            label="🪐 Jupiter"
          />
          <Chip
            href="https://www.helius.dev/"
            color="amber"
            title="Helius RPC + webhooks"
            label="⚡ Helius"
          />
          {squadsManaged && (
            <Chip
              href={`https://app.squads.so/squads/${potPubkey}`}
              color="blue"
              title="This pot is owned by a Squads v4 multisig"
              label="🛡 Squads"
            />
          )}
          <Chip
            href="https://docs.dialect.to/documentation/actions/blinks"
            color="green"
            title="Solana Actions endpoint"
            label="⚡ Blinks"
          />
          <button
            type="button"
            onClick={copyBlink}
            title="Copy this pot's Blink URL"
            className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border border-pot-border bg-pot-card hover:border-pot-green/50 text-[11px] text-pot-muted hover:text-white transition"
          >
            {copied ? '✓ copied' : '🔗 Copy Blink'}
          </button>
          <Chip
            href="https://www.npmjs.com/package/@potbot/mcp"
            color="purple"
            title="@potbot/mcp on npm"
            label="🤖 MCP"
          />
          <Chip
            href={`https://explorer.solana.com/address/${potPubkey}${explorerSuffix}`}
            color="muted"
            title="Verify this pot on Solana Explorer"
            label="🔍 Explorer"
          />
        </div>
      </div>
    </div>
  )
}

function Chip({
  href,
  color,
  title,
  label,
}: {
  href: string
  color: 'green' | 'amber' | 'blue' | 'purple' | 'muted'
  title: string
  label: string
}) {
  const palette: Record<typeof color, { border: string; text: string; hover: string }> = {
    green:  { border: 'border-pot-green/25',  text: 'text-pot-green',  hover: 'hover:border-pot-green/60' },
    amber:  { border: 'border-amber-500/25',  text: 'text-amber-300',  hover: 'hover:border-amber-500/60' },
    blue:   { border: 'border-blue-500/25',   text: 'text-blue-300',   hover: 'hover:border-blue-500/60' },
    purple: { border: 'border-pot-accent/25', text: 'text-pot-accent', hover: 'hover:border-pot-accent/60' },
    muted:  { border: 'border-pot-border',    text: 'text-pot-muted',  hover: 'hover:border-pot-muted/60' },
  }
  const c = palette[color]
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border ${c.border} ${c.hover} ${c.text} text-[11px] font-medium transition whitespace-nowrap`}
    >
      {label}
    </a>
  )
}
