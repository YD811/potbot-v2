'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { joinMessage } from '@/lib/bag/recipes'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

/** "Join this BAG": a signed message, no transaction and no funds. */
export function BagJoin({ slug, creator, initialJoins }: { slug: string; creator: string; initialJoins: number }) {
  const { publicKey, signMessage, connected } = useWallet()
  const wallet = publicKey?.toBase58() ?? null
  const router = useRouter()
  const [joins, setJoins] = useState(initialJoins)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const isCreator = wallet === creator

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
        body: JSON.stringify({ slug, wallet, ts, signature: Buffer.from(sig).toString('base64') }),
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
        ) : isCreator ? (
          <span className="rounded-full border border-pot-green px-4 py-2 text-sm text-pot-green">This is your BAG</span>
        ) : state === 'done' ? (
          <span className="rounded-full border border-pot-green px-4 py-2 text-sm text-pot-green">You joined this BAG</span>
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
    </div>
  )
}
