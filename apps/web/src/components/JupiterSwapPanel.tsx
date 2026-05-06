'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { withTxToast } from '@/components/TxToast'
import { ExplorerLink } from '@/components/ExplorerLink'
import {
  getJupiterQuote,
  executeJupiterSwap,
  toRawAmount,
  priceImpactColor,
  SOL_MINT,
  USDC_MINT,
  USDT_MINT,
  type JupiterQuote,
  type SwapQuoteResult,
} from '@/lib/jupiter-swap'

/* ── Token list for this panel ── */
const TOKENS = [
  { mint: SOL_MINT,  symbol: 'SOL',     name: 'Solana',          color: 'bg-purple-500',  icon: '◎' },
  { mint: USDC_MINT, symbol: 'USDC',    name: 'USD Coin',         color: 'bg-blue-500',    icon: '💵' },
  { mint: USDT_MINT, symbol: 'USDT',    name: 'Tether',           color: 'bg-green-600',   icon: '💲' },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u', symbol: 'BONK', name: 'Bonk', color: 'bg-orange-500', icon: '🐕' },
  { mint: 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7', symbol: 'JUP',  name: 'Jupiter', color: 'bg-teal-500', icon: '🪐' },
  { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'JitoSOL', name: 'Jito Staked SOL', color: 'bg-green-500', icon: '🔥' },
  { mint: 'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ', symbol: 'WIF',  name: 'dogwifhat', color: 'bg-pink-500',  icon: '🐶' },
] as const

type TokenMint = typeof TOKENS[number]['mint']

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1, 3] // %
const QUOTE_DEBOUNCE_MS = 600
const SWAP_AMOUNTS = ['0.1', '0.5', '1', '5', '10']

interface Props {
  potPubkey?: string  // if set, this is a pot-vault swap (proposal mode)
  vaultBalance?: number
  mode?: 'personal' | 'vault'  // personal = user wallet, vault = pot vault (propose)
  onPropose?: (params: { fromMint: string; toMint: string; amountSol: number; description: string }) => void
}

function TokenIcon({ symbol, color }: { symbol: string; color: string }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${color}`}>
      {symbol.slice(0, 2)}
    </div>
  )
}

function TokenDropdown({
  value,
  onChange,
  exclude,
}: {
  value: TokenMint
  onChange: (m: TokenMint) => void
  exclude?: TokenMint
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const token = TOKENS.find(t => t.mint === value)!

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-pot-dark border border-pot-border rounded-xl hover:border-pot-accent/50 transition min-w-[110px]"
      >
        <TokenIcon symbol={token.symbol} color={token.color} />
        <div className="text-left">
          <div className="text-sm font-semibold text-white">{token.symbol}</div>
          <div className="text-[10px] text-pot-muted">{token.name}</div>
        </div>
        <svg className={`w-3.5 h-3.5 text-pot-muted ml-auto transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-48 bg-[#111827] border border-pot-border rounded-2xl shadow-2xl overflow-hidden">
          {TOKENS.filter(t => t.mint !== exclude).map(t => (
            <button
              key={t.mint}
              type="button"
              onClick={() => { onChange(t.mint as TokenMint); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-pot-dark transition text-left ${t.mint === value ? 'bg-pot-dark' : ''}`}
            >
              <TokenIcon symbol={t.symbol} color={t.color} />
              <div>
                <div className="text-sm font-semibold text-white">{t.symbol}</div>
                <div className="text-[10px] text-pot-muted">{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function JupiterSwapPanel({ potPubkey, vaultBalance, mode = 'personal', onPropose }: Props) {
  const { publicKey, connected, signTransaction } = useWallet()
  const { connection } = useConnection()

  const [fromMint, setFromMint] = useState<TokenMint>(SOL_MINT)
  const [toMint,   setToMint]   = useState<TokenMint>(USDC_MINT)
  const [amountStr, setAmountStr] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [quoteResult, setQuoteResult] = useState<SwapQuoteResult | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const [lastTx, setLastTx] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fromToken = TOKENS.find(t => t.mint === fromMint)!
  const toToken   = TOKENS.find(t => t.mint === toMint)!
  const amountNum = parseFloat(amountStr) || 0

  // Wallet SOL balance
  const { data: walletSol = 0 } = useQuery({
    queryKey: ['walletBalance', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return 0
      const lamps = await connection.getBalance(publicKey, 'confirmed')
      return Math.max(0, (lamps - 10_000_000) / LAMPORTS_PER_SOL)
    },
    enabled: !!publicKey,
    refetchInterval: 10_000,
  })

  const maxAmount = mode === 'vault' ? (vaultBalance ?? 0) : walletSol

  // Debounced quote fetch
  useEffect(() => {
    if (!amountNum || amountNum <= 0) { setQuoteResult(null); return }
    setQuoteLoading(true)
    setQuoteError(null)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const rawAmount = toRawAmount(amountNum, fromMint)
        const result = await getJupiterQuote(fromMint, toMint, rawAmount, Math.round(slippage * 100))
        setQuoteResult(result)
        if (!result) setQuoteError('No route found — try a different amount or token pair')
      } catch (e: any) {
        setQuoteError(e.message ?? 'Failed to get quote')
        setQuoteResult(null)
      } finally {
        setQuoteLoading(false)
      }
    }, QUOTE_DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [amountNum, fromMint, toMint, slippage])

  function flip() {
    setFromMint(toMint)
    setToMint(fromMint)
    setAmountStr('')
    setQuoteResult(null)
  }

  async function handleSwap() {
    if (!connected || !publicKey || !signTransaction || !quoteResult) return

    if (mode === 'vault' && onPropose) {
      // Vault mode: create a governance proposal
      const desc = `Swap ${amountNum} ${fromToken.symbol} → ${toToken.symbol}`
      onPropose({ fromMint, toMint, amountSol: amountNum, description: desc })
      return
    }

    // Personal mode: execute real Jupiter swap
    setIsSwapping(true)
    try {
      await withTxToast(
        async () => {
          const sig = await executeJupiterSwap(
            connection,
            quoteResult.quote,
            publicKey,
            signTransaction as any,
          )
          setLastTx(sig)
          setAmountStr('')
          setQuoteResult(null)
          return sig
        },
        `Swapping ${amountNum} ${fromToken.symbol} → ${toToken.symbol}…`,
        `Swapped! Got ~${quoteResult.outAmountUi.toFixed(4)} ${toToken.symbol} 🎉`
      )
    } catch (e: any) {
      console.error('Swap failed:', e)
    } finally {
      setIsSwapping(false)
    }
  }

  const canSwap = connected && !!quoteResult && amountNum > 0 && amountNum <= maxAmount

  return (
    <div className="space-y-4">
      {/* Mode badge */}
      {mode === 'vault' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-pot-accent/10 border border-pot-accent/30 rounded-xl text-xs text-pot-accent">
          🏛️ Vault mode — this swap will create a governance proposal for members to vote on
        </div>
      )}

      {/* From */}
      <div className="bg-pot-dark border border-pot-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-pot-muted">From</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-pot-muted">
              Balance: {mode === 'vault' ? `${vaultBalance?.toFixed(4) ?? '—'} SOL (vault)` : `${walletSol.toFixed(4)} SOL`}
            </span>
            <button
              onClick={() => setAmountStr(maxAmount.toFixed(4))}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-pot-accent/20 text-pot-accent hover:bg-pot-accent/30 transition"
            >
              MAX
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TokenDropdown value={fromMint} onChange={m => { setFromMint(m); setQuoteResult(null) }} exclude={toMint} />
          <input
            type="number"
            placeholder="0.00"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
            className="flex-1 bg-transparent text-2xl font-mono text-white text-right outline-none placeholder:text-pot-border"
          />
        </div>
        {/* Quick amounts */}
        <div className="flex gap-1.5 mt-3">
          {SWAP_AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => setAmountStr(a)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-pot-card border border-pot-border text-pot-muted hover:text-white hover:border-pot-accent/50 transition"
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Flip button */}
      <div className="flex justify-center -my-1">
        <button
          onClick={flip}
          className="w-9 h-9 rounded-full bg-pot-card border border-pot-border hover:border-pot-accent/50 flex items-center justify-center text-pot-muted hover:text-white transition rotate-0 hover:rotate-180 duration-300"
        >
          ⇅
        </button>
      </div>

      {/* To */}
      <div className="bg-pot-dark border border-pot-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-pot-muted">To (estimated)</span>
          {quoteLoading && <span className="text-xs text-pot-muted animate-pulse">Fetching quote…</span>}
        </div>
        <div className="flex items-center gap-3">
          <TokenDropdown value={toMint} onChange={m => { setToMint(m); setQuoteResult(null) }} exclude={fromMint} />
          <div className="flex-1 text-right">
            <div className={`text-2xl font-mono ${quoteResult ? 'text-pot-green' : 'text-pot-border'}`}>
              {quoteResult ? quoteResult.outAmountUi.toFixed(6) : '0.00'}
            </div>
            {quoteResult && (
              <div className="text-xs text-pot-muted mt-0.5">
                min {quoteResult.minOutUi.toFixed(6)} (after slippage)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quote details */}
      {quoteResult && (
        <div className="bg-pot-dark border border-pot-border rounded-xl p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-pot-muted">Rate</span>
            <span className="text-white font-mono">
              1 {fromToken.symbol} ≈ {(quoteResult.outAmountUi / quoteResult.inAmountUi).toFixed(4)} {toToken.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-pot-muted">Price impact</span>
            <span className={`font-mono font-semibold ${priceImpactColor(quoteResult.priceImpactPct)}`}>
              {quoteResult.priceImpactPct < 0.01 ? '<0.01' : quoteResult.priceImpactPct.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-pot-muted">Route</span>
            <span className="text-white truncate max-w-[180px] text-right">{quoteResult.route}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-pot-muted">Slippage</span>
            <span className="text-white">{slippage}%</span>
          </div>
        </div>
      )}

      {quoteError && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
          ⚠️ {quoteError}
        </div>
      )}

      {/* Slippage settings */}
      <div>
        <div className="text-xs text-pot-muted mb-2">Slippage tolerance</div>
        <div className="flex gap-1.5">
          {SLIPPAGE_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSlippage(s)}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
                slippage === s
                  ? 'border-pot-accent text-pot-accent bg-pot-accent/10'
                  : 'border-pot-border text-pot-muted hover:text-white'
              }`}
            >
              {s}%
            </button>
          ))}
        </div>
      </div>

      {/* Swap button */}
      <button
        onClick={handleSwap}
        disabled={!canSwap || isSwapping}
        className="w-full btn-primary !py-4 text-base font-bold disabled:opacity-40 transition-all"
      >
        {!connected
          ? '🔌 Connect Wallet'
          : isSwapping
          ? '⏳ Swapping…'
          : quoteLoading
          ? '🔍 Getting quote…'
          : !quoteResult
          ? 'Enter amount to swap'
          : mode === 'vault'
          ? `🏛️ Propose: Swap ${amountNum} ${fromToken.symbol} → ${toToken.symbol}`
          : `⚡ Swap ${amountNum} ${fromToken.symbol} → ~${quoteResult.outAmountUi.toFixed(4)} ${toToken.symbol}`
        }
      </button>

      {/* Last tx */}
      {lastTx && mode === 'personal' && (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs gap-3">
          <span className="text-green-400 shrink-0">✅ Swap confirmed</span>
          <ExplorerLink txSig={lastTx} variant="compact" />
        </div>
      )}

      {/* Not connected */}
      {!connected && (
        <p className="text-center text-xs text-pot-muted">
          Connect your wallet to swap tokens
        </p>
      )}
    </div>
  )
}
