'use client'

import { useState } from 'react'

/**
 * SponsorRail — horizontal rail of sponsor / integration chips on /pots/[pubkey].
 *
 * Lifts the killer claim ("real Jupiter v6 CPI from a vault PDA") above the
 * fold for hackathon judges. Each chip = (a) name, (b) what it does in this
 * pot, (c) link to verifiable proof. Mobile: horizontal scroll, no clipping.
 *
 * Sources of truth:
 * - Jupiter CPI happens in pot_vault::execute_swap. Any swap proposal that
 *   resolved to executed has an Explorer tx — we point to the most recent.
 * - Helius RPC is wired in apps/web/src/lib/rpc.ts via NEXT_PUBLIC_HELIUS_RPC.
 * - Squads is conditional — only shown if creator is a multisig vault.
 * - Solana Blink — opens an X intent pre-filled with the deposit Action URL.
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
    <div className="border-b border-pot-border bg-pot-card/30">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[10px] uppercase tracking-wider text-pot-muted shrink-0 mr-1">
            Powered by
          </span>

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
            label="🪐 Jupiter v6"
            sub={lastSwapTx ? 'last tx ↗' : 'CPI'}
          />

          <Chip
            href="https://www.helius.dev/"
            color="amber"
            title="Helius RPC + webhooks"
            label="⚡ Helius"
            sub="RPC"
          />

          {squadsManaged && (
            <Chip
              href={`https://app.squads.so/squads/${potPubkey}`}
              color="blue"
              title="This pot is owned by a Squads v4 multisig"
              label="🛡 Squads v4"
              sub="multisig"
            />
          )}

          <Chip
            href="https://docs.dialect.to/documentation/actions/blinks"
            color="green"
            title="Solana Actions endpoint — vote / deposit straight from a tweet"
            label="⚡ Blinks"
            sub="actions"
          />

          <button
            type="button"
            onClick={copyBlink}
            title="Copy this pot's Blink URL"
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-pot-border bg-pot-card hover:border-pot-green/50 text-[11px] text-white transition"
          >
            🔗 {copied ? 'Copied!' : 'Copy Blink URL'}
          </button>

          <Chip
            href="https://www.npmjs.com/package/@potbot/mcp"
            color="purple"
            title="@potbot/mcp on npm — Claude/GPT can manage this pot"
            label="🤖 MCP"
            sub="agent api"
          />

          <Chip
            href={`https://explorer.solana.com/address/${potPubkey}${explorerSuffix}`}
            color="muted"
            title="Verify this pot on Solana Explorer"
            label="🔍 Explorer"
            sub="verify"
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
  sub,
}: {
  href: string
  color: 'green' | 'amber' | 'blue' | 'purple' | 'muted'
  title: string
  label: string
  sub?: string
}) {
  const palette: Record<typeof color, { border: string; text: string; bg: string; hover: string }> = {
    green:  { border: 'border-pot-green/30',  text: 'text-pot-green',  bg: 'bg-pot-green/5',  hover: 'hover:border-pot-green/60' },
    amber:  { border: 'border-amber-500/30',  text: 'text-amber-300',  bg: 'bg-amber-500/5',  hover: 'hover:border-amber-500/60' },
    blue:   { border: 'border-blue-500/30',   text: 'text-blue-300',   bg: 'bg-blue-500/5',   hover: 'hover:border-blue-500/60' },
    purple: { border: 'border-pot-accent/30', text: 'text-pot-accent', bg: 'bg-pot-accent/5', hover: 'hover:border-pot-accent/60' },
    muted:  { border: 'border-pot-border',    text: 'text-pot-muted',  bg: 'bg-pot-card',     hover: 'hover:border-pot-muted/60' },
  }
  const c = palette[color]
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${c.border} ${c.bg} ${c.hover} ${c.text} text-[11px] font-semibold transition whitespace-nowrap`}
    >
      <span>{label}</span>
      {sub && <span className="opacity-60 text-[10px] font-medium">· {sub}</span>}
    </a>
  )
}
