'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMockStore } from '@/lib/mock-store'

const BUY_TOKENS = [
  { symbol: 'SOL',     mint: 'So11111111111111111111111111111111111111112',     icon: '◎' },
  { symbol: 'BONK',    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  icon: '🐶' },
  { symbol: 'JitoSOL', mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',  icon: '🟢' },
  { symbol: 'mSOL',    mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',   icon: '🌊' },
  { symbol: 'WIF',     mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  icon: '🐕' },
]

const FREQUENCIES = [
  { label: 'Hourly',  secondsBetween: 3_600   },
  { label: 'Daily',   secondsBetween: 86_400  },
  { label: 'Weekly',  secondsBetween: 604_800 },
]

interface DCAStrategy {
  id:              string
  buySymbol:       string
  buyMint:         string
  amountPerCycle:  number   // USDC
  frequency:       string
  cyclesTotal:     number
  cyclesDone:      number
  maxPrice:        number   // 0 = no limit
  status:          'active' | 'paused' | 'completed' | 'cancelled'
  proposalId:      number
  createdAt:       number
  nextExecutionAt: number
}

const STATUS_STYLE: Record<DCAStrategy['status'], string> = {
  active:    'bg-pot-green/20 text-pot-green',
  paused:    'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-red-500/20 text-red-400',
}
const STATUS_LABEL: Record<DCAStrategy['status'], string> = {
  active:    '▶ Active',
  paused:    '⏸ Paused',
  completed: '✅ Completed',
  cancelled: '❌ Cancelled',
}

export function DCAPanel({ potPubkey }: { potPubkey: string }) {
  const { publicKey } = useWallet()
  const store = useMockStore()
  const pot   = (store.pots as any[]).find(p => p.pubkey === potPubkey)

  const [buyIdx,          setBuyIdx]          = useState(0)      // SOL
  const [amountPerCycle,  setAmountPerCycle]  = useState('')     // USDC
  const [freqIdx,         setFreqIdx]         = useState(1)      // Daily
  const [cycles,          setCycles]          = useState('10')
  const [maxPrice,        setMaxPrice]        = useState('')
  const [strategies,      setStrategies]      = useState<DCAStrategy[]>([])
  const [confirm,         setConfirm]         = useState(false)
  const [busy,            setBusy]            = useState(false)
  const [toast,           setToast]           = useState<string | null>(null)

  const buyToken  = BUY_TOKENS[buyIdx]
  const frequency = FREQUENCIES[freqIdx]
  const numCycles = parseInt(cycles) || 0
  const totalCost = amountPerCycle ? (parseFloat(amountPerCycle) * numCycles).toFixed(2) : '—'

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handlePropose = async () => {
    if (!amountPerCycle || parseFloat(amountPerCycle) <= 0 || numCycles < 1) return
    setBusy(true)
    try {
      const freq = FREQUENCIES[freqIdx]
      const maxPriceNum = maxPrice ? parseFloat(maxPrice) : 0
      const proposalDesc = [
        `[DCA] Buy ${buyToken.symbol} ${freq.label.toLowerCase()}`,
        `$${amountPerCycle}/cycle × ${cycles} cycles`,
        maxPriceNum > 0 ? `max price $${maxPriceNum}` : 'no price limit',
      ].join(' · ')

      const strat: DCAStrategy = {
        id:              crypto.randomUUID(),
        buySymbol:       buyToken.symbol,
        buyMint:         buyToken.mint,
        amountPerCycle:  parseFloat(amountPerCycle),
        frequency:       freq.label,
        cyclesTotal:     numCycles,
        cyclesDone:      0,
        maxPrice:        maxPriceNum,
        status:          'active',
        proposalId:      (pot?.nextProposalId ?? 0) + strategies.length,
        createdAt:       Date.now(),
        nextExecutionAt: Date.now() + freq.secondsBetween * 1000,
      }
      setStrategies(prev => [strat, ...prev])
      setAmountPerCycle('')
      setCycles('10')
      setMaxPrice('')
      setConfirm(false)
      showToast(`✅ DCA strategy proposed — buying ${buyToken.symbol} ${freq.label.toLowerCase()}`)
    } finally {
      setBusy(false)
    }
  }

  const pauseResume = (id: string) => {
    setStrategies(prev => prev.map(s =>
      s.id === id
        ? { ...s, status: s.status === 'active' ? 'paused' : 'active' }
        : s
    ))
  }

  const cancel = (id: string) => {
    setStrategies(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'cancelled' } : s
    ))
  }

  const durationLabel = (strat: DCAStrategy) => {
    const cyclesLeft = strat.cyclesTotal - strat.cyclesDone
    const freq = FREQUENCIES.find(f => f.label === strat.frequency)
    if (!freq || cyclesLeft <= 0) return 'Done'
    const ms = cyclesLeft * freq.secondsBetween * 1000
    const days = Math.ceil(ms / 86_400_000)
    return `~${days}d remaining`
  }

  if (!publicKey) {
    return (
      <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-white font-semibold">Connect wallet to set up DCA</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-pot-green text-pot-dark font-bold px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">📈 DCA Strategy</h2>
          <p className="text-sm text-pot-muted mt-1">
            Dollar-cost average into any token — governed by vault members
          </p>
        </div>
        <span className="px-3 py-1 bg-pot-green/10 text-pot-green border border-pot-green/30 rounded-full text-xs font-bold">
          ⚡ Jupiter DCA
        </span>
      </div>

      {/* Create strategy */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-semibold">New DCA Strategy</h3>

        {/* Buy token */}
        <div>
          <label className="text-xs text-pot-muted mb-1 block">Token to buy</label>
          <div className="flex gap-2 flex-wrap">
            {BUY_TOKENS.map((t, i) => (
              <button
                key={t.mint}
                onClick={() => setBuyIdx(i)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                  buyIdx === i
                    ? 'bg-pot-accent text-white'
                    : 'bg-pot-border text-pot-muted hover:text-white'
                }`}
              >
                {t.icon} {t.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Amount per cycle */}
        <div>
          <label className="text-xs text-pot-muted mb-1 block">
            Amount per cycle (USDC)
          </label>
          <input
            type="number"
            placeholder="100"
            value={amountPerCycle}
            onChange={e => setAmountPerCycle(e.target.value)}
            className="input w-full"
            min="0"
            step="1"
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="text-xs text-pot-muted mb-1 block">Frequency</label>
          <div className="flex gap-2">
            {FREQUENCIES.map((f, i) => (
              <button
                key={f.label}
                onClick={() => setFreqIdx(i)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                  freqIdx === i
                    ? 'bg-pot-accent text-white'
                    : 'bg-pot-border text-pot-muted hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Number of cycles */}
        <div>
          <label className="text-xs text-pot-muted mb-1 block">
            Number of cycles
            <span className="ml-2 text-pot-muted">
              Total cost: ${totalCost} USDC
            </span>
          </label>
          <input
            type="number"
            placeholder="10"
            value={cycles}
            onChange={e => setCycles(e.target.value)}
            className="input w-full"
            min="1"
            max="365"
            step="1"
          />
        </div>

        {/* Max price guard */}
        <div>
          <label className="text-xs text-pot-muted mb-1 block">
            Max price (optional)
            <span className="ml-2 text-pot-muted">Skip cycle if price exceeds this</span>
          </label>
          <input
            type="number"
            placeholder="No limit"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            className="input w-full"
            min="0"
            step="0.01"
          />
        </div>

        {/* Summary */}
        {amountPerCycle && numCycles > 0 && (
          <div className="bg-pot-dark rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-pot-muted">
              <span>Buying</span>
              <span className="text-white font-semibold">{buyToken.icon} {buyToken.symbol}</span>
            </div>
            <div className="flex justify-between text-pot-muted">
              <span>Per cycle</span>
              <span className="text-white font-mono">${parseFloat(amountPerCycle).toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between text-pot-muted">
              <span>Frequency</span>
              <span className="text-white">{frequency.label}</span>
            </div>
            <div className="flex justify-between text-pot-muted">
              <span>Cycles</span>
              <span className="text-white">{cycles}</span>
            </div>
            <div className="border-t border-pot-border pt-2 flex justify-between">
              <span className="text-pot-muted">Total investment</span>
              <span className="text-pot-green font-bold">${totalCost} USDC</span>
            </div>
            {maxPrice && (
              <div className="flex justify-between text-pot-muted">
                <span>Max price guard</span>
                <span className="text-yellow-400">${parseFloat(maxPrice).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            disabled={!amountPerCycle || parseFloat(amountPerCycle) <= 0 || numCycles < 1}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📈 Propose DCA Strategy
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-pot-muted text-center">
              Members vote to approve this DCA strategy. Once passed, it executes automatically.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handlePropose}
                disabled={busy}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {busy ? 'Submitting…' : '✅ Confirm & Propose'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active strategies */}
      <div>
        <h3 className="text-white font-semibold mb-3">
          Active Strategies
          {strategies.filter(s => s.status === 'active').length > 0 && (
            <span className="ml-2 text-xs bg-pot-green/20 text-pot-green px-2 py-0.5 rounded-full">
              {strategies.filter(s => s.status === 'active').length} running
            </span>
          )}
        </h3>

        {strategies.length === 0 ? (
          <div className="text-center py-10 bg-pot-card border border-pot-border rounded-2xl">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-pot-muted text-sm">No DCA strategies yet</p>
            <p className="text-pot-muted text-xs mt-1">
              DCA strategies auto-execute via Jupiter at each interval
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {strategies.map(strat => (
              <div key={strat.id} className="bg-pot-card border border-pot-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-semibold">
                      DCA into {strat.buySymbol}
                    </p>
                    <p className="text-xs text-pot-muted mt-0.5">
                      Proposal #{strat.proposalId}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[strat.status]}`}>
                    {STATUS_LABEL[strat.status]}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-pot-muted mb-1">
                    <span>{strat.cyclesDone}/{strat.cyclesTotal} cycles</span>
                    <span>{durationLabel(strat)}</span>
                  </div>
                  <div className="h-2 bg-pot-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pot-green rounded-full transition-all"
                      style={{ width: `${(strat.cyclesDone / strat.cyclesTotal) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                  <div>
                    <div className="text-pot-muted">Per cycle</div>
                    <div className="text-white font-mono">${strat.amountPerCycle}</div>
                  </div>
                  <div>
                    <div className="text-pot-muted">Frequency</div>
                    <div className="text-white">{strat.frequency}</div>
                  </div>
                  <div>
                    <div className="text-pot-muted">Max price</div>
                    <div className="text-white">
                      {strat.maxPrice > 0 ? `$${strat.maxPrice.toLocaleString()}` : 'No limit'}
                    </div>
                  </div>
                </div>

                {(strat.status === 'active' || strat.status === 'paused') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => pauseResume(strat.id)}
                      className="flex-1 py-1.5 text-xs rounded-lg bg-pot-border hover:bg-pot-accent/20 text-pot-muted hover:text-white transition"
                    >
                      {strat.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                    </button>
                    <button
                      onClick={() => cancel(strat.id)}
                      className="flex-1 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
