'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { useSolPrice } from '@/lib/prices'
import { healthApi } from '@/lib/api-client'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectButton } from '@/components/ConnectButton'
import { SeasonPrizePoolModal } from '@/components/SeasonPrizePoolModal'
import { useHumanText } from '@/hooks/useHumanText'

function LivePriceTicker() {
  const { price: solPrice } = useSolPrice()
  const [showSeasonModal, setShowSeasonModal] = useState(false)

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
        {/* Season 1 ticker — clickable, opens prize-pool modal */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
          <span className="text-pot-muted">|</span>
          <button
            onClick={() => setShowSeasonModal(true)}
            className="text-pot-accent hover:text-white hover:underline underline-offset-2 transition cursor-pointer"
            aria-label="Open Season 1 prize pool details"
          >
            🌱 Season 1: The Garden
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-pot-muted">
          <Link href="/for-agents" className="hover:text-pot-green transition hidden sm:block">
            🤖 For AI Agents
          </Link>
        </div>
      </div>
      {showSeasonModal && <SeasonPrizePoolModal onClose={() => setShowSeasonModal(false)} />}
    </div>
  )
}

// Static keys; visible labels are computed at render so the human-text
// translator can swap "Vaults" → "POTs" etc. in light mode.
// Home ⇄ Vaults is handled by the pill toggle below. Leaderboard now lives
// as a tab inside /pots. FAQ lives in the footer only.
const NAV_LINKS: { href: string; emoji: string; term: string }[] = [
  { href: '/docs',        emoji: '',     term: 'Docs' },
  { href: '/pricing',     emoji: '',     term: 'Pricing' },
  { href: '/create',      emoji: '+',    term: 'Create' },
  { href: '/name',        emoji: '',     term: 'Get a name' },
]

/** Segmented Home ⇄ Vaults control. Always visible (logged in or not).
 *  Home → landing page "/". Vaults → the /pots dashboard (pot list,
 *  leaderboard, my pots). */
function HomeVaultsToggle({ pathname }: { pathname: string }) {
  // "Vaults" view = the /pots dashboard (and individual pot pages, /vaults).
  const onVaults =
    pathname.startsWith('/pots') ||
    pathname.startsWith('/vaults') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/my-pots') ||
    pathname.startsWith('/dashboard')
  return (
    <div className="flex items-center rounded-lg border border-pot-border bg-pot-card p-0.5 text-sm font-medium">
      <Link
        href="/"
        className={`px-3 py-1 rounded-md transition ${
          !onVaults ? 'bg-pot-green text-pot-dark' : 'text-gray-400 hover:text-white'
        }`}
      >
        Home
      </Link>
      <Link
        href="/pots"
        className={`px-3 py-1 rounded-md transition ${
          onVaults ? 'bg-pot-green text-pot-dark' : 'text-gray-400 hover:text-white'
        }`}
      >
        Vaults
      </Link>
    </div>
  )
}

export function Navbar() {
  const t = useHumanText()
  const { publicKey } = useWallet()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const navLabel = (l: { emoji: string; term: string }) =>
    l.emoji ? `${l.emoji} ${t(l.term)}` : t(l.term)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  // Hide the Waitlist CTA when the user has already connected a wallet —
  // they obviously don't need a waitlist invite anymore, and the extra
  // pill was the main reason the navbar wrapped to two lines on
  // medium-width desktops.
  const showWaitlistCta = !pathname.startsWith('/signup') && !publicKey

  return (
    <nav className="sticky top-0 z-50 border-b border-pot-border bg-pot-dark/80 backdrop-blur-xl">
      <LivePriceTicker />
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-2xl group-hover:animate-float">🪴</span>
          <span className="text-xl font-bold text-white">Pot<span className="text-pot-green">Bot</span></span>
        </Link>

        <div className="hidden sm:flex items-center gap-1 text-sm font-medium">
          {/* Home ⇄ Vaults pill toggle — always visible */}
          <HomeVaultsToggle pathname={pathname} />
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`px-3 py-1.5 rounded-lg transition ${
              isActive(link.href) ? 'text-white bg-pot-card border border-pot-border' : 'text-gray-400 hover:text-white hover:bg-pot-card/50'
            }`}>{navLabel(link)}</Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {showWaitlistCta && (
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-pot-green px-4 py-1.5 text-sm font-bold text-pot-dark shadow-[0_0_18px_rgba(20,241,149,0.35)] hover:brightness-110 transition whitespace-nowrap"
            >
              🚀 Waitlist
            </Link>
          )}

          {/* Wallet button — switches between Privy (light/Normie) and
              wallet-adapter (dark/Crypto) via ConnectButton. */}
          <ConnectButton />
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
          {showWaitlistCta && (
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-pot-green px-4 py-3 text-sm font-bold text-pot-dark shadow-[0_0_18px_rgba(20,241,149,0.35)] hover:brightness-110 transition mb-2"
            >
              🚀 Join the Waitlist
            </Link>
          )}

          <Link href="/" onClick={() => setMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive('/') ? 'text-white bg-pot-card border border-pot-border' : 'text-gray-400 hover:text-white hover:bg-pot-card/50'
            }`}>Home</Link>
          <Link href="/pots" onClick={() => setMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname.startsWith('/pots') || pathname.startsWith('/vaults') || pathname.startsWith('/leaderboard') || pathname.startsWith('/my-pots')
                ? 'text-white bg-pot-card border border-pot-border' : 'text-gray-400 hover:text-white hover:bg-pot-card/50'
            }`}>⚡ Vaults</Link>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive(link.href) ? 'text-white bg-pot-card border border-pot-border' : 'text-gray-400 hover:text-white hover:bg-pot-card/50'
              }`}>{navLabel(link)}</Link>
          ))}
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
