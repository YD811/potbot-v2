'use client'

import Link from 'next/link'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { PrivyLoginButton } from '@/components/PrivyLoginButton'
import { useActiveWallet } from '@/hooks/useActiveWallet'

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID

// Wallet-adapter button is a client-only ESM bundle — defer it.
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

/**
 * Single connect button for the navbar.
 *
 *   1. If anything is connected (wallet-adapter OR Privy), show a
 *      neutral pill with the active label and a disconnect option.
 *      Theme switches no longer drop the connection — both providers
 *      stay mounted, and this button reflects whichever has a session.
 *   2. If nothing is connected:
 *      - light + Privy configured → Privy login button
 *      - everything else        → wallet-adapter button (Phantom/Solflare)
 */
export function ConnectButton() {
  const { isLight } = useTheme()
  const wallet = useActiveWallet()
  const [open, setOpen] = useState(false)

  if (wallet.isConnected) {
    const accentClass = isLight
      ? 'border-pot-border bg-pot-card text-white hover:border-pot-muted'
      : 'border-pot-border bg-pot-card text-white hover:border-pot-muted'
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${accentClass}`}
          aria-haspopup="menu"
          aria-expanded={open}
          title={wallet.label}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-pot-green' : 'bg-pot-green'} animate-pulse`} />
          <span className="max-w-[140px] truncate">{wallet.label}</span>
          <span className="text-xs text-pot-muted">▾</span>
        </button>

        {open && (
          <>
            {/* Click-out shield */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              role="menu"
              className={
                'absolute right-0 mt-2 z-50 w-60 rounded-xl border shadow-2xl p-2 ' +
                (isLight
                  ? 'border-pot-border bg-pot-card text-white'
                  : 'border-pot-border bg-pot-card text-white')
              }
            >
              <div className="px-3 py-2 border-b border-pot-border/40 mb-1">
                <div className="text-[10px] uppercase tracking-wider text-pot-muted font-bold">
                  {wallet.source === 'privy' ? 'Email account' : 'Wallet'}
                </div>
                <div className="text-xs font-mono break-all">
                  {wallet.address ?? wallet.label}
                </div>
              </div>
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm rounded-lg hover:bg-pot-border/30 transition"
              >
                {isLight ? 'My account' : 'My Dashboard'}
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setOpen(false)
                  await wallet.disconnect()
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-pot-accent/10 hover:text-pot-accent transition"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Not connected — pick the connect surface for the current theme.
  if (isLight && HAS_PRIVY) return <PrivyLoginButton />
  return <WalletMultiButtonDynamic />
}
