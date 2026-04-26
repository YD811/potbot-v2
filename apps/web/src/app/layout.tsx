import type { Metadata } from 'next'
import { AppProviders } from './providers'
import { Navbar } from '@/components/Navbar'
import { PrivyProviders } from '@/components/PrivyProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'PotBot v2 — Group Trading Vaults on Solana',
  description: 'Create group trading vaults, govern together, trade together, win together.',
  metadataBase: new URL('https://potbot.fun'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PotBot v2 — Group Trading Vaults on Solana',
    description: 'Create group trading vaults, govern together, trade together, win together.',
    url: 'https://potbot.fun',
    siteName: 'PotBot',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PotBot v2 — Group Trading Vaults on Solana',
    description: 'Create group trading vaults, govern together, trade together, win together.',
  },
}

// Runs before React hydrates — prevents light/dark flash on first paint.
const THEME_BOOTSTRAP = `
(function(){
  try {
    var stored = localStorage.getItem('pot-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`.trim()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-screen bg-pot-dark text-white antialiased">
        <PrivyProviders>
          <AppProviders>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </AppProviders>
        </PrivyProviders>
      </body>
    </html>
  )
}
