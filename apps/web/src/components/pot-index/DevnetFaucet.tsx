'use client'

import { useState } from 'react'
import { usePotIndexActions } from '@/hooks/usePotIndex'

/** Devnet only: 1,000 test USDC, plus 0.1 SOL when the wallet is nearly empty (fees and rent). */
export function DevnetFaucet({ compact = false }: { compact?: boolean }) {
  const { pubkey } = usePotIndexActions()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [gotSol, setGotSol] = useState(0)
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-white">Devnet faucet</h3>
      <p className="mt-1 text-xs text-white/70">{compact ? 'Test USDC and a little SOL for fees. Devnet only, no real value.' : 'Get 1,000 test USDC to try this Pot. A fresh wallet also gets a little SOL for fees. Devnet only, no real value.'}</p>
      <button
        type="button"
        className="btn-secondary mt-2 w-full text-sm"
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
        {state === 'busy' ? 'Sending…' : state === 'done' ? (gotSol > 0 ? `Sent 1,000 tUSDC + ${gotSol} SOL ✓` : 'Sent 1,000 tUSDC ✓') : 'Get test USDC'}
      </button>
      {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
    </div>
  )
}
