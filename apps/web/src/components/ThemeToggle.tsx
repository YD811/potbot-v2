'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

/**
 * Top-navbar theme switch. Click to flip the entire app between
 *   - 🌑 Crypto mode (dark, default — full DeFi terminology)
 *   - ☀️ Normie mode (light theme + plain-English labels + USD-first prices)
 *
 * The button shows the *current* mode. Theme is persisted to localStorage
 * via ThemeContext.
 */
export function ThemeToggle() {
  const { isLight, toggleTheme } = useTheme()
  // Avoid mismatched-server/client text by deferring the label until after
  // hydration. The button still works on first paint.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const label = !mounted
    ? '🌑 Crypto mode'
    : isLight
      ? '☀️ Normie mode'
      : '🌑 Crypto mode'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isLight}
      aria-label={mounted && isLight ? 'Switch to Crypto mode (dark theme)' : 'Switch to Normie mode (light theme)'}
      title={mounted && isLight ? 'Switch to Crypto mode' : 'Switch to Normie mode'}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ' +
        (isLight
          ? 'border-pot-border bg-white text-gray-900 hover:border-pot-green'
          : 'border-pot-border bg-pot-card text-white hover:border-pot-green')
      }
    >
      {label}
    </button>
  )
}
