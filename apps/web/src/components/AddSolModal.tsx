'use client'

import { useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import toast from 'react-hot-toast'

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'

interface Props {
  /** Wallet address to fund (Privy embedded wallet OR adapter pubkey). */
  address: string
  open: boolean
  onClose: () => void
}

/**
 * "Add SOL" modal shown from the dashboard. Three ways to fund the
 * active wallet:
 *   1. Copy your address — for sending from any external wallet.
 *   2. Devnet airdrop — only when the cluster is devnet, hits the RPC
 *      faucet directly.
 *   3. External faucet link — the public Solana faucet, for users
 *      whose RPC blocks airdrop or who want a bigger drop.
 *
 * Mainnet flow (MoonPay / cards) is intentionally left as a follow-up;
 * we can drop it in once the integration ships.
 */
export function AddSolModal({ address, open, onClose }: Props) {
  const { connection } = useConnection()
  const [airdropping, setAirdropping] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!open) return null

  function copyAddress() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    }).catch(() => toast.error('Could not copy'))
  }

  async function airdrop() {
    if (CLUSTER !== 'devnet') return
    setAirdropping(true)
    try {
      const pk = new PublicKey(address)
      const sig = await connection.requestAirdrop(pk, 1 * LAMPORTS_PER_SOL)
      toast.loading('Airdrop sent — confirming…', { id: 'airdrop' })
      await connection.confirmTransaction(sig, 'confirmed')
      toast.success('1 SOL airdropped to your wallet', { id: 'airdrop' })
    } catch (e: any) {
      toast.error(`Airdrop failed: ${e?.message ?? 'rate limited'}`, { id: 'airdrop' })
    } finally {
      setAirdropping(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-pot-card border border-pot-border p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Add SOL to your wallet</h2>
            <p className="text-xs text-pot-muted mt-1">
              {CLUSTER === 'devnet'
                ? 'Test mode — use the airdrop button or paste your address into a faucet.'
                : 'Send SOL to the address below from any wallet.'}
            </p>
          </div>
          <button onClick={onClose} className="text-pot-muted hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Wallet address with copy */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-pot-muted font-bold mb-1.5">
            Your wallet address
          </div>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-pot-dark border border-pot-border font-mono text-xs text-white break-all">
              {address}
            </div>
            <button
              onClick={copyAddress}
              className="shrink-0 px-3 rounded-lg bg-pot-green hover:bg-pot-green/90 text-pot-dark text-xs font-bold transition"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Devnet airdrop */}
        {CLUSTER === 'devnet' && (
          <div className="rounded-xl border border-pot-border p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Devnet airdrop</div>
                <div className="text-[11px] text-pot-muted">Free 1 SOL straight to your wallet.</div>
              </div>
              <button
                onClick={airdrop}
                disabled={airdropping}
                className="px-4 py-2 rounded-lg bg-pot-accent hover:bg-pot-accent/90 text-white text-sm font-bold transition disabled:opacity-50"
              >
                {airdropping ? 'Sending…' : '+ 1 SOL'}
              </button>
            </div>
            <a
              href={`https://faucet.solana.com/?address=${address}`}
              target="_blank"
              rel="noreferrer"
              className="block text-[11px] text-pot-accent hover:underline"
            >
              RPC airdrop limited? Use the public Solana faucet ↗
            </a>
          </div>
        )}

        {CLUSTER === 'mainnet-beta' && (
          <div className="rounded-xl border border-pot-border p-4 text-xs text-pot-muted">
            Buy with card / on-ramp coming soon. Until then, send SOL from any
            exchange or wallet to the address above.
          </div>
        )}
      </div>
    </div>
  )
}
