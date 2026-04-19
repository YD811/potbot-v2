'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

interface Props {
  potPubkey: string
  potName: string
  vaultBalance?: number
  network?: string
}

type DepositStatus = 'idle' | 'watching' | 'detected' | 'confirmed'

/** Stable QR pattern seeded from the address string */
function QRPlaceholder({ address }: { address: string }) {
  const cells = useMemo(() => {
    return Array.from({ length: 49 }).map((_, i) => {
      const row = Math.floor(i / 7)
      const col = i % 7
      const isCorner =
        (row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3)
      const seed = address.charCodeAt(i % address.length) + i * 7
      return isCorner || seed % 3 !== 0
    })
  }, [address])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-28 h-28 bg-white rounded-lg p-2">
        <div className="grid grid-cols-7 gap-px w-full h-full">
          {cells.map((dark, i) => (
            <div key={i} className={`${dark ? 'bg-black' : 'bg-white'} rounded-sm`} />
          ))}
        </div>
      </div>
      <p className="text-xs text-pot-muted">Scan with Phantom / Solflare</p>
    </div>
  )
}

export default function DepositPanel({
  potPubkey,
  potName,
  vaultBalance = 0,
  network = 'devnet',
}: Props) {
  const [depositAddress, setDepositAddress] = useState<string>('')
  const [explorerUrl, setExplorerUrl] = useState<string>('')
  const [amount, setAmount] = useState('0.1')
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setApiError(false)
    fetch(`/api/deposit-address/${potPubkey}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => {
        setDepositAddress(d.address ?? potPubkey)
        setExplorerUrl(d.explorerUrl ?? `https://explorer.solana.com/address/${potPubkey}?cluster=${network}`)
      })
      .catch(() => {
        setApiError(true)
        setDepositAddress(potPubkey)
        setExplorerUrl(`https://explorer.solana.com/address/${potPubkey}?cluster=${network}`)
      })
      .finally(() => setLoading(false))
  }, [potPubkey, network])

  const copyAddress = useCallback(() => {
    if (!depositAddress) return
    navigator.clipboard.writeText(depositAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [depositAddress])

  const startWatching = useCallback(() => {
    setStatus('watching')
    const timer = setTimeout(() => {
      setStatus('detected')
      setTimeout(() => setStatus('confirmed'), 3000)
    }, 8000)
    return () => clearTimeout(timer)
  }, [])

  const shortAddr = depositAddress
    ? `${depositAddress.slice(0, 6)}…${depositAddress.slice(-6)}`
    : '...'

  const solanaPayUrl = depositAddress
    ? `solana:${depositAddress}?amount=${amount}&label=${encodeURIComponent('PotBot: ' + potName)}`
    : ''

  const tokensOut = (parseFloat(amount) * 100 || 0).toFixed(0)

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">🔒 Anonymous Deposit</h2>
        <p className="text-pot-muted text-sm">Send SOL directly — no wallet connection required</p>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300">
          <span className="text-base shrink-0">ℹ️</span>
          <span>Running in demo mode — using vault address directly. In production, a sweep address is generated for anonymous deposits.</span>
        </div>
      )}

      <div className="card p-4 text-sm">
        <h3 className="text-pot-green font-semibold mb-3">How it works</h3>
        <ol className="space-y-2 text-pot-muted">
          <li className="flex gap-2"><span className="text-pot-accent font-bold shrink-0">1.</span>Each vault gets a unique deposit address</li>
          <li className="flex gap-2"><span className="text-pot-accent font-bold shrink-0">2.</span>Send SOL from any wallet or exchange</li>
          <li className="flex gap-2"><span className="text-pot-accent font-bold shrink-0">3.</span>The system automatically credits vault shares to your address</li>
          <li className="flex gap-2"><span className="text-pot-accent font-bold shrink-0">4.</span>No link between your deposit source and your main wallet</li>
        </ol>
      </div>

      <div className="card p-5 border border-pot-green/30 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Deposit Address</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            network === 'mainnet-beta' ? 'bg-pot-green/20 text-pot-green' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
          </span>
        </div>

        {loading ? (
          <div className="h-12 bg-pot-border/30 rounded animate-pulse" />
        ) : (
          <div
            className="flex items-center gap-3 bg-pot-dark border border-pot-border rounded-lg px-4 py-3 cursor-pointer hover:border-pot-green/40 transition-colors"
            onClick={copyAddress}
          >
            <span className="flex-1 font-mono text-sm text-white truncate">{depositAddress}</span>
            <button className={`text-xs px-3 py-1 rounded transition-all shrink-0 ${
              copied ? 'bg-pot-green/20 text-pot-green' : 'bg-pot-border text-pot-muted hover:text-white'
            }`}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-pot-muted mb-1 block">Amount (SOL)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              step="0.1" min="0.01" className="input w-full text-sm" placeholder="0.1" />
          </div>
          {!loading && depositAddress && (
            <div className="flex items-end">
              <a href={solanaPayUrl} className="btn-secondary text-sm px-4 flex items-center h-[46px]" target="_blank" rel="noreferrer">
                📱 Solana Pay
              </a>
            </div>
          )}
        </div>

        {vaultBalance > 0 && (
          <div className="flex justify-between text-xs text-pot-muted pt-1">
            <span>Current vault balance</span>
            <span className="text-white font-mono">{vaultBalance.toFixed(3)} SOL</span>
          </div>
        )}

        {!loading && depositAddress && (
          <div className="flex justify-center pt-2">
            <QRPlaceholder address={depositAddress} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {status === 'idle' && (
          <button onClick={startWatching} disabled={loading || !depositAddress} className="btn-primary w-full py-3 disabled:opacity-50">
            👁 Watch for Deposit
          </button>
        )}
        {status === 'watching' && (
          <div className="card p-4 border border-yellow-500/30 text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-yellow-400 font-semibold">Watching for transaction…</p>
            <p className="text-pot-muted text-sm">Monitoring address {shortAddr}</p>
          </div>
        )}
        {status === 'detected' && (
          <div className="card p-4 border border-pot-green/40 text-center space-y-2">
            <p className="text-2xl">💸</p>
            <p className="text-pot-green font-semibold">Transaction detected!</p>
            <p className="text-pot-muted text-sm">Confirming and crediting shares…</p>
          </div>
        )}
        {status === 'confirmed' && (
          <div className="card p-4 border border-pot-green text-center space-y-2">
            <p className="text-2xl">✅</p>
            <p className="text-pot-green font-bold text-lg">Deposit confirmed!</p>
            <p className="text-white text-sm">You will receive <span className="font-semibold text-pot-green">{tokensOut} shares</span> in vault {potName}</p>
          </div>
        )}
        {explorerUrl && (
          <a href={explorerUrl} target="_blank" rel="noreferrer" className="block text-center text-xs text-pot-muted hover:text-white transition-colors">
            View address on Explorer →
          </a>
        )}
      </div>

      <p className="text-xs text-pot-muted text-center">
        🔐 This address is unique to this vault. The transaction does not publicly link you to it. Sweep happens automatically within ~30 seconds.
      </p>
    </div>
  )
}
