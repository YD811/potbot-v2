'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

/**
 * Theme pill slider (58×30). Matches the v3 landing prototype.
 * Stores choice in localStorage under `pot-theme`, falls back to prefers-color-scheme.
 * Applies `data-theme` attribute on <html>.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Sync from DOM on mount (the pre-hydration script in layout.tsx already set it)
  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme) || 'dark'
    setTheme(current)
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('pot-theme', next)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
      className="theme-slider relative h-[30px] w-[58px] shrink-0 rounded-full border border-pot-border bg-pot-card transition hover:border-pot-green"
    >
      <span
        className={`theme-slider-knob absolute top-[2px] flex h-[24px] w-[24px] items-center justify-center rounded-full text-[13px] shadow-[0_2px_8px_rgba(20,241,149,0.35)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          theme === 'light' ? 'left-[calc(100%-26px)]' : 'left-[2px]'
        }`}
        style={{ background: 'linear-gradient(135deg,#14F195 0%,#9945FF 100%)' }}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-[8px] text-[11px] text-pot-muted">
        <span aria-hidden>☀️</span>
        <span aria-hidden>🌙</span>
      </span>
    </button>
  )
}
