'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

/**
 * Theme pill slider (58×30). Matches the v3 landing prototype.
 * The knob carries the current-mode emoji (🌙 dark, ☀️ light) — no background
 * emojis to avoid overlap when the knob slides.
 * Stores choice in localStorage under `pot-theme`, falls back to prefers-color-scheme.
 * Applies `data-theme` attribute on <html>.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

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
        className={`theme-slider-knob absolute top-[2px] flex h-[24px] w-[24px] items-center justify-center rounded-full text-[13px] leading-none shadow-[0_2px_8px_rgba(20,241,149,0.35)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          theme === 'light' ? 'left-[calc(100%-26px)]' : 'left-[2px]'
        }`}
        style={{ background: 'linear-gradient(135deg,#14F195 0%,#9945FF 100%)' }}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
