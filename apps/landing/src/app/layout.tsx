import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://potbot.fun'),
  title: 'PotBot — Programmable Onchain Treasuries on Solana',
  description:
    'Tokenize any internet community with programmable onchain treasuries and AI coordination on Solana.',
  keywords: ['Solana', 'treasury', 'tokenized communities', 'vault', 'AI governance', 'onchain coordination'],
  authors: [{ name: 'PotBot' }],
  openGraph: {
    title: 'PotBot — Programmable Onchain Treasuries on Solana',
    description: 'Programmable onchain treasuries with AI coordination for tokenized internet communities.',
    type: 'website',
    url: 'https://potbot.fun',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PotBot — Programmable Onchain Treasuries on Solana',
    description: 'Programmable onchain treasuries with AI coordination for tokenized internet communities.',
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
      <body className="bg-[#0D1117] text-white antialiased">{children}</body>
    </html>
  )
}
