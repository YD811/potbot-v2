import type { Metadata } from 'next'
import { AppProviders } from './providers'
import { Navbar } from '@/components/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'PotBot v2 — Group Trading Vaults on Solana',
  description: 'Create group trading vaults, govern together, trade together, win together.',
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
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  )
}
