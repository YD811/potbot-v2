import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { AppProviders } from './providers'
import { Navbar } from '@/components/Navbar'
import { OnboardingTutorial } from '@/components/OnboardingTutorial'
import './globals.css'

export const metadata: Metadata = {
  title: 'PotBot — Group Trading Vaults on Solana',
  description: 'Pool funds, vote on swaps, withdraw any time. Trustless group treasury management on Solana.',
  metadataBase: new URL('https://potbot.fun'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'PotBot — Group Trading Vaults on Solana',
    description: 'Pool funds, vote on swaps, withdraw any time. Trustless group treasury management on Solana.',
    url: 'https://potbot.fun',
    siteName: 'PotBot',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PotBot — Group Trading Vaults on Solana',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@PotBot_sol',
    creator: '@PotBot_sol',
    title: 'PotBot — Group Trading Vaults on Solana',
    description: 'Pool funds, vote on swaps, withdraw any time. Trustless group treasury management on Solana.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PotBot',
  },
  icons: {
    apple: '/og-image.png',
  },
}

// Next.js 14 moved viewport + themeColor out of `metadata` into a
// dedicated `viewport` export — anything left in `metadata` triggers
// a runtime warning per route.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0D1117' },
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
  ],
}

// Inline boot script — runs before React hydrates so the page never
// flashes the wrong theme. Reads the new `potbot-theme` key first, then
// falls back to the legacy `pot-theme` key (so existing users keep their
// preference), then to OS preference, then to dark.
const THEME_BOOTSTRAP = `
(function(){
  try {
    var stored = localStorage.getItem('potbot-theme') || localStorage.getItem('pot-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') document.documentElement.classList.add('light-theme');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`.trim()

const FOOTER_LINKS = [
  { label: 'FAQ',         href: '/faq' },
  { label: 'Roadmap',     href: '/roadmap' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Hackathon',   href: '/hackathon' },
  { label: 'For Agents',  href: '/for-agents' },
  { label: 'GitHub',      href: 'https://github.com/YD811/potbot-v2', external: true },
  { label: 'Twitter',     href: 'https://x.com/PotBot_sol', external: true },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-screen bg-pot-dark text-white antialiased flex flex-col">
        <AppProviders>
          <Navbar />

          {/* ── First-time onboarding tutorial ── */}
          <OnboardingTutorial />

          <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
            {children}
          </main>

          {/* ── Footer ─────────────────────────────────────────── */}
          <footer className="border-t border-pot-border/40 bg-pot-dark/80 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Links row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <Link href="/" className="flex items-center gap-2">
                  <span className="text-xl">🪴</span>
                  <span className="font-bold text-white">Pot<span className="text-pot-green">Bot</span></span>
                  <span className="text-xs text-pot-muted">v2 · Solana Frontier 2026</span>
                </Link>
                <nav className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-pot-muted justify-center">
                  {FOOTER_LINKS.map(({ label, href, external }) =>
                    external ? (
                      <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                        className="hover:text-white transition">{label}</a>
                    ) : (
                      <Link key={label} href={href} className="hover:text-white transition">{label}</Link>
                    )
                  )}
                </nav>
              </div>

              {/* Disclaimers */}
              <div className="border-t border-pot-border/30 pt-5 space-y-1.5 text-[11px] text-pot-muted leading-relaxed">
                <p>
                  <span className="font-semibold text-pot-muted/70">Non-custodial:</span>{' '}
                  PotBot is non-custodial software. You retain full custody of your funds via the smart contract.
                </p>
                <p>
                  <span className="font-semibold text-pot-muted/70">Risk:</span>{' '}
                  Crypto assets are volatile. You may lose some or all of the funds you deposit. Past performance does not predict future results.
                </p>
                <p>
                  <span className="font-semibold text-pot-muted/70">Not advice:</span>{' '}
                  PotBot is not investment advice. Members make their own decisions through on-chain voting.
                </p>
                <p>
                  <span className="font-semibold text-pot-muted/70">Jurisdictions:</span>{' '}
                  Use of PotBot is restricted in certain jurisdictions. By using this app you confirm compliance with your local laws.{' '}
                  <Link href="/faq" className="underline hover:text-white">See FAQ</Link>
                </p>
                <p className="pt-1 text-pot-border">
                  © 2026 PotBot · Built on Solana · Open source ·{' '}
                  <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    View code
                  </a>
                </p>
              </div>
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  )
}
