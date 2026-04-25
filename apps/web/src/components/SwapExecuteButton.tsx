'use client'

import { useState, useEffect, useMemo } from 'react'
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { getVaultAddress } from '@potbot/sdk'
import { getDecimals } from '@/lib/jupiter-swap'
import { createPotbotClient } from '@/lib/potbot-client'

export interface SwapMeta {
  inputMint: string
  outputMint: string
  amountLamports: number
  inputSymbol?: string
  outputSymbol?: string
}

interface Props {
  proposalPubkey: string
  potAddress: string
  /** If provided, skip API lookup */
  swapMeta?: SwapMeta
  onSuccess?: (txSig: string) => void
}

const SOLSCAN        = (sig: string) => `https://solscan.io/tx/${sig}`
const DEVNET_SOLSCAN = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`

export default function SwapExecuteButton({ proposalPubkey, potAddress, swapMeta: propsMeta, onSuccess }: Props) {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const anchorWallet = useAnchorWallet()

  const [meta,    setMeta]    = useState<SwapMeta | null>(propsMeta ?? null)
  const [status,  setStatus]  = useState<'idle' | 'quoting' | 'signing' | 'sending' | 'done' | 'error'>('idle')
  const [txSig,   setTxSig]   = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [preview, setPreview] = useState<{ route: string; outAmount: string; priceImpact: string } | null>(null)

  const mockModeEnabled = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'
  const potbotClient = useMemo(() => {
    if (!anchorWallet) return null
    return createPotbotClient(connection, anchorWallet)
  }, [connection, anchorWallet])

  // Load swap meta from server (replaces localStorage)
  useEffect(() => {
    if (propsMeta) return
    fetch(`/api/proposals/${proposalPubkey}/meta`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setMeta(data) })
      .catch(() => {})
  }, [proposalPubkey, propsMeta])

  if (!meta) return null

  const inDecimals = getDecimals(meta.inputMint)
  const outDecimals = getDecimals(meta.outputMint)
  const inUi = meta.amountLamports / Math.pow(10, inDecimals)

  async function handleExecute() {
    if (!publicKey) {
      setError('Connect wallet to execute')
      return
    }

    setError(null)

    try {
      if (mockModeEnabled) {
        if (!signTransaction) {
          setError('Wallet does not support signing transactions')
          return
        }

        setStatus('quoting')

        // Existing mock/Jupiter path
        const res = await fetch(`/api/proposals/${proposalPubkey}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputMint:       meta.inputMint,
            outputMint:      meta.outputMint,
            amountLamports:  meta.amountLamports,
            slippageBps:     50,
            signerPublicKey: publicKey.toBase58(),
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.swapTransaction) {
          throw new Error(data.error ?? 'Failed to build swap transaction')
        }

        setPreview({
          route:       data.route,
          outAmount:   (Number(data.outAmount) / Math.pow(10, outDecimals)).toFixed(4),
          priceImpact: (parseFloat(data.priceImpactPct) * 100).toFixed(3),
        })

        setStatus('signing')
        const { VersionedTransaction } = await import('@solana/web3.js')
        const txBytes = Buffer.from(data.swapTransaction, 'base64')
        const tx = VersionedTransaction.deserialize(txBytes)
        const signedTx = await signTransaction(tx)

        setStatus('sending')
        const rawTx = signedTx.serialize()
        const sig = await connection.sendRawTransaction(rawTx, {
          skipPreflight:        false,
          preflightCommitment:  'confirmed',
          maxRetries:           3,
        })

        const lbh = await connection.getLatestBlockhash()
        await connection.confirmTransaction({ signature: sig, ...lbh }, 'confirmed')

        setTxSig(sig)
        setStatus('done')
        onSuccess?.(sig)
      } else {
        if (!potbotClient) {
          setError('Anchor wallet unavailable for on-chain call')
          return
        }
        if (!connection.rpcEndpoint.includes('devnet')) {
          throw new Error('Only devnet is supported for execute_swap')
        }

        setStatus('sending')

        const potPk = new PublicKey(potAddress)
        const [vaultPk] = getVaultAddress(potPk)

        const sig = await potbotClient.executeSwap(
          {
            fromMint: new PublicKey(meta.inputMint),
            toMint: new PublicKey(meta.outputMint),
            amountIn: new BN(meta.amountLamports),
            minAmountOut: new BN(0),
          },
          {
            pot: potPk,
            vault: vaultPk,
            authority: publicKey,
          },
        )

        setTxSig(sig)
        setStatus('done')
        onSuccess?.(sig)
      }

      fetch(`/api/proposals/${proposalPubkey}/meta`, { method: 'DELETE' }).catch(() => {})
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('Swap execute error:', e)
      setError(message)
      setStatus('error')
    }
  }

  if (status === 'done' && txSig) {
    const isDevnet = connection.rpcEndpoint.includes('devnet') || connection.rpcEndpoint.includes('localhost')
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-pot-green text-sm font-bold">
          <span>✅ Swap executed!</span>
        </div>
        <a
          href={isDevnet ? DEVNET_SOLSCAN(txSig) : SOLSCAN(txSig)}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-pot-accent hover:text-pot-accent/80 underline break-all"
        >
          View on Solscan →
        </a>
      </div>
    )
  }

  const BUTTON_LABELS: Record<typeof status, string> = {
    idle:    `⚡ Execute: ${inUi.toFixed(3)} ${meta.inputSymbol ?? 'SOL'} → ${meta.outputSymbol ?? '?'}`,
    quoting: '🔍 Getting quote...',
    signing: '✍️ Sign in wallet...',
    sending: mockModeEnabled ? '📡 Sending...' : '⛓️ Calling execute_swap...',
    done:    '✅ Done!',
    error:   '⚡ Retry Execute',
  }

  return (
    <div className="space-y-2">
      {preview && status === 'idle' && (
        <div className="text-xs text-pot-muted bg-pot-dark rounded-lg px-3 py-2">
          <span className="text-white">~{preview.outAmount} {meta.outputSymbol ?? '?'}</span>
          {' '}via {preview.route}
          {' · '}
          <span className={parseFloat(preview.priceImpact) > 1 ? 'text-orange-400' : 'text-pot-muted'}>
            {preview.priceImpact}% impact
          </span>
        </div>
      )}
      <button
        onClick={handleExecute}
        disabled={status === 'quoting' || status === 'signing' || status === 'sending'}
        className="w-full py-2 rounded-xl text-sm font-bold bg-pot-accent hover:bg-pot-accent/90 text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {(status === 'quoting' || status === 'signing' || status === 'sending') && (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {BUTTON_LABELS[status]}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1 break-all">{error}</p>
      )}
    </div>
  )
}
