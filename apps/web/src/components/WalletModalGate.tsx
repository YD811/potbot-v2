'use client'

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletModal, WalletModalContext } from '@solana/wallet-adapter-react-ui'

/**
 * Drop-in replacement for WalletModalProvider.
 *
 * A phone browser (Safari, Chrome) has no wallet extension, so the standard
 * modal has nothing to list and dead-ends on "You'll need a wallet". There we
 * show a sheet that reopens the current page inside a wallet app, where the
 * wallet is injected and connects normally. Everywhere else the standard modal
 * is used unchanged, so every existing `useWalletModal().setVisible(true)`
 * call keeps working.
 */

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true
  // iPadOS reports itself as a Mac.
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1
}

type DeepLink = { name: string; hint: string; href: (url: string, ref: string) => string }

// Documented "browse" universal links: open a URL in the wallet's own browser.
const DEEP_LINKS: DeepLink[] = [
  {
    name: 'Phantom',
    hint: 'Opens this page inside Phantom',
    href: (url, ref) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`,
  },
  {
    name: 'Solflare',
    hint: 'Opens this page inside Solflare',
    href: (url, ref) => `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`,
  },
]

function MobileWalletSheet({ onClose, onOther }: { onClose: () => void; onOther?: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window === 'undefined' ? '' : window.location.href
  const ref = typeof window === 'undefined' ? '' : window.location.origin

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="mobile-wallet-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl border border-pot-border bg-pot-card p-6 pb-8 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="mobile-wallet-title" className="text-xl font-semibold text-white">Open in your wallet app</h2>
            <p className="mt-1 text-sm text-pot-muted">
              On a phone, the wallet connects from inside the wallet app. Pick yours and this page opens there.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-pot-border px-3 py-1 text-pot-muted">
            ✕
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {DEEP_LINKS.map((w) => (
            <a
              key={w.name}
              href={w.href(url, ref)}
              className="flex items-center justify-between rounded-2xl border border-pot-border px-4 py-4 transition hover:border-pot-accent"
            >
              <span>
                <span className="block text-base font-semibold text-white">{w.name}</span>
                <span className="block text-xs text-pot-muted">{w.hint}</span>
              </span>
              <span aria-hidden className="text-pot-accent">→</span>
            </a>
          ))}

          <div className="rounded-2xl border border-pot-border px-4 py-4">
            <span className="block text-base font-semibold text-white">Jupiter or another wallet</span>
            <span className="mt-1 block text-xs text-pot-muted">
              These apps have no open-this-page link yet. Copy the link, then paste it in the browser inside your wallet app (in Jupiter: the globe icon, top right).
            </span>
            <button type="button" onClick={copy} className="mt-3 w-full rounded-full border border-pot-accent px-4 py-2 text-sm font-semibold text-pot-accent">
              {copied ? 'Link copied' : 'Copy link'}
            </button>
          </div>
        </div>

        {onOther && (
          <button type="button" onClick={onOther} className="mt-4 w-full text-center text-xs text-pot-muted underline">
            Use a wallet app installed on this phone
          </button>
        )}
      </div>
    </div>
  )
}

export function WalletModalGate({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [forceStandard, setForceStandard] = useState(false)
  const { wallets } = useWallet()

  const hasInstalled = wallets.some((w) => w.readyState === WalletReadyState.Installed)
  // Android only: the Mobile Wallet Adapter can hand off to an installed app.
  // On iOS there is nothing behind the standard list, so the link is hidden.
  const hasLoadable = wallets.some((w) => w.readyState === WalletReadyState.Loadable)
  const useSheet = visible && !forceStandard && !hasInstalled && isMobileBrowser()

  const set = useCallback((open: boolean) => {
    if (!open) setForceStandard(false)
    setVisible(open)
  }, [])

  const value = useMemo(() => ({ visible, setVisible: set }), [visible, set])

  return (
    <WalletModalContext.Provider value={value}>
      {children}
      {visible && (useSheet
        ? <MobileWalletSheet onClose={() => set(false)} onOther={hasLoadable ? () => setForceStandard(true) : undefined} />
        : <WalletModal />)}
    </WalletModalContext.Provider>
  )
}
