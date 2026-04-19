'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMockStore } from '@/lib/mock-store'

// Token list for limit orders
const TOKENS = [
  { symbol: 'SOL',     mint: 'So11111111111111111111111111111111111111112',     icon: '◎',  decimals: 9  },
  { symbol: 'USDC',    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', icon: '$',  decimals: 6  },
  { symbol: 'BONK',    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  icon: '🐶', decimals: 5  },
  { symbol: 'JitoSOL', mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',  icon: '🟢', decimals: 9  },
  { symbol: 'mSOL',    mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',   icon: '🌊', decimals: 9  },
  { symbol: 'WIF',     mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  icon: '🐕', decimals: 6  },
]

const EXPIRY_OPTIONS = [
  { label: '1 hour',  value: 3_600    },
  { label: '6 hours', value: 21_600   },
  { label: '24 hours',value: 86_400   },
  { label: '7 days',  value: 604_800  },
]

// Mock current prices (replaced by Jupiter Price API in production)
const MOCK_PRICES: Record<string, number> = {
  'So11111111111111111111111111111111111111112':     148.50,
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.00,
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263':  0.0000182,
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn':  158.20,
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So':   155.80,
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm':  0.0021,
}

type OrderStatus = 'open' | 'filled' | 'cancelled' | 'expired'

interface LimitOrder {
  id:         string
  fromSymbol: string
  toSymbol:   string
  fromMint:   string
  toMint:     string
  amount:     number
  limitPrice: number
  expiry:     number     // Unix seconds
  status:     OrderStatus
  proposalId?: number
  createdAt:  number
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  open:      'bg-pot-accent/20 text-pot-accent',
  filled:    'bg-pot-green/20 text-pot-green',
  cancelled: 'bg-red-500/20 text-red-400',
  expired:   'bg-pot-muted/20 text-pot-muted',
}
const STATUS_LABEL: Record<OrderStatus, string> = {
  open:      '🔵 Open',
  filled:    '✅ Filled',
  cancelled: '❌ Cancelled',
  expired:   '⏰ Expired',
}

export function LimitOrderPanel({ potPubkey }: { potPubkey: string }) {
  const { publicKey } = useWallet()
  const store = useMockStore()
  const pot   = (store.pots as any[]).find(p => p.pubkey === potPubkey)

  const [fromIdx, setFromIdx] = useState(0)   // SOL
  const [toIdx,   setToIdx]   = useState(1)   // USDC
  const [amount,  setAmount]  = useState('')
  const [limit,   setLimit]   = useState('')
  const [expiry,  setExpiry]  = useState(86_400)
  const [orders,  setOrders]  = useState<LimitOrder[]>([])
  const [confirm, setConfirm] = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [toast,   setToast]   = useState<string | null>(null)

  const fromToken = TOKENS[fromIdx]
  const toToken   = TOKENS[toIdx]
  const currentPrice = MOCK_PRICES[fromToken.mint] ?? 0

  const maxAmount  = pot?.balance ?? 0

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const setAmountPct = (pct: number) => {
    setAmount((maxAmount * pct / 100).toFixed(4))
  }

  const estimatedOut = amount && limit
    ? (parseFloat(amount) * parseFloat(limit)).toFixed(6)
    : '—'

  const priceDiffPct = currentPrice > 0 && limit
    ? (((parseFloat(limit) - currentPrice) / currentPrice) * 100)
    : 0

  const handlePropose = async () => {
    if (!amount || !limit || parseFloat(amount) <= 0 || parseFloat(limit) <= 0) return
    setBusy(true)
    try {
      // In production: calls createProposal via Anchor SDK
      // Description encodes limit order params
      const proposalDesc = `[LIMIT ORDER] Sell ${amount} ${fromToken.symbol} at $${limit} → ${toToken.symbol} (expires in ${EXPIRY_OPTIONS.find(e => e.value === expiry)?.label})`

      // Add to local orders list (mock)
      const order: LimitOrder = {
        id:         crypto.randomUUID(),
        fromSymbol: fromToken.symbol,
        toSymbol:   toToken.symbol,
        fromMint:   fromToken.mint,
        toMint:     toToken.mint,
        amount:     parseFloat(amount),
        limitPrice: parseFloat(limit),
        expiry:     Math.floor(Date.now() / 1000) + expiry,
        status:     'open',
        proposalId: (pot?.nextProposalId ?? 0) + orders.length,
        createdAt:  Date.now(),
      }
      setOrders(prev => [order, ...prev])
      setAmount('')
      setLimit('')
      setConfirm(false)
      showToast('✅ Limit order proposal submitted!')
    } finally {
      setBusy(false)
    }
  }

  const cancelOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
  }

  if (!publicKey) {
    return (
      <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-white font-semibold">Connect wallet to place limit orders</p>
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
          <h2 className="text-xl font-bold text-white">📋 Limit Orders</h2>
          <p className="text-sm text-pot-muted mt-1">
            Propose a limit order — executes via Jupiter Trigger when price is hit
          </p>
        </div>
        <span className="px-3 py-1 bg-pot-green/10 text-pot-green border border-pot-green/30 rounded-full text-xs font-bold">
          ⚡ Jupiter Trigger
        </span>
      </div>

      {/* Create Order Card */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-semibold">New Limit Order</h3>

        {/* Token pair */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-pot-muted mb-1 block">Sell token</label>
            <select
              value={fromIdx}
              onChange={e => setFromIdx(Number(e.target.value))}
              className="input w-full text-sm"
            >
              {TOKENS.map((t, i) => (
                <option key={t.mint} value={i} disabled={i === toIdx}>
                  {t.icon} {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-pot-muted mb-1 block">Buy token</label>
            <select
              value={toIdx}
              onChange={e => setToIdx(Number(e.target.value))}
              className="input w-full text-sm"
            >
              {TOKENS.map((t, i) => (
                <option key={t.mint} value={i} disabled={i === fromIdx}>
                  {t.icon} {t.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-pot-muted mb-1 block">
            Amount ({fromToken.symbol})
            <span className="ml-2 text-pot-green">Vault: {maxAmount.toFixed(4)} SOL available</span>
          </label>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input w-full"
            min="0"
            step="0.001"
          />
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map(pct => (
              <button
                key={pct}
                onClick={() => setAmountPct(pct)}
                className="flex-1 py-1 text-xs rounded-lg bg-pot-border hover:bg-pot-accent/20 text-pot-muted hover:text-pot-accent transition"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Limit price */}
        <div>
          <label className="text-xs text-pot-muted mb-1 block">
            Limit price (USD per {fromToken.symbol})
            {currentPrice > 0 && (
              <span className="ml-2 text-pot-muted">
                Current: ${currentPrice.toLocaleString()}
              </span>
            )}
          </label>
          <input
            type="number"
            placeholder={currentPrice > 0 ? currentPrice.toFixed(2) : '0.00'}
            value={limit}
            onChange={e => setLimit(e.target.value)}
            className="input w-full"
            min="0"
            step="0.01"
          />
          {limit && currentPrice > 0 && (
            <p className={`text-xs mt-1 ${
              priceDiffPct > 0 ? 'text-pot-green' : 'text-red-400'
            }`}>
              {priceDiffPct > 0 ? '▲' : '▼'}{' '}
              {Math.abs(priceDiffPct).toFixed(2)}% {priceDiffPct > 0 ? 'above' : 'below'} market
            </p>
          )}
        </div>

        {/* Expiry */}
        <div>
          <label className="text-xs text-pot-muted mb-1 block">Order expiry</label>
          <div className="flex gap-2">
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setExpiry(opt.value)}
                className={`flex-1 py-2 text-xs rounded-xl transition font-medium ${
                  expiry === opt.value
                    ? 'bg-pot-accent text-white'
                    : 'bg-pot-border text-pot-muted hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {amount && limit && (
          <div className="bg-pot-dark rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between text-pot-muted">
              <span>You sell</span>
              <span className="text-white font-mono">{amount} {fromToken.symbol}</span>
            </div>
            <div className="flex justify-between text-pot-muted">
              <span>You receive (est.)</span>
              <span className="text-pot-green font-mono">{estimatedOut} {toToken.symbol}</span>
            </div>
            <div className="flex justify-between text-pot-muted">
              <span>Trigger at</span>
              <span className="text-white font-mono">${parseFloat(limit).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-pot-muted">
              <span>Expires in</span>
              <span className="text-white">{EXPIRY_OPTIONS.find(e => e.value === expiry)?.label}</span>
            </div>
          </div>
        )}

        {/* CTA */}
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            disabled={!amount || !limit || parseFloat(amount) <= 0 || parseFloat(limit) <= 0}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📋 Propose Limit Order
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-pot-muted text-center">
              This will create a governance proposal. Members will vote to approve.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="btn-secondary flex-1"
              >
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

      {/* Active orders */}
      <div>
        <h3 className="text-white font-semibold mb-3">
          Active Orders
          {orders.filter(o => o.status === 'open').length > 0 && (
            <span className="ml-2 text-xs bg-pot-accent/20 text-pot-accent px-2 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'open').length} open
            </span>
          )}
        </h3>

        {orders.length === 0 ? (
          <div className="text-center py-10 bg-pot-card border border-pot-border rounded-2xl">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-pot-muted text-sm">No limit orders yet</p>
            <p className="text-pot-muted text-xs mt-1">
              Orders are executed via Jupiter Trigger when the price target is hit
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-pot-card border border-pot-border rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-white font-semibold text-sm">
                      {order.fromSymbol} → {order.toSymbol}
                    </span>
                    <span className="ml-2 text-xs text-pot-muted">
                      #{order.proposalId}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-pot-muted">Amount</div>
                    <div className="text-white font-mono">{order.amount} {order.fromSymbol}</div>
                  </div>
                  <div>
                    <div className="text-pot-muted">Limit price</div>
                    <div className="text-white font-mono">${order.limitPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-pot-muted">Expires</div>
                    <div className="text-white">
                      {new Date(order.expiry * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {order.status === 'open' && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="mt-3 text-xs text-red-400 hover:text-red-300 transition"
                  >
                    ✕ Cancel order
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
