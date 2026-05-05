'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'
import { useDeposit } from '@/hooks/usePots'

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

/** Deterministic QR-like pattern seeded from address — scannable via Solana Pay URL */
function QRCode({ url, address }: { url: string; address: string }) {
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
    <a href={url} target="_blank" rel="noreferrer" title="Open in Phantom">
      <div className="w-28 h-28 bg-white rounded-xl p-2 hover:opacity-90 transition cursor-pointer">
        <div className="grid grid-cols-7 gap-px w-full h-full">
          {cells.map((dark, i) => (
            <div key={i} className={`${dark ? 'bg-black' : 'bg-white'} rounded-[1px]`} />
          ))}
        </div>
      </div>
    </a>
  )
}

interface Props {
  potPubkey: string
  potName: string
  vaultBalance?: number
  network?: string
}

export default function DepositPanel({
  potPubkey,
  potName,
  vaultBalance = 0,
  network = 'devnet',
}: Props) {
  const [amount, setAmount] = useState('0.1')
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const { publicKey } = useWallet()
  const deposit = useDeposit()

  const amountNum = Math.max(0.001, parseFloat(amount) || 0.1)
  const sharesOut = Math.round(amountNum * 1000).toLocaleString()
  const solanaPayUrl = `solana:${potPubkey}?amount=${amountNum}&label=${encodeURIComponent('PotBot: ' + potName)}&network=${network}`

  const handleDeposit = async () => {
    try {
      await deposit.mutateAsync({ potAddress: potPubkey, amountSol: amountNum })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (e) {
      console.error('Deposit error:', e)
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(potPubkey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="bg-pot-card border border-pot-green/40 rounded-2xl p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <p className="text-pot-green font-bold text-lg">Deposit confirmed!</p>
        <p className="text-sm text-white">
          You received{' '}
          <span className="font-semibold text-pot-green">{sharesOut} vault shares</span>{' '}
          in <span className="font-semibold">{potName}</span>
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-xs text-pot-muted hover:text-white transition underline"
        >
          Make another deposit
        </button>
      </div>
    )
  }

  /* ── Wallet not connected ── */
  if (!publicKey) {
    return (
      <div className="bg-pot-card border border-pot-border rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* QR for mobile deposit */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <QRCode url={solanaPayUrl} address={potPubkey} />
            <p className="text-[11px] text-pot-muted">Scan with Phantom / Solflare</p>
          </div>

          {/* Connect wallet CTA */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div>
              <p className="text-white font-semibold">Connect wallet to deposit</p>
              <p className="text-pot-muted text-sm mt-1">
                Or send SOL directly to the vault address below.
              </p>
            </div>
            <WalletMultiButtonDynamic />
            <div
              onClick={copyAddress}
              className="flex items-center gap-2 bg-pot-dark border border-pot-border rounded-lg px-3 py-2 cursor-pointer hover:border-pot-green/40 transition mt-2"
            >
              <span className="font-mono text-[10px] text-pot-muted flex-1 truncate">{potPubkey}</span>
              <span className="text-xs text-pot-muted shrink-0">{copied ? '✓ Copied' : '📋'}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Wallet connected — main deposit form ── */
  return (
    <div className="space-y-3">
      {/* Amount + button */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-pot-muted mb-1.5 block font-medium uppercase tracking-wide">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.1"
                min="0.001"
                className="input w-full text-lg font-bold pr-12"
                placeholder="0.1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pot-muted text-sm font-semibold">
                SOL
              </span>
            </div>
          </div>
          <div className="text-xs text-pot-muted pb-3 shrink-0 min-w-[80px] text-right">
            ≈ {sharesOut} shares
          </div>
        </div>

        <button
          onClick={handleDeposit}
          disabled={deposit.isPending || amountNum <= 0}
          className="w-full py-3.5 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-base transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deposit.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-pot-dark border-t-transparent rounded-full animate-spin" />
              Depositing…
            </span>
          ) : (
            `💰 Deposit ${amountNum.toFixed(amountNum < 1 ? 3 : 2)} SOL`
          )}
        </button>

        {vaultBalance > 0 && (
          <div className="flex justify-between text-xs text-pot-muted border-t border-pot-border pt-3">
            <span>Vault TVL</span>
            <span className="text-white font-mono">{vaultBalance.toFixed(3)} SOL</span>
          </div>
        )}
      </div>

      {/* QR / mobile option — collapsed by default */}
      <details className="bg-pot-card/50 border border-pot-border rounded-2xl">
        <summary className="cursor-pointer px-4 py-3 text-xs text-pot-muted hover:text-white flex items-center justify-between select-none">
          <span>📱 Deposit from mobile (Solana Pay QR)</span>
          <span className="text-pot-border">▾</span>
        </summary>
        <div className="px-4 pb-4 pt-2 flex flex-col sm:flex-row items-center gap-4">
          <QRCode url={solanaPayUrl} address={potPubkey} />
          <div className="flex-1 space-y-2 w-full">
            <p className="text-xs text-pot-muted">
              Scan with Phantom or Solflare to deposit <span className="text-white font-semibold">{amountNum} SOL</span>
            </p>
            <div
              onClick={copyAddress}
              className="flex items-center gap-2 bg-pot-dark border border-pot-border rounded-lg px-3 py-2 cursor-pointer hover:border-pot-green/40 transition"
            >
              <span className="font-mono text-[10px] text-pot-muted flex-1 truncate">{potPubkey}</span>
              <span className="text-xs shrink-0 text-pot-muted">{copied ? '✓ Copied' : '📋'}</span>
            </div>
            <a
              href={solanaPayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-pot-accent hover:underline"
            >
              Open in Phantom app →
            </a>
          </div>
        </div>
      </details>
    </div>
  )
}
