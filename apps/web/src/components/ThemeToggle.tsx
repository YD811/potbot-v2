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

  const light = mounted && isLight
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isLight}
      aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
      title={light ? 'Dark theme' : 'Light theme'}
      className={
        'inline-flex h-9 w-9 items-center justify-center rounded-full border transition ' +
        (isLight
          ? 'border-pot-border bg-white text-gray-900 hover:border-pot-green'
          : 'border-pot-border bg-pot-card text-white hover:border-pot-green')
      }
    >
      {light ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  )
}
