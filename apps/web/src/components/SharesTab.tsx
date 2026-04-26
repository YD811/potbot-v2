'use client'

import { useMemo } from 'react'
import { useMockStore } from '@/lib/mock-store'

interface Props {
  potPubkey: string
  canWithdraw?: boolean
}

interface ShareData {
  mintAddress: string
  symbol: string
  totalSupply: number
  navPerShare: number
  userBalance: number
  userValueUsd: number
  aum: number
  holders: number
  priceChange24h: number
}

function deriveTokenSymbol(potName: string): string {
  return (
    potName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6) + 'T'
  )
}

export default function SharesTab({ potPubkey, canWithdraw = true }: Props) {
  const { pots, members } = useMockStore()

  const pot = useMemo(() => pots.find((p) => p.pubkey === potPubkey), [pots, potPubkey])
  const myMembership = useMemo(
    () => members.find((m) => m.potPubkey === potPubkey),
    [members, potPubkey]
  )

  const shareData = useMemo<ShareData | null>(() => {
    if (!pot) return null

    const totalSupply = pot.totalShares
    const aum = pot.balance
    const navPerShare = totalSupply > 0 ? aum / totalSupply : 1.0
    const userBalance = myMembership?.shares ?? 0
    const userValueUsd = userBalance * navPerShare * 145

    const fakeMint = potPubkey.slice(0, 4) + 'Mint' + potPubkey.slice(-4)
    const seed = potPubkey.charCodeAt(0) + potPubkey.charCodeAt(1)
    const priceChange24h = ((seed % 20) - 8) * 0.7

    return {
      mintAddress: fakeMint + '1111111111111111111111111111',
      symbol: deriveTokenSymbol(pot.name),
      totalSupply,
      navPerShare,
      userBalance,
      userValueUsd,
      aum,
      holders: pot.memberCount,
      priceChange24h,
    }
  }, [pot, myMembership, potPubkey])

  if (!pot || !shareData) {
    return (
      <div className="text-center py-16 text-pot-muted">
        <p className="text-4xl mb-3">🪙</p>
        <p>Vault not found</p>
      </div>
    )
  }

  const priceUp = shareData.priceChange24h >= 0

  return (
    <div className="space-y-6">
      <div className="card p-5 border border-pot-accent/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-pot-accent/20 flex items-center justify-center text-2xl">
            {pot.emoji ?? '🏦'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">${shareData.symbol}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-pot-accent/20 text-pot-accent">SPL Token</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-pot-green/20 text-pot-green">ETF-Style</span>
            </div>
            <p className="text-pot-muted text-sm">{pot.name} Vault Token</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-white">{shareData.navPerShare.toFixed(4)} SOL</div>
            <div className={`text-sm font-semibold ${priceUp ? 'text-pot-green' : 'text-red-400'}`}>
              {priceUp ? '+' : ''}{shareData.priceChange24h.toFixed(2)}% 24h
            </div>
          </div>
        </div>
        <div className="bg-pot-dark rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-pot-muted">Mint:</span>
          <span className="font-mono text-xs text-white truncate flex-1">{shareData.mintAddress}</span>
          <button onClick={() => navigator.clipboard.writeText(shareData.mintAddress)}
            className="text-xs text-pot-muted hover:text-white transition-colors shrink-0">copy</button>
        </div>
      </div>

      {shareData.userBalance > 0 ? (
        <div className="card p-5 border border-pot-green/30">
          <h3 className="text-white font-semibold mb-4">📊 My Position</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-pot-dark rounded-lg p-3">
              <div className="text-pot-muted text-xs mb-1">Token Balance</div>
              <div className="text-xl font-bold text-pot-green">{shareData.userBalance.toLocaleString()}</div>
              <div className="text-xs text-pot-muted">${shareData.symbol}</div>
            </div>
            <div className="bg-pot-dark rounded-lg p-3">
              <div className="text-pot-muted text-xs mb-1">Value</div>
              <div className="text-xl font-bold text-white">{(shareData.userBalance * shareData.navPerShare).toFixed(3)} SOL</div>
              <div className="text-xs text-pot-muted">≈ ${shareData.userValueUsd.toFixed(0)}</div>
            </div>
            <div className="bg-pot-dark rounded-lg p-3">
              <div className="text-pot-muted text-xs mb-1">Pool Share</div>
              <div className="text-xl font-bold text-pot-accent">
                {shareData.totalSupply > 0 ? ((shareData.userBalance / shareData.totalSupply) * 100).toFixed(2) : '0.00'}%
              </div>
            </div>
            <div className="bg-pot-dark rounded-lg p-3">
              <div className="text-pot-muted text-xs mb-1">NAV per share</div>
              <div className="text-xl font-bold text-white">{shareData.navPerShare.toFixed(4)}</div>
              <div className="text-xs text-pot-muted">SOL</div>
            </div>
          </div>
          <button
            disabled={!canWithdraw}
            title={!canWithdraw ? 'Members only' : undefined}
            className="btn-secondary w-full mt-4 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔥 Redeem Shares
          </button>
        </div>
      ) : (
        <div className="card p-5 border border-pot-border text-center">
          <p className="text-4xl mb-2">🪙</p>
          <p className="text-white font-semibold mb-1">No tokens yet</p>
          <p className="text-pot-muted text-sm mb-4">Make a deposit to receive ${shareData.symbol} proportional to the current NAV</p>
          <button className="btn-primary text-sm px-6 py-2">Go to Deposit</button>
        </div>
      )}

      <div className="card p-5 border border-pot-border">
        <h3 className="text-white font-semibold mb-4">📈 Fund Parameters</h3>
        <div className="space-y-3">
          {[
            { label: 'AUM', value: `${shareData.aum.toFixed(2)} SOL`, sub: `≈ $${(shareData.aum * 145).toFixed(0)}` },
            { label: 'Total Supply', value: `${shareData.totalSupply.toLocaleString()} ${shareData.symbol}`, sub: 'tokens in circulation' },
            { label: 'NAV per share', value: `${shareData.navPerShare.toFixed(6)} SOL`, sub: 'Net Asset Value' },
            { label: 'Holders', value: `${shareData.holders}`, sub: 'members' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-pot-border last:border-0">
              <span className="text-pot-muted text-sm">{label}</span>
              <div className="text-right">
                <div className="text-white text-sm font-semibold">{value}</div>
                <div className="text-pot-muted text-xs">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 border border-pot-border">
        <h3 className="text-pot-green font-semibold mb-3 text-sm">💡 How vault shares work</h3>
        <div className="space-y-2 text-xs text-pot-muted">
          <p>• <span className="text-white">Mint:</span> Deposit SOL → receive ${shareData.symbol} at current NAV</p>
          <p>• <span className="text-white">Burn:</span> Redeem ${shareData.symbol} → receive SOL at current NAV</p>
          <p>• <span className="text-white">NAV</span> = (vault balance) / (total supply) — recalculates on every swap</p>
          <p>• Shares can be traded on DEX — price tracks the vault NAV</p>
          <p>• Like an ETF: owning tokens = owning a proportional slice of all vault assets</p>
        </div>
      </div>
    </div>
  )
}
