'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  normalizeLabel, validateLabel, formatPrice, DEFAULT_PRICING,
  type AvailabilityResult, type Currency, type ClaimResponse,
} from '@/lib/sns'
import { useClaimWallet } from '@/hooks/useClaimWallet'

const GREEN = '#14F195'
const MUTED = '#6B7280'
const RED = '#F87171'
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
    <div className="card" style={{ background: '#111827', border: '1px solid #1A2332', borderRadius: 16, padding: 24, maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <label style={{ display: 'block', fontSize: 13, color: MUTED, marginBottom: 8 }}>Pick your name</label>
      <div style={{ display: 'flex', alignItems: 'stretch', background: '#0D1117', border: `1px solid ${available ? GREEN : '#1A2332'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 120ms ease' }}>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="alice" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, padding: '14px 16px' }} />
        <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px', color: MUTED, fontSize: 16, background: '#0B0F14', borderLeft: '1px solid #1A2332', whiteSpace: 'nowrap' }}>.potbot.sol</span>
      </div>
      <div style={{ minHeight: 28, marginTop: 12, fontSize: 14 }}>
        {status === 'checking' && <span style={{ color: MUTED }}>Checking availability…</span>}
        {status === 'result' && result && <StatusLine result={result} />}
      </div>
      {available && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#0D1117', border: '1px solid #1A2332', borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: MUTED }}>Price</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{formatPrice(price, currency)}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['SOL', 'USDC'] as Currency[]).map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${currency === c ? GREEN : '#1A2332'}`, background: currency === c ? 'rgba(20,241,149,0.08)' : 'transparent', color: currency === c ? GREEN : MUTED, fontWeight: 600, cursor: 'pointer' }}>{c}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={handleClaim} disabled={claimState === 'building' || claimState === 'signing'}
            style={{ marginTop: 14, width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none', background: GREEN, color: '#04150C', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: claimState === 'building' || claimState === 'signing' ? 0.7 : 1 }}>
            {claimLabel(claimState, wallet.connected, label, currency, price)}
          </button>
          {claimState === 'done' && signature && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(20,241,149,0.08)', border: `1px solid ${GREEN}`, color: GREEN, fontSize: 14 }}>
              {label}.potbot.sol is yours!{' '}
              <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>View transaction</a>
            </div>
          )}
          {error && <div style={{ marginTop: 12, color: RED, fontSize: 14 }}>{error}</div>}
        </div>
      )}
    </div>
  )
}

function StatusLine({ result }: { result: AvailabilityResult }) {
  if (result.available) return <span style={{ color: GREEN }}>{result.fqdn} is available</span>
  const map: Record<string, string> = { taken: `${result.fqdn} is taken`, reserved: 'This name is reserved', invalid: 'Only a-z, 0-9 and hyphen', too_short: 'Too short', too_long: 'Too long (max 63)' }
  return <span style={{ color: '#F87171' }}>{map[result.reason ?? 'taken'] ?? 'Unavailable'}</span>
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
    case 'build_tx_failed': return "Couldn't build the transaction (check domain-owner config)"
    default: return 'Something went wrong. Please try again'
  }
}
