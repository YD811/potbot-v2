'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { VoiceButton } from '@/components/voice/VoiceButton'

// Mock data for now, hook into usePots() later
const MOCK_LEADERBOARD = [
  { rank: 1, pubkey: 'abc123', name: 'DegenSquad', emoji: '🐉', members: 7, volumeSol: 12400, pnlPct: 42.1, level: 8, levelName: 'Dragon' },
  { rank: 2, pubkey: 'def456', name: 'SOL Mafia', emoji: '🦁', members: 5, volumeSol: 8900, pnlPct: 31.8, level: 6, levelName: 'Lion' },
  { rank: 3, pubkey: 'ghi789', name: 'Moon Crew', emoji: '🦊', members: 9, volumeSol: 7200, pnlPct: 28.4, level: 5, levelName: 'Fox' },
  { rank: 4, pubkey: 'jkl012', name: 'Ape Gang', emoji: '🐔', members: 4, volumeSol: 5600, pnlPct: 19.2, level: 4, levelName: 'Hen' },
  { rank: 5, pubkey: 'mno345', name: 'Bonk Fam', emoji: '🐣', members: 6, volumeSol: 4100, pnlPct: 15.7, level: 3, levelName: 'Chick' },
  { rank: 6, pubkey: 'pqr678', name: 'JUP Holders', emoji: '🐣', members: 3, volumeSol: 3200, pnlPct: 11.3, level: 3, levelName: 'Chick' },
  { rank: 7, pubkey: 'stu901', name: 'Alpha POT', emoji: '🥚', members: 8, volumeSol: 2800, pnlPct: 8.9, level: 2, levelName: 'Hatching' },
  { rank: 8, pubkey: 'vwx234', name: 'Yield Maxi', emoji: '🥚', members: 5, volumeSol: 1900, pnlPct: 6.2, level: 2, levelName: 'Hatching' },
  { rank: 9, pubkey: 'yza567', name: 'Fren Group', emoji: '🌱', members: 4, volumeSol: 1200, pnlPct: 4.1, level: 1, levelName: 'Seedling' },
  { rank: 10, pubkey: 'bcd890', name: 'New Crew', emoji: '🌱', members: 2, volumeSol: 400, pnlPct: 1.8, level: 1, levelName: 'Seedling' },
]

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

type TimeFilter = '7D' | '30D' | 'All Time'

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30D')

  return (
    <>
      <main className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-[#1A2332] bg-[#0a0a0f]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🪴</span>
              <span className="font-display font-bold text-lg text-white">PotBot</span>
              <span className="text-xs bg-[#9945FF]/20 text-[#9945FF] px-2 py-0.5 rounded-full font-mono">v2</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
              <a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a>
              <a href="/leaderboard" className="text-white">Leaderboard</a>
              <a href="/duel" className="hover:text-white transition-colors">Duels</a>
            </nav>
            <div className="flex items-center gap-3">
              <VoiceButton />
              <WalletMultiButton />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">🏆</span>
              <h1 className="text-4xl font-display font-bold text-white">POT Leaderboard</h1>
            </div>
            <p className="text-gray-400">Top performing vaults this month</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-8">
            {(['7D', '30D', 'All Time'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  timeFilter === filter
                    ? 'bg-[#9945FF] text-white'
                    : 'bg-[#16161e] text-gray-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {MOCK_LEADERBOARD.slice(0, 3).map(pot => {
              const medalColor = MEDAL_COLORS[pot.rank]
              const medalEmoji = ['🥇', '🥈', '🥉'][pot.rank - 1]

              return (
                <Link
                  key={pot.pubkey}
                  href={`/pots/${pot.pubkey}`}
                  className={`card group cursor-pointer transition-all hover:border-[#9945FF]/50 hover:-translate-y-1 relative border-2 ${
                    pot.rank === 1 ? 'border-[#FFD700]' :
                    pot.rank === 2 ? 'border-[#C0C0C0]' :
                    'border-[#CD7F32]'
                  }`}
                >
                  {/* Medal badge */}
                  <div className="absolute -top-4 -right-4 text-4xl">{medalEmoji}</div>

                  {/* Card content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-4xl mb-2">{pot.emoji}</div>
                        <h3 className="text-xl font-bold text-white mb-1">{pot.name}</h3>
                        <p className="text-xs text-gray-400">{pot.levelName} Level {pot.level}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{ color: medalColor }}>#{pot.rank}</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between text-gray-300">
                        <span>Members</span>
                        <span className="font-mono">{pot.members}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Volume</span>
                        <span className="font-mono">{pot.volumeSol.toLocaleString()} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">PnL</span>
                        <span className={`font-mono font-bold ${pot.pnlPct >= 0 ? 'text-[#14F195]' : 'text-[#FF4545]'}`}>
                          {pot.pnlPct >= 0 ? '+' : ''}{pot.pnlPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Hover effect */}
                    <div className="text-xs text-[#9945FF] opacity-0 group-hover:opacity-100 transition-opacity">
                      View POT →
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Leaderboard Table (Ranks 4-10) */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2332]">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">POT Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Members</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Volume</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">PnL%</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Tamagotchi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2332]">
                  {MOCK_LEADERBOARD.slice(3, 10).map(pot => (
                    <tr
                      key={pot.pubkey}
                      className="hover:bg-[#16161e]/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/pots/${pot.pubkey}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-lg text-[#9945FF]">#{pot.rank}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{pot.emoji}</span>
                          <span className="font-semibold text-white">{pot.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{pot.members}</td>
                      <td className="px-6 py-4 text-gray-300 font-mono">{pot.volumeSol.toLocaleString()} SOL</td>
                      <td className="px-6 py-4">
                        <span className={`font-mono font-bold ${pot.pnlPct >= 0 ? 'text-[#14F195]' : 'text-[#FF4545]'}`}>
                          {pot.pnlPct >= 0 ? '+' : ''}{pot.pnlPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-[#9945FF]/20 text-[#9945FF] px-2 py-1 rounded-lg">
                          L{pot.level} {pot.levelName}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-10 text-center">
            <div className="card p-8 max-w-lg mx-auto">
              <h3 className="text-xl font-bold text-white mb-2">Want your POT on the leaderboard?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Create a POT and start trading to climb the rankings and earn rewards.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-2.5 rounded-xl bg-[#9945FF] text-white font-semibold text-sm hover:bg-[#9945FF]/90 transition-colors"
              >
                Opt In Your POT
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
