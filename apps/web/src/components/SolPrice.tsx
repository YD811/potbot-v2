'use client'

import { useSolPrice } from '@/lib/prices'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  /** Optional — pass either lamports or sol. Lamports take precedence if both are set. */
  lamports?: number
  /** SOL amount. Required unless lamports is set. */
  sol?: number
  /** Override the auto-fetched SOL price (USD). Useful for SSR or test cases. */
  solPriceUsd?: number
  /** Hide the small SOL line under the dollar amount in light mode. */
  compact?: boolean
  className?: string
}

/**
 * Display a SOL amount.
 *
 *   Dark mode (Crypto):  `0.4231 SOL` — single line, monospace tabular.
 *   Light mode (Normie): `$65.42`     — dollar amount primary
 *                        `0.4231 SOL` — small grey line below
 *
 * Pulls live USD price from Jupiter via `useSolPrice()` unless an
 * override is passed. If price isn't ready yet in light mode we fall
 * back to the SOL line so the slot never collapses.
 */
export function SolPrice({ lamports, sol, solPriceUsd, compact = false, className = '' }: Props) {
  const { isLight } = useTheme()
  const { price: livePrice } = useSolPrice()
  const usdPrice = solPriceUsd ?? livePrice ?? 0

  const solValue = (() => {
    if (typeof lamports === 'number') return lamports / 1e9
    if (typeof sol === 'number') return sol
    return 0
  })()

  const usdValue = solValue * usdPrice
  const solLabel = `${solValue.toFixed(4)} SOL`
  const usdLabel = usdValue >= 1000
    ? `$${usdValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${usdValue.toFixed(2)}`

  if (isLight && usdPrice > 0) {
    return (
      <span className={`inline-flex items-baseline gap-1.5 tabular-nums ${className}`}>
        <span className="font-bold">{usdLabel}</span>
        {!compact && <span className="text-sm text-gray-400">{solLabel}</span>}
      </span>
    )
  }

  return <span className={`tabular-nums ${className}`}>{solLabel}</span>
}
