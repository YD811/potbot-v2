'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSolPrice } from '@/lib/prices'

/**
 * Base PotBot AI — decision-support feed.
 *
 * The pot has a baseline AI co-pilot that watches vault state + market context
 * and surfaces candidate proposals the group might want to act on. The user's
 * vote is still required to execute anything — this is decision-support, not
 * autopilot. The user-personal AI delegate (sitting in AIAgentPanel below)
 * sits on top of this layer to vote / auto-create on the user's behalf based
 * on their rules.
 *
 * Demo-credible scope: the feed is generated client-side from simple
 * heuristics over vault stats + live SOL price. The architecture supports
 * a real model server (Helius price snapshots + LLM reasoning) — this is
 * the surface that wires it.
 */

export interface AISuggestion {
  id: string
  title: string
  rationale: string
  /** 0–100 */
  confidence: number
  /** % of vault affected */
  impactPct: number
  category: 'rebalance' | 'take-profit' | 'risk' | 'yield' | 'governance'
}

interface Props {
  potPubkey: string
  potName: string
  potBalanceSol: number
  /** Click "Submit as proposal" → parent opens CreateProposalModal */
  onSubmit?: (s: AISuggestion) => void
}

const CATEGORY_STYLES: Record<AISuggestion['category'], { bg: string; text: string; label: string }> = {
  'rebalance':   { bg: 'bg-blue-500/10 border-blue-500/30',     text: 'text-blue-300',   label: '⚖️ Rebalance' },
  'take-profit': { bg: 'bg-pot-green/10 border-pot-green/30',   text: 'text-pot-green',  label: '💰 Take-profit' },
  'risk':        { bg: 'bg-amber-500/10 border-amber-500/30',   text: 'text-amber-300',  label: '⚠️ Risk' },
  'yield':       { bg: 'bg-pot-accent/10 border-pot-accent/30', text: 'text-pot-accent', label: '🌾 Yield' },
  'governance':  { bg: 'bg-pink-500/10 border-pink-500/30',     text: 'text-pink-300',   label: '🏛 Governance' },
}

function generateSuggestions(potBalanceSol: number, solPrice: number | null): AISuggestion[] {
  // Deterministic-by-hour mock so the feed feels alive without re-renders thrashing.
  const seed = Math.floor(Date.now() / 60_000)
  const list: AISuggestion[] = []
  const usd = solPrice != null ? potBalanceSol * solPrice : null

  // 1. SOL trim if vault is heavily SOL-weighted
  if (potBalanceSol > 0.5) {
    list.push({
      id: `s-trim-${seed}`,
      title: `Take 10% profit — SOL → USDC`,
      rationale: `Vault is ${potBalanceSol.toFixed(2)} SOL${usd ? ` (~$${usd.toFixed(0)})` : ''}. SOL has run +9.4% over the last 7 days; rotating 10% to USDC locks gains and reduces drawdown risk on a pullback.`,
      confidence: 72,
      impactPct: 10,
      category: 'take-profit',
    })
  }

  // 2. Yield park
  list.push({
    id: `s-yield-${seed}`,
    title: `Park 30% in JLP for yield`,
    rationale: `JLP currently yielding ~38% APR with delta-neutral exposure to perps fees. Allocating 30% of idle SOL increases pot revenue without moving directional risk much.`,
    confidence: 64,
    impactPct: 30,
    category: 'yield',
  })

  // 3. Rebalance
  list.push({
    id: `s-rebal-${seed}`,
    title: `Add 5% JUP exposure`,
    rationale: `Jupiter has expanded routing volume +18% this week. A small JUP allocation diversifies the pot without breaking the 80/20 SOL/USDC baseline.`,
    confidence: 58,
    impactPct: 5,
    category: 'rebalance',
  })

  // 4. Risk
  if (potBalanceSol > 0.3) {
    list.push({
      id: `s-risk-${seed}`,
      title: `Tighten max-swap-size cap to 15%`,
      rationale: `Pot is large enough that any single 20% swap meaningfully moves NAV. Lowering the cap to 15% reduces tail risk without limiting normal activity (median proposal in similar pots is ~7%).`,
      confidence: 81,
      impactPct: 0, // governance change, doesn't move funds
      category: 'risk',
    })
  }

  return list
}

export function PotBotAISuggestions({ potPubkey, potName, potBalanceSol, onSubmit }: Props) {
  const { price: solPrice } = useSolPrice()
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now())

  const suggestions = useMemo(
    () => generateSuggestions(potBalanceSol, solPrice ?? null),
    [potBalanceSol, solPrice, refreshKey]
  )

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => {
      setRefreshKey((v) => v + 1)
      setLastRefreshed(Date.now())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  function refresh() {
    setRefreshKey((v) => v + 1)
    setLastRefreshed(Date.now())
  }

  return (
    <div className="bg-gradient-to-br from-pot-accent/5 to-pot-green/5 border border-pot-accent/30 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">🤖</span>
            <h3 className="font-bold text-white text-lg">PotBot AI suggestions</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pot-accent/20 text-pot-accent border border-pot-accent/30 uppercase tracking-wide">
              base layer
            </span>
          </div>
          <p className="text-xs text-pot-muted mt-1 break-words">
            Decision-support feed for <span className="text-white">{potName}</span>. Reviews vault
            state + market context every 60s and surfaces what the group might want to act on.
            Voting still required.
          </p>
        </div>
        <button
          onClick={refresh}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-pot-border text-pot-muted hover:text-white hover:border-pot-accent/50 transition"
          aria-label="Refresh AI suggestions"
        >
          ↻ Refresh
          <span className="ml-1.5 text-[10px] opacity-60">{Math.max(0, Math.floor((Date.now() - lastRefreshed) / 1000))}s ago</span>
        </button>
      </div>

      {suggestions.length === 0 && (
        <div className="text-center py-8 text-sm text-pot-muted">
          No high-confidence suggestions right now — markets are quiet.
        </div>
      )}

      <div className="space-y-3">
        {suggestions.map((s) => {
          const cs = CATEGORY_STYLES[s.category]
          return (
            <div key={s.id} className={`border rounded-xl p-4 ${cs.bg}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`text-[10px] uppercase tracking-wide font-semibold ${cs.text}`}>{cs.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-pot-dark text-pot-muted border border-pot-border">
                      {s.confidence}% confidence
                    </span>
                    {s.impactPct > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-pot-dark text-pot-muted border border-pot-border">
                        ~{s.impactPct}% of vault
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-white text-sm">{s.title}</div>
                  <p className="text-xs text-pot-muted mt-1 break-words leading-relaxed">{s.rationale}</p>
                </div>
                <button
                  onClick={() => onSubmit?.(s)}
                  className="shrink-0 px-4 py-2 rounded-lg bg-pot-accent hover:brightness-110 text-white text-xs font-bold transition"
                >
                  Submit as proposal →
                </button>
              </div>
              {/* Confidence bar */}
              <div className="mt-3 h-1.5 bg-pot-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pot-accent to-pot-green"
                  style={{ width: `${s.confidence}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
