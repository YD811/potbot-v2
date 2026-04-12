import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PotBot — Group Trading Vaults on Solana',
  description:
    'Create shared on-chain vaults, vote on trades, and watch your Tamagotchi grow. Group DeFi made simple.',
  keywords: ['Solana', 'DeFi', 'trading', 'vault', 'DAO', 'governance'],
  authors: [{ name: 'PotBot' }],
  openGraph: {
    title: 'PotBot — Group Trading Vaults on Solana',
    description: 'Create shared on-chain vaults, vote on trades, and watch your Tamagotchi grow.',
    type: 'website',
    url: 'https://potbot.xyz',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PotBot — Group Trading Vaults on Solana',
    description: 'Create shared on-chain vaults, vote on trades, and watch your Tamagotchi grow.',
    images: ['/og-image.png'],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-[#0a0a0f] text-white antialiased">{children}</body>
    </html>
  )
}
