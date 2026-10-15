'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useSolPrice } from '@/lib/prices'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectButton } from '@/components/ConnectButton'
import { SeasonPrizePoolModal } from '@/components/SeasonPrizePoolModal'
import { useHumanText } from '@/hooks/useHumanText'

function LivePriceTicker() {
  const { price: solPrice } = useSolPrice()
  const [showSeasonModal, setShowSeasonModal] = useState(false)

  return (
    <div className="border-b border-pot-border/60 bg-pot-dark/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-7 flex items-center gap-4">
        {solPrice != null && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-pot-muted">◎</span>
            <span className="font-mono font-medium tabular-nums text-white">
              ${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-pot-muted">SOL</span>
          </div>
        )}
        {/* Season 1 ticker — clickable, opens prize-pool modal */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
          <span className="w-px h-3 bg-pot-border" />
          <button
            onClick={() => setShowSeasonModal(true)}
            className="text-pot-muted hover:text-white hover:underline underline-offset-2 transition cursor-pointer"
            aria-label="Open Season 1 prize pool details"
          >
            Season 1: The Garden
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-pot-muted">
          <Link href="/for-agents" className="hover:text-white transition hidden sm:block">
            For AI agents
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
const NAV_LINKS: { href: string; emoji: string; term: string; hot?: boolean }[] = [
  { href: '/portfolios',  emoji: '',     term: 'POTFolios' },
  { href: '/portfolios/new', emoji: '', term: 'Create' },
  { href: '/learn',       emoji: '',     term: 'Learn' },
  { href: '/worldsfair',  emoji: '',     term: "World's Fair", hot: true },
]

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
          <Image src="/garden/pink-1.webp" alt="" width={28} height={28} className="h-7 w-7 object-contain" priority />
          <span className="font-display text-[22px] font-semibold tracking-tight text-white">PotBot</span>
        </Link>

        <div className="hidden sm:flex items-center gap-1 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`px-3.5 py-1.5 rounded-full transition ${
              isActive(link.href) ? 'text-white bg-pot-card border border-pot-border' : 'text-pot-muted hover:text-white'
            }`}>{link.hot && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pot-green align-middle" />}{navLabel(link)}</Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {showWaitlistCta && (
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-pot-border px-4 py-1.5 text-sm font-semibold text-white hover:border-pot-muted transition whitespace-nowrap"
            >
              Waitlist
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
              className="flex items-center justify-center gap-1.5 rounded-full bg-pot-accent px-4 py-3 text-sm font-semibold text-pot-dark hover:brightness-110 transition mb-2"
            >
              Join the waitlist
            </Link>
          )}

          <Link href="/" onClick={() => setMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive('/') ? 'text-white bg-pot-card border border-pot-border' : 'text-pot-muted hover:text-white hover:bg-pot-card/50'
            }`}>Home</Link>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive(link.href) ? 'text-white bg-pot-card border border-pot-border' : 'text-pot-muted hover:text-white hover:bg-pot-card/50'
              }`}>{navLabel(link)}</Link>
          ))}
          <div className="pt-2 border-t border-pot-border/50 grid grid-cols-2 gap-x-2">
            {[['/faq', 'FAQ'], ['/mainnet', 'Security'], ['/roadmap', 'Roadmap']].map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-pot-muted hover:text-white transition">{label}</Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
