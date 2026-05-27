'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  normalizeLabel, validateLabel, formatPrice, DEFAULT_PRICING,
  type AvailabilityResult, type Currency, type ClaimResponse,
} from '@/lib/sns'
import { useClaimWallet } from '@/hooks/useClaimWallet'

type Status = 'idle' | 'checking' | 'result'
type ClaimState = 'idle' | 'building' | 'signing' | 'done' | 'error'

export default function ClaimWidget({ initialName = '', potPubkey }:
  { initialName?: string; potPubkey?: string }) {
  const wallet = useClaimWallet()
  const [input, setInput] = useState(initialName)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<AvailabilityResult | null>(null)
  const [currency, setCurrency] = useState<Currency>('SOL')
  const [claimState, setClaimState] = useState<ClaimState>('idle')
  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const label = useMemo(() => normalizeLabel(input), [input])
  const localReason = useMemo(() => (label ? validateLabel(label) : null), [label])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    setClaimState('idle')
    setSignature(null)
    setError(null)
    if (!label) { setStatus('idle'); setResult(null); return }
    if (localReason) {
      setStatus('result')
      setResult({ label, fqdn: `${label}.potbot.sol`, available: false, reason: localReason, pricing: DEFAULT_PRICING })
      return
    }
    setStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const myId = ++reqIdRef.current
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sns/check?name=${encodeURIComponent(label)}`)
        const data: AvailabilityResult = await res.json()
        if (myId !== reqIdRef.current) return
        setResult(data)
        setStatus('result')
      } catch {
        if (myId !== reqIdRef.current) return
        setError("Couldn't check availability")
        setStatus('result')
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [label, localReason])

  const pricing = result?.pricing ?? DEFAULT_PRICING
  const price = currency === 'SOL' ? pricing.sol : pricing.usdc
  const available = status === 'result' && result?.available === true

  async function handleClaim() {
    if (!available) return
    setError(null)
    if (!wallet.connected) { wallet.login(); return }
    try {
      setClaimState('building')
      const res = await fetch('/api/sns/claim', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label, buyer: wallet.address, currency, potPubkey }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'claim_failed') }
      const data: ClaimResponse = await res.json()
      setClaimState('signing')
      const sig = await wallet.signAndSend(data.transaction)
      setSignature(sig)
      setClaimState('done')
    } catch (e: any) { setError(humanError(e?.message)); setClaimState('error') }
  }

  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl p-6" style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <label className="block text-xs text-pot-muted mb-2">Pick your name</label>
      <div className={`flex items-stretch bg-pot-dark border rounded-xl overflow-hidden transition-colors ${available ? 'border-pot-green/50' : 'border-pot-border'}`}>
        <input className="input flex-1 bg-transparent border-none outline-none text-lg px-4 py-3.5" value={input} onChange={(e) => setInput(e.target.value)} placeholder="alice" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <span className="flex items-center px-4 text-pot-muted text-base bg-pot-dark border-l border-pot-border whitespace-nowrap">.potbot.sol</span>
      </div>
      <div className="min-h-[28px] mt-3 text-sm">
        {status === 'checking' && <span className="text-pot-muted">Checking availability...</span>}
        {status === 'result' && result && <StatusLine result={result} />}
      </div>
      {available && (
        <div className="mt-2">
          <div className="flex items-center justify-between p-4 bg-pot-dark border border-pot-border rounded-xl">
            <div>
              <div className="text-xs text-pot-muted">Price</div>
              <div className="text-xl font-bold">{formatPrice(price, currency)}</div>
            </div>
            <div className="flex gap-2">
              {(['SOL', 'USDC'] as Currency[]).map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`px-3.5 py-2 rounded-lg border font-semibold cursor-pointer transition ${currency === c ? 'border-pot-green/50 bg-pot-green/10 text-pot-green' : 'border-pot-border text-pot-muted'}`}>{c}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full mt-3.5 py-3.5 rounded-xl border-none bg-pot-green text-pot-dark text-base font-bold cursor-pointer disabled:opacity-70" onClick={handleClaim} disabled={claimState === 'building' || claimState === 'signing'}>
            {claimLabel(claimState, wallet.connected, label, currency, price)}
          </button>
          {claimState === 'done' && signature && (
            <div className="mt-3.5 p-3 rounded-xl bg-pot-green/10 border border-pot-green/30 text-pot-green text-sm">
              {label}.potbot.sol is yours!{' '}
              <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer" className="text-white underline">View transaction</a>
            </div>
          )}
          {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
        </div>
      )}
    </div>
  )
}

function StatusLine({ result }: { result: AvailabilityResult }) {
  if (result.available) return <span className="text-pot-green">{result.fqdn} is available</span>
  const map: Record<string, string> = { taken: `${result.fqdn} is taken`, reserved: 'This name is reserved', invalid: 'Only a-z, 0-9 and hyphen', too_short: 'Too short', too_long: 'Too long (max 63)' }
  return <span className="text-red-400">{map[result.reason ?? 'taken'] ?? 'Unavailable'}</span>
}

function claimLabel(state: ClaimState, connected: boolean, label: string, currency: Currency, price: number): string {
  if (state === 'building') return 'Preparing transaction...'
  if (state === 'signing') return 'Sign in your wallet...'
  if (state === 'done') return 'Done'
  if (!connected) return 'Connect wallet'
  return `Claim ${label}.potbot.sol for ${formatPrice(price, currency)}`
}

function humanError(code?: string): string {
  switch (code) {
    case 'wallet_not_connected': return 'Wallet not connected'
    case 'not_available': return 'Just taken — try another name'
    case 'build_tx_failed': return 'Service temporarily unavailable — domain owner key is not configured on the server'
    case 'owner_key_missing': return 'Service temporarily unavailable — domain owner key is not configured on the server'
    default: return 'Something went wrong. Please try again'
  }
}
