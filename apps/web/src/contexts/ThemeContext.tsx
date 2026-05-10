'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  isLight: boolean
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const STORAGE_KEY = 'potbot-theme'
const LEGACY_STORAGE_KEY = 'pot-theme'

function applyThemeToDocument(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  if (theme === 'light') root.classList.add('light-theme')
  else root.classList.remove('light-theme')
}

/**
 * ThemeProvider — single source of truth for the active color/copy theme.
 *
 * - Persists to localStorage under `potbot-theme`. Reads the legacy
 *   `pot-theme` key as a one-time migration so users with the older
 *   ThemeToggle don't lose their preference.
 * - Mirrors state to `<html data-theme>` (used by globals.css overrides)
 *   AND adds a `light-theme` class on <html> when light is active.
 * - The bootstrap script in app/layout.tsx sets `data-theme` before React
 *   hydrates so we never flash the wrong theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial render: server renders dark by default; first effect syncs to
  // whatever the bootstrap script wrote on <html>.
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const fromHtml = (document.documentElement.getAttribute('data-theme') as Theme | null)
    let initial: Theme = fromHtml === 'light' ? 'light' : 'dark'
    try {
      const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') initial = stored
    } catch {}
    setThemeState(initial)
    applyThemeToDocument(initial)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyThemeToDocument(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
      // Also write legacy key so any older code that still reads it stays
      // in sync. Cheap belt-and-braces — safe to remove later.
      localStorage.setItem(LEGACY_STORAGE_KEY, next)
    } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isLight: theme === 'light', toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx) return ctx
  // Fallback used during SSR or if a component renders outside the
  // provider tree (shouldn't happen in practice, but keeps tests and
  // isolated stories safe).
  return {
    theme: 'dark',
    isLight: false,
    toggleTheme: () => {},
    setTheme: () => {},
  }
}
