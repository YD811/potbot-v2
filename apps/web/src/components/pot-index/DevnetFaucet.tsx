'use client'

import { useState } from 'react'
import { usePotIndexActions } from '@/hooks/usePotIndex'

/** Test cluster only: 1,000 test USDC, plus 0.1 SOL when the wallet is nearly empty (fees and rent). */
export function DevnetFaucet({ compact = false }: { compact?: boolean }) {
  const { pubkey } = usePotIndexActions()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [gotSol, setGotSol] = useState(0)
  return (
    <div className={compact ? '' : 'px-1'}>
      <button
        type="button"
        className="btn-secondary w-full"
        disabled={!pubkey || state === 'busy'}
        onClick={async () => {
          setState('busy')
          setErr('')
          try {
            const r = await fetch('/api/pot-index/faucet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet: pubkey!.toBase58() }) })
            const j = await r.json()
            if (!r.ok) throw new Error(j.error ?? 'faucet failed')
            setGotSol(Number(j.sol ?? 0))
            setState('done')
          } catch (e) {
            setErr(e instanceof Error ? e.message : String(e))
            setState('error')
          }
        }}
      >
        {state === 'busy' ? 'Sending' : state === 'done' ? (gotSol > 0 ? `Sent 1,000 test USDC and ${gotSol} SOL` : 'Sent 1,000 test USDC') : 'Get test USDC'}
      </button>
      {!pubkey && <p className="mt-2 text-xs text-pot-muted">Connect a wallet first.</p>}
      {err && <p className="mt-2 text-sm text-pot-muted">The faucet could not send. {err}. Try again in a minute.</p>}
    </div>
  )
}
