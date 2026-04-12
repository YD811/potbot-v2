'use client'

import { useState } from 'react'
import { SEED_POSITIONS, DEFAULT_STRATEGY } from '@/lib/positions'
import type { PositionStrategy } from '@/lib/positions'
import { txSuccess } from '@/components/TxToast'

const DEFI_OPTIONS = [
  {
    value: 'none',
    label: 'No Routing',
    icon: '🔒',
    desc: 'Hold idle in vault',
    apy: null,
  },
  {
    value: 'kamino',
    label: 'Kamino Finance',
    icon: '🏦',
    desc: 'Lending & liquidity',
    apy: '4–8%',
  },
  {
    value: 'drift',
    label: 'Drift Protocol',
    icon: '📈',
    desc: 'Yield vaults',
    apy: '6–12%',
  },
  {
    value: 'marginfi',
    label: 'MarginFi',
    icon: '💰',
    desc: 'Lending protocol',
    apy: '3–7%',
  },
] as const

interface Props {
  potPubkey: string
}

export function StrategyPanel({ potPubkey }: Props) {
  const positions = SEED_POSITIONS.filter((p) => p.potPubkey === potPubkey && p.isOpen)

  const [selectedPos, setSelectedPos] = useState<string>(positions[0]?.id ?? '')
  const [strategies, setStrategies] = useState<Record<string, PositionStrategy>>(
    Object.fromEntries(positions.map((p) => [p.id, { ...p.strategy }]))
  )

  const pos = positions.find((p) => p.id === selectedPos)
  const strategy = strategies[selectedPos] ?? { ...DEFAULT_STRATEGY }

  const updateStrategy = (patch: Partial<PositionStrategy>) => {
    setStrategies((s) => ({
      ...s,
      [selectedPos]: { ...s[selectedPos], ...patch },
    }))
  }

  const handleSave = () => {
    // In production: create governance proposal of type SET_STRATEGY
    txSuccess(`Strategy saved for ${pos?.tokenSymbol}! Proposal created for governance vote.`)
  }

  if (positions.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-3">⚙️</div>
        <h3 className="text-lg font-semibold text-white mb-1">No Open Positions</h3>
        <p className="text-pot-muted text-sm">
          Execute a trade first to configure strategy settings.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Position selector */}
      <div className="card p-4 md:col-span-1">
        <h3 className="text-sm font-semibold text-pot-muted mb-3 uppercase tracking-wide">
          Positions
        </h3>
        <div className="space-y-2">
          {positions.map((p) => {
            const s = strategies[p.id] ?? p.strategy
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPos(p.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedPos === p.id
                    ? 'border-pot-accent bg-pot-accent/5'
                    : 'border-pot-border hover:border-pot-border/80 bg-pot-dark'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">{p.tokenSymbol}</span>
                  <span className="text-xs text-pot-muted">
                    {s.stopLossPct > 0 ? `SL: -${s.stopLossPct}%` : 'No SL'}
                  </span>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {s.stopLossPct > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">
                      SL {s.stopLossPct}%
                    </span>
                  )}
                  {s.takeProfitPct > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">
                      TP {s.takeProfitPct}%
                    </span>
                  )}
                  {s.defiRoute !== 'none' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                      {s.defiRoute}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Strategy editor */}
      <div className="md:col-span-2 space-y-4">
        {pos && (
          <>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-pot-accent/20 border border-pot-accent/30 flex items-center justify-center text-sm font-bold text-pot-accent">
                  {pos.tokenSymbol.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {pos.tokenSymbol} Strategy
                  </h3>
                  <p className="text-xs text-pot-muted">
                    Changes require governance approval before taking effect
                  </p>
                </div>
              </div>

              {/* Stop Loss */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-sm font-medium text-white">Stop-Loss</label>
                      <p className="text-xs text-pot-muted">
                        Auto-sell if price drops below entry by this %
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStrategy({ stopLossPct: 0 })}
                        className={`text-xs px-2 py-1 rounded transition ${
                          strategy.stopLossPct === 0
                            ? 'bg-pot-border text-pot-muted'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {strategy.stopLossPct === 0 ? 'Disabled' : `−${strategy.stopLossPct}%`}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={strategy.stopLossPct}
                      onChange={(e) => updateStrategy({ stopLossPct: parseInt(e.target.value) })}
                      className="flex-1 accent-red-500"
                    />
                    <div className="flex gap-1">
                      {[0, 10, 15, 20, 25].map((v) => (
                        <button
                          key={v}
                          onClick={() => updateStrategy({ stopLossPct: v })}
                          className={`text-xs w-8 py-1 rounded transition ${
                            strategy.stopLossPct === v
                              ? 'bg-red-500/30 text-red-400'
                              : 'bg-pot-dark text-pot-muted hover:text-white border border-pot-border'
                          }`}
                        >
                          {v === 0 ? 'Off' : `-${v}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-pot-border" />

                {/* Take Profit */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-sm font-medium text-white">Take-Profit</label>
                      <p className="text-xs text-pot-muted">
                        Auto-sell if price rises above entry by this %
                      </p>
                    </div>
                    <button
                      onClick={() => updateStrategy({ takeProfitPct: 0 })}
                      className={`text-xs px-2 py-1 rounded transition ${
                        strategy.takeProfitPct === 0
                          ? 'bg-pot-border text-pot-muted'
                          : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      }`}
                    >
                      {strategy.takeProfitPct === 0 ? 'Disabled' : `+${strategy.takeProfitPct}%`}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="10"
                      value={strategy.takeProfitPct}
                      onChange={(e) => updateStrategy({ takeProfitPct: parseInt(e.target.value) })}
                      className="flex-1 accent-green-500"
                    />
                    <div className="flex gap-1">
                      {[0, 50, 100, 150].map((v) => (
                        <button
                          key={v}
                          onClick={() => updateStrategy({ takeProfitPct: v })}
                          className={`text-xs px-1.5 py-1 rounded transition ${
                            strategy.takeProfitPct === v
                              ? 'bg-green-500/30 text-green-400'
                              : 'bg-pot-dark text-pot-muted hover:text-white border border-pot-border'
                          }`}
                        >
                          {v === 0 ? 'Off' : `+${v}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-pot-border" />

                {/* Max Allocation */}
                <div>
                  <label className="text-sm font-medium text-white block mb-0.5">
                    Max Vault Allocation
                  </label>
                  <p className="text-xs text-pot-muted mb-3">
                    Maximum % of total vault that can be in this position
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={strategy.maxAllocationPct}
                      onChange={(e) => updateStrategy({ maxAllocationPct: parseInt(e.target.value) })}
                      className="flex-1 accent-pot-accent"
                    />
                    <span className="text-sm font-mono text-pot-accent w-12 text-right">
                      {strategy.maxAllocationPct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DeFi routing */}
            <div className="card p-5">
              <h4 className="text-sm font-semibold text-white mb-1">DeFi Yield Routing</h4>
              <p className="text-xs text-pot-muted mb-4">
                Route idle position value to a yield protocol. Earns yield while waiting for exit conditions.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {DEFI_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStrategy({ defiRoute: opt.value as any })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      strategy.defiRoute === opt.value
                        ? 'border-pot-accent bg-pot-accent/10'
                        : 'border-pot-border bg-pot-dark hover:border-pot-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span>{opt.icon}</span>
                      <span className="text-xs font-medium text-white">{opt.label}</span>
                    </div>
                    <div className="text-[10px] text-pot-muted">{opt.desc}</div>
                    {opt.apy && (
                      <div className="text-[10px] text-green-400 mt-0.5">APY: {opt.apy}</div>
                    )}
                  </button>
                ))}
              </div>

              {strategy.defiRoute !== 'none' && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-pot-muted">% routed to {strategy.defiRoute}</span>
                    <span className="text-pot-accent">{strategy.defiAllocationPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={strategy.defiAllocationPct}
                    onChange={(e) =>
                      updateStrategy({ defiAllocationPct: parseInt(e.target.value) })
                    }
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-pot-muted mt-1">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white font-medium">Save Strategy</div>
                  <div className="text-xs text-pot-muted">
                    Creates a governance proposal. Members must vote to apply.
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  className="btn-primary text-sm px-6 py-2.5"
                >
                  Propose Strategy →
                </button>
              </div>

              {/* Preview */}
              <div className="mt-3 p-3 bg-pot-dark rounded-xl border border-pot-border text-xs space-y-1">
                <div className="text-pot-muted font-medium mb-2">Strategy Summary — {pos.tokenSymbol}</div>
                <div className="flex justify-between">
                  <span className="text-pot-muted">Stop-Loss</span>
                  <span className={strategy.stopLossPct > 0 ? 'text-red-400' : 'text-pot-muted'}>
                    {strategy.stopLossPct > 0 ? `−${strategy.stopLossPct}%` : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pot-muted">Take-Profit</span>
                  <span className={strategy.takeProfitPct > 0 ? 'text-green-400' : 'text-pot-muted'}>
                    {strategy.takeProfitPct > 0 ? `+${strategy.takeProfitPct}%` : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pot-muted">Max Allocation</span>
                  <span className="text-pot-accent">{strategy.maxAllocationPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pot-muted">DeFi Route</span>
                  <span className="text-blue-400">
                    {strategy.defiRoute === 'none'
                      ? 'None'
                      : `${strategy.defiRoute} (${strategy.defiAllocationPct}%)`}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}