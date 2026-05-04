'use client'

import { useState } from 'react'

/**
 * $POT token buyback display card.
 * Shows mock token stats + fee-to-buyback flywheel explanation.
 * Real data: fetch from bags.fm API / on-chain when live.
 */

// ── Mock data — replace with live fetch when $POT is listed ──────────────────
const MOCK = {
  price:      0.00312,      // USD
  priceChange: +18.4,       // 24h %
  mcap:        156_000,     // USD
  volume24h:   28_400,      // USD
  buybackPool: 1_247.83,    // USDC accumulated
  tradesTotal: 412,         // protocol swap count
  bagsUrl:     'https://bags.fm/p/PEACE',
}

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-pot-dark rounded-xl p-3 flex-1 min-w-[100px]">
      <div className="text-[10px] text-pot-muted mb-0.5">{label}</div>
      <div className="text-sm font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-[10px] text-pot-muted">{sub}</div>}
    </div>
  )
}

function BuybackModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-pot-border bg-pot-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">🔄 Buyback Flywheel</h2>
          <button onClick={onClose} className="text-pot-muted hover:text-white text-xl">×</button>
        </div>

        <div className="space-y-3 text-sm">
          {[
            { step: '1', icon: '🗳️', title: 'Pot executes a swap', body: 'Members vote, approve, and execute a swap proposal through Jupiter.' },
            { step: '2', icon: '💸', title: '1% fee collected', body: 'PotBot takes 1% of each executed swap. This is split: 0.5% to referrers, 0.5% to protocol.' },
            { step: '3', icon: '🔄', title: 'Protocol fee → $POT buyback', body: 'The 0.5% protocol share flows into an on-chain buyback PDA that automatically buys $POT on bags.fm.' },
            { step: '4', icon: '🔥', title: 'Tokens burned or redistributed', body: 'Bought-back $POT is either burned (reducing supply) or redistributed to Season winners — TBD by governance vote.' },
          ].map((s) => (
            <div key={s.step} className="flex gap-3 p-3 rounded-xl bg-pot-dark">
              <div className="w-7 h-7 rounded-full bg-pot-green/10 border border-pot-green/20 flex items-center justify-center text-[10px] font-bold text-pot-green shrink-0">
                {s.step}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span>{s.icon}</span>
                  <span className="text-xs font-semibold text-white">{s.title}</span>
                </div>
                <p className="text-xs text-pot-muted leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
          ⚠️ $POT is a utility token with no guaranteed value. Buyback does not constitute a promise of returns.
          Not investment advice.
        </div>

        <button onClick={onClose} className="btn-secondary w-full mt-4 text-sm py-2.5">Close</button>
      </div>
    </div>
  )
}

export function PotTokenCard() {
  const [showModal, setShowModal] = useState(false)
  const positive = MOCK.priceChange >= 0

  return (
    <>
      <div className="card p-5 mb-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Token logo placeholder */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pot-green/30 to-pot-accent/30 border border-pot-green/30 flex items-center justify-center text-lg font-black text-pot-green">
              🪙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">$POT Token</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pot-green/10 text-pot-green border border-pot-green/20">
                  Season 1
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-black text-white font-mono">
                  ${MOCK.price.toFixed(5)}
                </span>
                <span className={`text-xs font-bold ${positive ? 'text-pot-green' : 'text-red-400'}`}>
                  {positive ? '+' : ''}{MOCK.priceChange.toFixed(1)}%
                </span>
                <span className="text-xs text-pot-muted">24h</span>
              </div>
            </div>
          </div>

          <a
            href={MOCK.bagsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs px-3 py-1.5 rounded-xl bg-pot-green/10 text-pot-green border border-pot-green/20 hover:bg-pot-green/20 transition font-medium"
          >
            Buy on bags.fm ↗
          </a>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <StatPill
            label="Market Cap"
            value={`$${(MOCK.mcap / 1000).toFixed(0)}K`}
            sub="USD"
          />
          <StatPill
            label="24h Volume"
            value={`$${(MOCK.volume24h / 1000).toFixed(1)}K`}
          />
          <StatPill
            label="Buyback Pool"
            value={`$${MOCK.buybackPool.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub="USDC"
          />
          <StatPill
            label="Protocol Trades"
            value={String(MOCK.tradesTotal)}
            sub="all time"
          />
        </div>

        {/* Flywheel bar */}
        <div
          className="rounded-xl p-3 border border-pot-border cursor-pointer hover:border-pot-green/30 transition"
          onClick={() => setShowModal(true)}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5 text-white font-medium">
              <span>🔄</span>
              <span>Fee → Buyback flywheel</span>
            </div>
            <span className="text-pot-muted hover:text-white">How it works ↗</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-pot-muted">
            <div className="h-1.5 rounded-full bg-pot-dark flex-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pot-green to-pot-accent"
                style={{ width: `${Math.min(100, (MOCK.buybackPool / 5000) * 100)}%` }}
              />
            </div>
            <span className="shrink-0">${MOCK.buybackPool.toLocaleString(undefined, { maximumFractionDigits: 0 })} / $5K next buyback</span>
          </div>
        </div>
      </div>

      {showModal && <BuybackModal onClose={() => setShowModal(false)} />}
    </>
  )
}
