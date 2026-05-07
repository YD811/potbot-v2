import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://potbot.fun'),
  title: 'PotBot v2 — Featured Y-DAO Project',
  description:
    'The first Telegram-native group treasury protocol on Solana where AI proposes, members vote, and code executes on-chain.',
  keywords: ['Solana', 'DeFi', 'Telegram', 'AI agent', 'MCP', 'vault', 'DAO', 'governance'],
  authors: [{ name: 'PotBot' }],
  openGraph: {
    title: 'PotBot v2 — Featured Y-DAO Project',
    description: 'AI proposes. Members vote. Anchor executes. PotBot v2 is a featured Y-DAO project for group treasuries on Solana.',
    type: 'website',
    url: 'https://potbot.fun',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PotBot v2 — Featured Y-DAO Project',
    description: 'AI proposes. Members vote. Anchor executes. PotBot v2 is a featured Y-DAO project for group treasuries on Solana.',
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
