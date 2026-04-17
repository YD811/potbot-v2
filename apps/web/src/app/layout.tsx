import type { Metadata } from 'next'
import { AppProviders } from './providers'
import { Navbar } from '@/components/Navbar'
import { DemoModeBanner } from '@/components/DemoModeBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'PotBot v2 — Group Trading Vaults on Solana',
  description: 'Create group trading vaults, govern together, trade together, win together.',
  openGraph: {
    title: 'PotBot v2',
    description: 'Group trading vaults on Solana — govern together, trade together, win together.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-pot-dark text-white antialiased">
        <AppProviders>
          <Navbar />
          <DemoModeBanner />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  )
}
