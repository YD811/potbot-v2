'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { useSolPrice } from '@/lib/prices'
import { healthApi } from '@/lib/api-client'
import { ThemeToggle } from '@/components/ThemeToggle'

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

function LivePriceTicker() {
  const { price: solPrice } = useSolPrice()

  const { data: health, isError: apiDown } = useQuery({
    queryKey: ['api-health'],
    queryFn:  healthApi.check,
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 25_000,
  })

  return (
    <div className="border-b border-pot-border/40 bg-pot-dark/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-7 flex items-center gap-4">
        {solPrice != null && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-pot-muted">◎</span>
            <span className="font-mono font-semibold text-white">
              ${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-pot-muted">SOL</span>
          </div>
        )}
        <div className="w-px h-3 bg-pot-border" />
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${apiDown ? 'bg-red-500' : 'bg-pot-green animate-pulse'}`} />
          <span className={apiDown ? 'text-red-400/80' : 'text-pot-green'}>
            {apiDown ? 'Demo Mode' : 'Live'}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-pot-muted">
          <Link href="/for-agents" className="hover:text-pot-green transition hidden sm:block">
            🤖 For AI Agents
          </Link>
        </div>
      </div>
    </div>
  )
}

const NAV_LINKS = [
  { href: '/',            label: 'Dashboard' },
  { href: '/leaderboard', label: '🏆 Leaderboard' },
  { href: '/vaults',      label: '⚡ Vaults' },
  { href: '/create',      label: '+ Create' },
]

export function Navbar() {
  const { publicKey } = useWallet()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  // Hide the Waitlist CTA on the signup page itself — no point linking to where we are.
  const showWaitlistCta = !pathname.startsWith('/signup')

  return (
    <nav className="sticky top-0 z-50 border-b border-pot-border bg-pot-dark/80 backdrop-blur-xl">
      <LivePriceTicker />
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-2xl group-hover:animate-float">🪴</span>
          <span className="text-xl font-bold text-white">Pot<span className="text-pot-green">Bot</span></span>
        </Link>

        <div className="hidden sm:flex items-center gap-1 text-sm font-medium">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={`px-3 py-1.5 rounded-lg transition ${
              isActive(href) ? 'text-white bg-pot-card border border-pot-border' : 'text-gray-400 hover:text-white hover:bg-pot-card/50'
            }`}>{label}</Link>
          ))}
          {publicKey && (
            <Link href="/my-pots" className={`px-3 py-1.5 rounded-lg transition ${
              isActive('/my-pots') ? 'text-pot-accent bg-pot-accent/10 border border-pot-accent/30' : 'text-gray-400 hover:text-white hover:bg-pot-card/50'
            }`}>My POTs</Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Theme slider (dark ↔ light) */}
          <ThemeToggle />

          {/* Waitlist / Early-Access CTA — visible on every page */}
          {showWaitlistCta && (
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-pot-green px-4 py-1.5 text-sm font-bold text-pot-dark shadow-[0_0_18px_rgba(20,241,149,0.35)] hover:brightness-110 transition whitespace-nowrap"
            >
              🚀 Waitlist
            </Link>
          )}

          {publicKey && (
            <span className="hidden md:block rounded-lg bg-pot-card px-3 py-1.5 text-xs font-mono text-pot-muted">
              {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
            </span>
          )}
          <WalletMultiButtonDynamic />
          <button onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden ml-1 p-2 rounded-lg text-pot-muted hover:text-white hover:bg-pot-card transition" aria-label="Toggle menu">
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-pot-border bg-pot-dark/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {/* Mobile Waitlist CTA — top of the drawer so it's impossible to miss */}
          {showWaitlistCta && (
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-pot-green px-4 py-3 text-sm font-bold text-pot-dark shadow-[0_0_18px_rgba(20,241,149,0.35)] hover:brightness-110 transition mb-2"
            >
              🚀 Join the Waitlist
            </Link>
          )}

          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive(href) ? 'text-white bg-pot-card border border-pot-border' : 'text-gray-400 hover:text-white hover:bg-pot-card/50'
              }`}>{label}</Link>
          ))}
          {publicKey && (
            <Link href="/my-pots" onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive('/my-pots') ? 'text-pot-accent bg-pot-accent/10 border border-pot-accent/30' : 'text-gray-400 hover:text-white hover:bg-pot-card/50'
              }`}>My POTs</Link>
          )}
          <div className="pt-2 border-t border-pot-border/50">
            <Link href="/for-agents" onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-pot-muted hover:text-pot-green transition">
              🤖 For AI Agents
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
