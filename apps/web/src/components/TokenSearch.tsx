'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useJupiterTokens, searchTokens, getPinnedTokens } from '@/lib/jupiter-tokens'
import type { JupiterToken } from '@/lib/jupiter-tokens'
import { useTokenRisk, RISK_CONFIG } from '@/lib/scam-check'

interface Props {
  value: string           // selected mint address
  onChange: (token: JupiterToken) => void
  label?: string
  exclude?: string        // mint to exclude (e.g. the other side of swap)
  className?: string
  placeholder?: string
}

export function TokenSearch({ value, onChange, label, exclude, className = '', placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'strict' | 'all'>('strict')
  const inputRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  const { data: tokens = [], isLoading } = useJupiterTokens(mode)

  const selectedToken = useMemo(
    () => tokens.find((t) => t.address === value),
    [tokens, value]
  )

  const pinned = useMemo(() => getPinnedTokens(tokens), [tokens])

  const results = useMemo(() => {
    const filtered = exclude ? tokens.filter((t) => t.address !== exclude) : tokens
    return searchTokens(filtered, query, 60)
  }, [tokens, query, exclude])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus input when open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && <label className="block text-xs text-pot-muted mb-1">{label}</label>}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors text-left ${
          open
            ? 'border-pot-accent bg-pot-accent/5'
            : 'border-pot-border bg-pot-dark hover:border-pot-border/60'
        }`}
      >
        {selectedToken ? (
          <>
            <TokenLogo token={selectedToken} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{selectedToken.symbol}</div>
              <div className="text-[10px] text-pot-muted truncate">{selectedToken.name}</div>
            </div>
            <svg className={`w-3.5 h-3.5 text-pot-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-pot-border flex items-center justify-center text-pot-muted">?</div>
            <span className="text-sm text-pot-muted flex-1">{placeholder ?? 'Select token'}</span>
            <svg className="w-3.5 h-3.5 text-pot-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[100] top-full mt-1.5 w-full min-w-[280px] rounded-2xl bg-[#13131f] border border-pot-border shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-pot-border">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pot-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, symbol or address..."
                className="w-full bg-pot-card rounded-xl pl-8 pr-3 py-2 text-sm text-white border border-pot-border focus:border-pot-accent outline-none placeholder:text-pot-muted"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-pot-muted hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Strict / All toggle */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-pot-muted">List:</span>
              <div className="flex gap-1">
                {(['strict', 'all'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition ${
                      mode === m
                        ? 'bg-pot-accent text-white'
                        : 'bg-pot-dark text-pot-muted hover:text-white border border-pot-border'
                    }`}
                  >
                    {m === 'strict' ? '✅ Verified (~1500)' : '🌐 All tokens (200k+)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center text-pot-muted text-sm animate-pulse">
                Loading tokens…
              </div>
            ) : query.trim() === '' ? (
              <>
                {/* Pinned tokens */}
                <div className="px-3 py-1.5 text-[10px] text-pot-muted uppercase tracking-wide font-medium">
                  Popular
                </div>
                {pinned.filter((t) => t.address !== exclude).map((token) => (
                  <TokenRow
                    key={token.address}
                    token={token}
                    selected={token.address === value}
                    onSelect={() => { onChange(token); setOpen(false); setQuery('') }}
                  />
                ))}
                <div className="px-3 py-1.5 text-[10px] text-pot-muted uppercase tracking-wide font-medium border-t border-pot-border mt-1">
                  All verified tokens
                </div>
                {tokens
                  .filter((t) => t.address !== exclude && !pinned.find((p) => p.address === t.address))
                  .slice(0, 30)
                  .map((token) => (
                    <TokenRow
                      key={token.address}
                      token={token}
                      selected={token.address === value}
                      onSelect={() => { onChange(token); setOpen(false); setQuery('') }}
                    />
                  ))}
              </>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-pot-muted text-sm">
                No tokens found for "{query}"
              </div>
            ) : (
              <>
                <div className="px-3 py-1.5 text-[10px] text-pot-muted">
                  {results.length} results
                </div>
                {results.map((token) => (
                  <TokenRow
                    key={token.address}
                    token={token}
                    selected={token.address === value}
                    onSelect={() => { onChange(token); setOpen(false); setQuery('') }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Token row ── */

function TokenRow({
  token,
  selected,
  onSelect,
}: {
  token: JupiterToken
  selected: boolean
  onSelect: () => void
}) {
  const { data: risk } = useTokenRisk(token.address)
  const isVerified = token.tags.includes('verified') || token.tags.includes('strict')

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left ${
        selected ? 'bg-pot-accent/10' : ''
      }`}
    >
      <TokenLogo token={token} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white">{token.symbol}</span>
          {isVerified && (
            <span className="text-[9px] text-green-400 bg-green-500/10 px-1 rounded">✓</span>
          )}
          {risk && risk.level !== 'safe' && risk.level !== 'unknown' && (
            <span className={`text-[9px] px-1 rounded ${RISK_CONFIG[risk.level].bg} ${RISK_CONFIG[risk.level].color}`}>
              {RISK_CONFIG[risk.level].icon}
            </span>
          )}
        </div>
        <div className="text-[10px] text-pot-muted truncate">{token.name}</div>
      </div>
      <div className="text-[10px] text-pot-muted font-mono shrink-0">
        {token.address.slice(0, 4)}…{token.address.slice(-4)}
      </div>
    </button>
  )
}

/* ── Token logo with fallback ── */

const SYMBOL_COLORS: Record<string, string> = {
  SOL: '#9945FF', USDC: '#2775CA', USDT: '#26A17B',
  BONK: '#F5A623', JUP: '#00B4D8', WIF: '#F97316',
  JitoSOL: '#00C47C', mSOL: '#4CAF50', WEN: '#EC4899',
  RENDER: '#3B82F6', RAY: '#6366F1',
}

export function TokenLogo({ token, size = 32 }: { token: JupiterToken; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const bg = SYMBOL_COLORS[token.symbol] ?? '#6B7280'

  if (!imgError && token.logoURI) {
    return (
      <img
        src={token.logoURI}
        alt={token.symbol}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {token.symbol.slice(0, 2)}
    </div>
  )
}