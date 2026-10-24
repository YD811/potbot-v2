'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'potbot-devnet-preview-v1' // new key so everyone sees the new text once

/**
 * First-visit hint on the POTFolio pages. Replaces the former full-screen
 * three-step modal (design v3): one dismissible line above the content.
 * Same storage key, so people who dismissed the modal never see the hint.
 */
export function OnboardingTutorial({ forceShow = false }: { forceShow?: boolean }) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!pathname?.startsWith('/portfolios')) { setVisible(false); return }
    if (forceShow) { setVisible(true); return }
    try {
      setVisible(!localStorage.getItem(STORAGE_KEY))
    } catch {
      setVisible(false)
    }
  }, [pathname, forceShow])

  if (!visible) return null

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  return (
    <div className="border-b border-pot-border bg-pot-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-[13px] text-pot-muted sm:px-6 lg:px-8">
        <span>
          <span className="font-semibold text-white">Devnet preview.</span> Everything you see runs on Solana devnet with test tokens. Mainnet opens after the external audit.
        </span>
        <Link href="/learn" className="underline underline-offset-2 hover:text-white">How it works</Link>
        <Link href="/status" className="underline underline-offset-2 hover:text-white">Status</Link>
        <button type="button" onClick={dismiss} className="ml-auto rounded-full border border-pot-border px-3 py-1 text-xs font-medium text-white hover:border-pot-muted" aria-label="Dismiss">
          Got it
        </button>
      </div>
    </div>
  )
}
