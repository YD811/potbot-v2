'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PotGrid } from '@/components/pot/PotGrid'
import { StatsBar } from '@/components/ui/StatsBar'
import { VoiceButton } from '@/components/voice/VoiceButton'
import { CreatePotModal } from '@/components/pot/CreatePotModal'

export default function DashboardPage() {
  const { publicKey, connected } = useWallet()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <>
    <main className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪴</span>
            <span className="font-display font-bold text-lg">PotBot</span>
            <span className="text-xs bg-purple/20 text-purple px-2 py-0.5 rounded-full font-mono">v2</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="/dashboard" className="text-white">Dashboard</a>
            <a href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</a>
            <a href="/pots" className="hover:text-white transition-colors">My POTs</a>
            <a href="/duel" className="hover:text-white transition-colors">Duels</a>
          </nav>
          <div className="flex items-center gap-3">
            <VoiceButton />
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!connected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <div className="text-6xl">🪴</div>
            <h1 className="text-4xl font-display font-bold">
              Welcome to <span className="text-purple">PotBot</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md">
              Create and join collective trading vaults. Govern together, trade together, win together.
            </p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            <StatsBar />
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold">Your POTs</h2>
                <button className="btn-primary text-sm" onClick={() => setShowCreate(true)}>+ Create POT</button>
              </div>
              <PotGrid walletAddress={publicKey!.toBase58()} />
            </div>
          </>
        )}
      </div>
    </main>
    <CreatePotModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  )
}
