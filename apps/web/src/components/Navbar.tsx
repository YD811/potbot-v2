'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { useSolPrice } from '@/lib/prices'
import { healthApi } from '@/lib/api-client'

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

/** Thin bar above the main nav: SOL price + API status */
function LivePriceTicker() {
  const { price: solPrice } = useSolPrice()

  const { data: health, isError: apiDown } = useQuery({
    queryKey: ['api-health'],
    queryFn:  healthApi.check,
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 25_000,
    // Don't show error toasts — this is a background check
  })

  return (
    <div className="border-b border-pot-border/40 bg-pot-dark/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-7 flex items-center gap-4">
        {/* SOL price */}
        {solPrice != null && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-pot-muted">◎</span>
            <span className="font-mono font-semibold text-white">
              ${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-pot-muted">SOL</span>
          </div>
        )}

        <div className="w-px h-3 bg-pot-border" />

        {/* API health */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              apiDown ? 'bg-red-500' : 'bg-pot-green animate-pulse'
            }`}
          />
          <span className={apiDown ? 'text-red-400/80' : 'text-pot-green'}>
            API {apiDown ? 'Offline' : 'Online'}
          </span>
          {health?.version && (
            <span className="text-pot-muted/60">v{health.version}</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[11px] text-pot-muted">
          <Link href="/for-agents" className="hover:text-pot-green transition hidden sm:block">
            🤖 For AI Agents
          </Link>
        </div>
      </div>
    </div>
  )
}

export function Navbar() {
  const { publicKey } = useWallet()

  return (
    <nav className="sticky top-0 z-50 border-b border-pot-border bg-pot-dark/80 backdrop-blur-xl">
      {/* Price ticker sub-bar */}
      <LivePriceTicker />

      {/* Main nav */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:animate-float">🪴</span>
          <span className="text-xl font-bold text-white">
            Pot<span className="text-pot-green">Bot</span>
          </span>
        </Link>

        {/* Center nav */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-gray-400 transition hover:text-white">
            Dashboard
          </Link>
          <Link
            href="/leaderboard"
            className="text-gray-400 transition hover:text-white flex items-center gap-1.5"
          >
            🏆 Leaderboard
          </Link>
          <Link href="/vaults" className="text-gray-400 transition hover:text-white">
            ⚡ Vaults
          </Link>
          <Link href="/create" className="text-gray-400 transition hover:text-white">
            Create POT
          </Link>
          {publicKey && (
            <Link href="/my-pots" className="text-gray-400 transition hover:text-white">
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
