'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'

// Dynamically import to avoid SSR issues with wallet adapter
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

export function Navbar() {
  const { publicKey } = useWallet()

  return (
    <nav className="sticky top-0 z-50 border-b border-pot-border bg-pot-dark/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:animate-float">\ud83e\udeb4</span>
          <span className="text-xl font-bold text-white">
            Pot<span className="text-pot-green">Bot</span>
          </span>
        </Link>

        {/* Center nav */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="text-gray-400 transition hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/create"
            className="text-gray-400 transition hover:text-white"
          >
            Create POT
          </Link>
          {publicKey && (
            <Link
              href="/my-pots"
              className="text-gray-400 transition hover:text-white"
            >
              My POTs
            </Link>
          )}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {publicKey && (
            <span className="hidden md:block rounded-lg bg-pot-card px-3 py-1.5 text-xs font-mono text-pot-muted">
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </span>
          )}
          <WalletMultiButtonDynamic />
        </div>
      </div>
    </nav>
  )
}
