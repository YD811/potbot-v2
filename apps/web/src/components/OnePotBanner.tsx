'use client'

import Link from 'next/link'
import { useSolPrice } from '@/lib/prices'
import { usePot } from '@/hooks/usePots'

const ONE_POT_PUBKEY =
  process.env.NEXT_PUBLIC_ONE_POT_PUBKEY ?? 'DEMO1111111111111111111111111111111111111111'

const STRATEGY_RULES = [
  { icon: '⚖️', label: '70% SOL / 30% USDC baseline allocation' },
  { icon: '🤖', label: 'AI Agent proposes rebalances when SOL moves ±10% from 7-day MA' },
  { icon: '⏱️', label: '24h voting window · 50% quorum · 60% approval threshold' },
  { icon: '🔒', label: 'Max 20% of treasury per single swap — hard-coded in the contract' },
  { icon: '📖', label: 'All rules visible on the pot page under the Strategy tab' },
]

export function OnePotBanner({ compact = false }: { compact?: boolean }) {
  const { price: solPrice } = useSolPrice()
  const { data: pot } = usePot(ONE_POT_PUBKEY)

  const balanceUsd = pot && solPrice ? pot.balance * solPrice : null

  if (compact) {
    return (
      <Link
        href={`/pots/${ONE_POT_PUBKEY}`}
        className="group flex items-center justify-between p-4 rounded-2xl border border-pot-green/30 bg-gradient-to-r from-pot-green/5 to-pot-accent/5 hover:border-pot-green/60 transition-all mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,136,0.05) 0%, rgba(139,92,246,0.05) 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-3xl">🌿</span>
            <span className="absolute -top-1 -right-1 text-[10px] bg-pot-green text-pot-dark font-bold px-1 rounded-full">
              S1
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">ONE POT</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pot-green/20 text-pot-green border border-pot-green/30 font-bold">
                FEATURED
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pot-accent/20 text-pot-accent border border-pot-accent/30">
                Season 1
              </span>
            </div>
            <p className="text-xs text-pot-muted mt-0.5">
              Conservative SOL/USDC rotation · Try the platform with a small deposit
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {balanceUsd != null && (
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-pot-green">
                ${balanceUsd >= 1000 ? (balanceUsd / 1000).toFixed(1) + 'K' : balanceUsd.toFixed(0)}
              </div>
              <div className="text-[10px] text-pot-muted">TVL</div>
            </div>
          )}
          <span className="text-pot-muted text-sm group-hover:text-pot-green transition">Join →</span>
        </div>
      </Link>
    )
  }

  return (
    <div
      className="relative rounded-3xl p-[1px] mb-8 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #00ff88 0%, #9945FF 50%, #00ff88 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 6s ease infinite',
      }}
    >
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div
        className="rounded-[calc(1.5rem-1px)] p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #0a1220 0%, #0d1117 50%, #0a0e1a 100%)' }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pot-green/20 to-pot-accent/20 flex items-center justify-center text-3xl border border-pot-green/20">
                🌿
              </div>
              <span className="absolute -top-1 -right-1 text-[10px] bg-pot-green text-pot-dark font-black px-1.5 py-0.5 rounded-full">
                S1
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">ONE POT</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-pot-green/20 text-pot-green border border-pot-green/30 font-bold uppercase tracking-wide">
                  Featured
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-pot-accent/20 text-pot-accent border border-pot-accent/30">
                  🌱 Season 1
                </span>
              </div>
              <p className="text-pot-muted text-sm mt-1">
                The canonical PotBot demo vault — transparent, conservative, open to everyone
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 shrink-0">
            {pot && (
              <>
                <div className="text-center">
                  <div className="text-lg font-bold text-pot-green">
                    {balanceUsd != null
                      ? `$${balanceUsd >= 1000 ? (balanceUsd / 1000).toFixed(1) + 'K' : balanceUsd.toFixed(0)}`
                      : `${pot.balance.toFixed(2)} SOL`}
                  </div>
                  <div className="text-[11px] text-pot-muted">TVL</div>
                </div>
                <div className="w-px h-8 bg-pot-border" />
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{pot.memberCount}</div>
                  <div className="text-[11px] text-pot-muted">Members</div>
                </div>
                <div className="w-px h-8 bg-pot-border" />
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{pot.tradeCount}</div>
                  <div className="text-[11px] text-pot-muted">Trades</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Strategy rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {STRATEGY_RULES.map((rule) => (
            <div
              key={rule.label}
              className="flex items-start gap-2 text-sm"
            >
              <span className="shrink-0 mt-0.5">{rule.icon}</span>
              <span className="text-gray-300">{rule.label}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer + CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-pot-muted max-w-md leading-relaxed">
            ONE POT is a demo vault with real funds. It is not a recommendation.
            Crypto assets are volatile — you may lose part or all of your deposit.
          </p>
          <Link
            href={`/pots/${ONE_POT_PUBKEY}`}
            className="shrink-0 rounded-xl bg-pot-green px-6 py-2.5 text-sm font-bold text-pot-dark hover:brightness-110 transition active:scale-[0.98]"
          >
            Join ONE POT →
          </Link>
        </div>
      </div>
    </div>
  )
}
