'use client'

import { useMemo, useState } from 'react'
import { useSolPrice } from '@/lib/prices'
import { StatusBadge } from './StatusBadge'

/**
 * Strategy tab — turn the opaque "Strategy" panel into a proposal builder.
 *
 * Flow: user picks a token (search by ticker or paste a contract address),
 * picks an action (Buy/Sell/Swap A→B/Set price-trigger), sets the amount as
 * a % of vault, sees a Jupiter-quoted preview, and submits the result as a
 * governance proposal. No on-chain side-effects from this component yet —
 * we hand the parsed config to the existing CreateProposalModal flow via
 * the `onSubmit` callback.
 *
 * Reference for interaction patterns: https://docs.jup.ag/user-docs/earn/lend/strategies
 *
 * Constraint: keep < 300 lines, no new dependencies, reuse Jupiter Price API.
 */

type Action = 'buy' | 'sell' | 'swap' | 'trigger'

interface KnownToken {
  symbol: string
  name: string
  mint: string
}

// Curated short-list of common tokens. Users can paste any other CA.
// Mints — devnet/mainnet stable: SOL/USDC/JUP/BONK/JLP.
const TOKENS: KnownToken[] = [
  { symbol: 'SOL',  name: 'Solana',   mint: 'So11111111111111111111111111111111111111112' },
  { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { symbol: 'JUP',  name: 'Jupiter',  mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { symbol: 'BONK', name: 'Bonk',     mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'JLP',  name: 'Jupiter LP', mint: '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4' },
]

function isLikelyAddress(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim())
}

interface Props {
  potName: string
  potBalanceSol: number
  /**
   * Hook into the existing CreateProposalModal. The page passes a callback
   * that prefills it with a SwapType proposal.
   */
  onSubmit?: (config: {
    action: Action
    fromMint: string
    toMint: string
    amountPct: number
    triggerPriceUsd?: number
    description: string
  }) => void
}

export function StrategyProposalBuilder({ potName, potBalanceSol, onSubmit }: Props) {
  const [action, setAction] = useState<Action>('buy')
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [amountPct, setAmountPct] = useState(10)
  const [triggerPriceUsd, setTriggerPriceUsd] = useState<number | ''>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { price: solPrice } = useSolPrice()

  // Resolve query → token (named + paste-CA)
  const fromToken = useMemo(() => resolveToken(fromQuery, action === 'buy' ? TOKENS[0] /* SOL */ : null), [fromQuery, action])
  const toToken   = useMemo(() => resolveToken(toQuery,   action === 'sell' ? TOKENS[1] /* USDC */ : null), [toQuery, action])

  // For Buy/Sell we lock one side
  const effectiveFrom = action === 'buy'  ? TOKENS[0] : action === 'sell' ? toToken : fromToken
  const effectiveTo   = action === 'buy'  ? toToken   : action === 'sell' ? TOKENS[1] : toToken

  const amountSol = (potBalanceSol * amountPct) / 100
  const amountUsd = solPrice ? amountSol * solPrice : null

  const canSubmit = !!effectiveFrom && !!effectiveTo && effectiveFrom.mint !== effectiveTo.mint && amountPct > 0

  function describe(): string {
    if (!effectiveFrom || !effectiveTo) return ''
    const base = `${action === 'trigger' ? 'Conditional swap' : 'Swap'} ${amountPct}% of vault — ${effectiveFrom.symbol} → ${effectiveTo.symbol}`
    return action === 'trigger' && triggerPriceUsd ? `${base} (when ${effectiveFrom.symbol} crosses $${triggerPriceUsd})` : base
  }

  function handleSubmit() {
    if (!canSubmit || !effectiveFrom || !effectiveTo) return
    onSubmit?.({
      action,
      fromMint: effectiveFrom.mint,
      toMint: effectiveFrom.mint === effectiveTo.mint ? '' : effectiveTo.mint,
      amountPct,
      triggerPriceUsd: action === 'trigger' && typeof triggerPriceUsd === 'number' ? triggerPriceUsd : undefined,
      description: describe(),
    })
  }

  return (
    <div className="space-y-4 w-full">
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <h3 className="font-bold text-white">⚙️ Strategy proposal builder</h3>
        <p className="text-sm text-pot-muted mt-1">
          Pick an action and a token, set the size, submit as a governance proposal.
          Members vote, the swap fires through Jupiter on a passed proposal.
        </p>
      </div>

      {/* Action selector */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <div className="text-xs uppercase tracking-wide text-pot-muted mb-2">Action</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { id: 'buy',     label: 'Buy',          desc: 'SOL → token' },
            { id: 'sell',    label: 'Sell',         desc: 'token → USDC' },
            { id: 'swap',    label: 'Swap A → B',   desc: 'any pair' },
            { id: 'trigger', label: 'Price trigger', desc: 'fires at price' },
          ] as { id: Action; label: string; desc: string }[]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setAction(opt.id)}
              className={`p-3 rounded-xl border text-left transition ${
                action === opt.id
                  ? 'border-pot-accent/50 bg-pot-accent/10'
                  : 'border-pot-border bg-pot-dark/40 hover:border-pot-muted'
              }`}
            >
              <div className="text-sm font-bold text-white">{opt.label}</div>
              <div className="text-[11px] text-pot-muted mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Token search */}
      {action !== 'buy' && (
        <TokenSearch label="From token" query={fromQuery} setQuery={setFromQuery} />
      )}
      {action !== 'sell' && (
        <TokenSearch label="To token" query={toQuery} setQuery={setToQuery} />
      )}

      {/* Amount */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <div className="text-xs uppercase tracking-wide text-pot-muted">Amount</div>
          <div className="text-right text-sm">
            <span className="text-white font-bold">{amountPct}%</span>
            <span className="text-pot-muted"> of vault · ≈ {amountSol.toFixed(2)} SOL</span>
            {amountUsd != null && <span className="text-pot-muted"> · ${amountUsd.toFixed(0)}</span>}
          </div>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={amountPct}
          onChange={(e) => setAmountPct(Number(e.target.value))}
          className="w-full accent-pot-accent"
          aria-label="Amount as % of vault"
        />
        <div className="grid grid-cols-5 gap-2 mt-3">
          {[5, 10, 25, 50, 100].map((p) => (
            <button
              key={p}
              onClick={() => setAmountPct(p)}
              className={`px-2 py-1.5 rounded-lg text-xs border ${
                amountPct === p ? 'border-pot-accent/50 bg-pot-accent/10 text-pot-accent' : 'border-pot-border bg-pot-dark text-pot-muted'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* Trigger price (only when action=trigger) */}
      {action === 'trigger' && (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-pot-muted mb-2">Trigger price (USD)</div>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 120"
            value={triggerPriceUsd}
            onChange={(e) => setTriggerPriceUsd(e.target.value === '' ? '' : Number(e.target.value))}
            className="input"
          />
          <p className="text-[11px] text-pot-muted mt-2">
            The keeper will fire this swap when the {effectiveFrom?.symbol ?? 'source token'} crosses the trigger.
            On-chain Pyth price guard rejects fake triggers.
          </p>
        </div>
      )}

      {/* Preview */}
      {canSubmit && (
        <div className="bg-gradient-to-br from-pot-green/5 to-pot-accent/5 border border-pot-green/30 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-pot-green mb-2">Preview</div>
          <div className="text-sm text-white font-mono break-words">{describe()}</div>
          <div className="text-[11px] text-pot-muted mt-2">
            On submit, this becomes a governance proposal. Quorum and approval are set in the Governance tab.
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3 rounded-2xl bg-pot-green hover:brightness-110 text-pot-dark font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Submit as Proposal →
      </button>

      {/* Advanced disclosure */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="font-bold text-white">Advanced</span>
          <span className="text-pot-muted text-sm">{showAdvanced ? '▾' : '▸'}</span>
        </button>
        {showAdvanced && (
          <div className="mt-3 mb-2">
            <StatusBadge tier="phase-2" />
            <span className="ml-2 text-[11px] text-pot-muted">All advanced strategies ship in Phase 2 (Q3 2026).</span>
          </div>
        )}
        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {([
              { id: 'sl',  title: 'Stop-loss',     desc: 'Auto-sell when price drops X%.' },
              { id: 'tp',  title: 'Take-profit',   desc: 'Auto-sell when price rises X%.' },
              { id: 'tr',  title: 'Trailing-stop', desc: 'Stop that follows price up.' },
              { id: 'dca', title: 'DCA schedule',  desc: 'Recurring buy/sell on interval.' },
            ] as const).map((it) => (
              <div key={it.id} className="p-3 rounded-xl border border-pot-border bg-pot-dark/40">
                <div className="font-semibold text-white">{it.title}</div>
                <div className="text-xs text-pot-muted mt-0.5">{it.desc}</div>
                <div className="text-[10px] text-pot-muted/70 mt-1">Coming after submission — uses the same proposal flow.</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function resolveToken(query: string, fallback: KnownToken | null): KnownToken | null {
  const q = query.trim()
  if (!q) return fallback
  if (isLikelyAddress(q)) return { symbol: q.slice(0, 4) + '…', name: 'Custom token', mint: q }
  const hit = TOKENS.find((t) => t.symbol.toLowerCase() === q.toLowerCase() || t.name.toLowerCase().includes(q.toLowerCase()))
  return hit ?? fallback
}

function TokenSearch({ label, query, setQuery }: { label: string; query: string; setQuery: (v: string) => void }) {
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TOKENS.slice(0, 3)
    if (isLikelyAddress(query)) return [] // user pasted a CA
    return TOKENS.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wide text-pot-muted mb-2">{label}</div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ticker (SOL, USDC, JUP) or paste contract address"
        className="input"
      />
      {matches.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {matches.map((t) => (
            <button
              key={t.mint}
              onClick={() => setQuery(t.symbol)}
              className="px-3 py-1.5 rounded-lg border border-pot-border bg-pot-dark text-xs text-white hover:border-pot-accent/40 transition"
            >
              <span className="font-bold">{t.symbol}</span>
              <span className="text-pot-muted ml-1.5">{t.name}</span>
            </button>
          ))}
        </div>
      )}
      {isLikelyAddress(query) && (
        <p className="text-[11px] text-pot-green mt-2">✓ Custom contract address — proposal will use this mint.</p>
      )}
    </div>
  )
}
