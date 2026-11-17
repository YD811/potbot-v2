'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { joinMessage } from '@/lib/bag/recipes'
import { useBagRef } from './useBagRef'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

/**
 * "Join this BAG": a signed message, no transaction and no funds. Once a
 * wallet is connected it also gets its own invite link for this BAG.
 */
export function BagJoin({ slug, creator, initialJoins }: { slug: string; creator: string; initialJoins: number }) {
  const { publicKey, signMessage, connected } = useWallet()
  const wallet = publicKey?.toBase58() ?? null
  const router = useRouter()
  const ref = useBagRef()
  const [joins, setJoins] = useState(initialJoins)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const isCreator = wallet === creator
  const invite = wallet ? `https://potbot.fun/bag/${slug}?ref=${wallet}` : ''

  async function join() {
    if (!wallet || !signMessage) return
    setState('busy')
    setError(null)
    try {
      const ts = Date.now()
      const sig = await signMessage(new TextEncoder().encode(joinMessage({ slug, wallet, ts })))
      const r = await fetch('/api/bag/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, wallet, ts, signature: Buffer.from(sig).toString('base64'), ref: ref ?? undefined }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Could not join this BAG.')
      setJoins(j.joins)
      setState('done')
      router.refresh()
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Something went wrong'
      setError(/reject|denied|cancel/i.test(m) ? 'Signature cancelled.' : m)
      setState('idle')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {!connected ? (
          <WalletMultiButton />
        ) : isCreator || state === 'done' ? (
          <>
            <span className="rounded-full border border-pot-green px-4 py-2 text-sm text-pot-green">{isCreator ? 'This is your BAG' : 'You joined this BAG'}</span>
            <a href="/bag/me" className="text-sm text-pot-accent underline">Your BAG & points</a>
          </>
        ) : signMessage ? (
          <button type="button" onClick={join} disabled={state === 'busy'} className="btn-primary">
            {state === 'busy' ? 'Check your wallet…' : 'Join this BAG'}
          </button>
        ) : (
          <p className="text-sm text-pot-amber">This wallet cannot sign messages. Try Phantom or Solflare.</p>
        )}
        <span className="font-mono text-sm text-pot-muted"><span className="text-white">{joins}</span> joined</span>
      </div>
      <p className="mt-2 text-xs text-pot-muted">Free. You sign a message, not a transaction. One BAG per wallet: joining another one moves you.</p>
      {error && <p className="mt-2 text-sm text-red-400" role="alert">{error}</p>}

      {wallet && (
        <div className="mt-4 rounded-xl border border-pot-border p-3">
          <p className="text-sm text-white">Your invite link</p>
          <p className="mt-1 text-xs text-pot-muted">Wallets that join through it are linked to you. You earn +10% of the BAG Points they earn. They lose nothing.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 truncate rounded-lg bg-pot-dark px-3 py-2 text-xs text-white">{invite}</code>
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => { navigator.clipboard?.writeText(invite).then(() => setCopied(true)).catch(() => {}) }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
