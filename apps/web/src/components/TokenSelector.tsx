'use client'

import { useState, useRef, useEffect } from 'react'
import { KNOWN_TOKENS, useTokenPrices } from '@/lib/prices'
import { useTokenRisks, RISK_CONFIG } from '@/lib/scam-check'

interface Props {
  value: string
  onChange: (mint: string) => void
  label?: string
  className?: string
}

const TOKEN_LIST = Object.entries(KNOWN_TOKENS).map(([mint, info]) => ({ mint, ...info }))

export function TokenSelector({ value, onChange, label, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const mints = TOKEN_LIST.map((t) => t.mint)
  const { data: prices } = useTokenPrices(mints)
  const { data: risks } = useTokenRisks(mints)

  const selected = KNOWN_TOKENS[value]
  const selectedRisk = risks?.[value]

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <TokenIcon symbol={selected?.symbol ?? '?'} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white">
                {selected?.symbol ?? 'Select token'}
              </span>
              {selectedRisk && selectedRisk.level !== 'safe' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${RISK_CONFIG[selectedRisk.level].bg} ${RISK_CONFIG[selectedRisk.level].color}`}>
                  {RISK_CONFIG[selectedRisk.level].icon}
                </span>
              )}
            </div>
            {selected && prices?.[value] && (
              <div className="text-xs text-gray-500">${prices[value].toFixed(4)}</div>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 w-full rounded-xl bg-[#1a1a2e] border border-white/10 shadow-2xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {TOKEN_LIST.map((token) => {
              const price = prices?.[token.mint]
              return (
                <button
                  key={token.mint}
                  type="button"
                  onClick={() => {
                    onChange(token.mint)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${
                    value === token.mint ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TokenIcon symbol={token.symbol} />
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">{token.symbol}</span>
                        {risks?.[token.mint] && risks[token.mint].level !== 'safe' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${RISK_CONFIG[risks[token.mint].level].bg} ${RISK_CONFIG[risks[token.mint].level].color}`}>
                            {RISK_CONFIG[risks[token.mint].level].icon}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{token.name}</div>
                    </div>
                  </div>
                  {price != null && (
                    <div className="text-sm text-gray-400">
                      ${price < 0.01 ? price.toFixed(6) : price.toFixed(2)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TokenIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    SOL: 'bg-purple-500',
    USDC: 'bg-blue-500',
    USDT: 'bg-green-600',
    BONK: 'bg-orange-500',
    JitoSOL: 'bg-green-500',
    mSOL: 'bg-blue-400',
    WEN: 'bg-pink-500',
  }
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
        colors[symbol] ?? 'bg-gray-600'
      }`}
    >
      {symbol.slice(0, 2)}
    </div>
  )
}
