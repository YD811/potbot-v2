import type { Metadata, Viewport } from 'next'
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import { AppProviders } from './providers'
import { Navbar } from '@/components/Navbar'
import { BrandWordmark } from '@/components/Brand'
import { OnboardingTutorial } from '@/components/OnboardingTutorial'
import './globals.css'

const fontDisplay = Fraunces({ subsets: ['latin'], weight: ['500', '600'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' })
const fontSans = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' })
const fontMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'PotBot POTFolio: any basket of Solana assets as one liquid token', template: '%s · PotBot' },
  description: 'Creator ETFs without the exit liquidity. Put up to 5 assets in a Pot, hold one token, leave any time. Nobody can reach anyone else\'s money.',
  metadataBase: new URL('https://potbot.fun'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'PotBot POTFolio: any basket of Solana assets as one liquid token',
    description: 'Creator ETFs without the exit liquidity. Up to 5 assets in a Pot, one token, exit any time.',
    url: 'https://potbot.fun',
    siteName: 'PotBot',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@PotBot_sol',
    creator: '@CryptoYDao',
    title: 'PotBot POTFolio: any basket of Solana assets as one liquid token',
    description: 'Creator ETFs without the exit liquidity. Up to 5 assets in a Pot, one token, exit any time.',
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'PotBot' },
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
    { media: '(prefers-color-scheme: dark)',  color: '#14120F' },
    { media: '(prefers-color-scheme: light)', color: '#F6F1E8' },
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

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'POTFolios', href: '/portfolios' },
      { label: 'Create a POTFolio', href: '/portfolios/new' },
      { label: 'How it works', href: '/learn' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'Security', href: '/mainnet' },
      { label: 'Status', href: '/status' },
      { label: "World's Fair", href: '/worldsfair' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'GitHub', href: 'https://github.com/YD811/potbot-v2', external: true },
      { label: 'Docs', href: '/docs' },
      { label: 'X', href: 'https://x.com/PotBot_sol', external: true },
      { label: 'Y-DAO Amsterdam', href: 'https://y-dao.com', external: true },
      { label: 'Waitlist', href: '/signup' },
    ],
  },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
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
              <div className="grid gap-8 mb-8 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                  <Link href="/" className="inline-flex items-center" aria-label="PotBot home">
                    <BrandWordmark height={22} />
                  </Link>
                  <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-pot-muted">
                    Your portfolio. One token. Built in Amsterdam on Solana.
                  </p>
                </div>
                {FOOTER_COLUMNS.map((col) => (
                  <nav key={col.title} aria-label={col.title}>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-pot-muted">{col.title}</p>
                    <ul className="space-y-1.5 text-[13px] text-pot-muted">
                      {col.links.map(({ label, href, external }) => (
                        <li key={label}>
                          {external ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">{label}</a>
                          ) : (
                            <Link href={href} className="hover:text-white transition">{label}</Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
              </div>

              {/* Disclaimers */}
              <div className="border-t border-pot-border/30 pt-5 space-y-1.5 text-[12px] text-pot-muted leading-relaxed">
                <p>
                  <span className="font-semibold text-white">Non-custodial:</span>{' '}
                  PotBot is non-custodial software. Assets sit in program-owned accounts with no withdraw instruction; the index token is the only claim on them.
                </p>
                <p>
                  <span className="font-semibold text-white">Risk:</span>{' '}
                  Crypto assets are volatile. You may lose some or all of the funds you deposit. Past performance does not predict future results.
                </p>
                <p>
                  <span className="font-semibold text-white">Not advice:</span>{' '}
                  PotBot is not investment advice. Holders make their own decisions; nothing here is a recommendation to buy or sell any asset.
                </p>
                <p>
                  <span className="font-semibold text-white">Jurisdictions:</span>{' '}
                  Use of PotBot is restricted in certain jurisdictions. By using this app you confirm compliance with your local laws.{' '}
                  <Link href="/faq" className="underline hover:text-white">See FAQ</Link>
                </p>
                <p className="pt-1 text-pot-muted/70">
                  © 2026 PotBot · Amsterdam · Built on Solana · Open source ·{' '}
                  <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    View code
                  </a>
                </p>
              </div>
            </div>
          </footer>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  )
}
