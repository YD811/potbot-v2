'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  checkSubdomainAvailable,
  registerWalletSubdomain,
  getRegisteredWalletDomain,
  getSubdomainPrice,
  sanitizePotName,
  POTBOT_PARENT_DOMAIN,
} from '@/lib/sns'

type AvailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'too-short'
type ClaimStatus = 'idle' | 'confirming' | 'pending' | 'success' | 'error'

export default function SNSRegistrarPanel() {
  const { publicKey, connected } = useWallet()
  const walletStr = publicKey?.toBase58() ?? ''

  const [input, setInput]               = useState('')
  const [slug, setSlug]                 = useState('')
  const [availStatus, setAvailStatus]   = useState<AvailStatus>('idle')
  const [claimStatus, setClaimStatus]   = useState<ClaimStatus>('idle')
  const [claimedDomain, setClaimedDomain] = useState<string | null>(null)
  const [existingDomain, setExistingDomain] = useState<string | null>(null)
  const [txSig, setTxSig]               = useState<string | null>(null)
  const [errorMsg, setErrorMsg]          = useState<string | null>(null)

  // Load existing domain for wallet on connect
  useEffect(() => {
    if (!walletStr) { setExistingDomain(null); return }
    getRegisteredWalletDomain(walletStr).then((d) => setExistingDomain(d))
  }, [walletStr])

  // Debounced availability check
  useEffect(() => {
    const clean = sanitizePotName(input)
    setSlug(clean)
    if (!clean) { setAvailStatus('idle'); return }
    if (clean.length < 3) { setAvailStatus('too-short'); return }
    setAvailStatus('checking')
    const t = setTimeout(async () => {
      const ok = await checkSubdomainAvailable(clean)
      setAvailStatus(ok ? 'available' : 'taken')
    }, 400)
    return () => clearTimeout(t)
  }, [input])

  const price = slug.length >= 3 ? getSubdomainPrice(slug) : null

  const handleClaim = useCallback(async () => {
    if (!walletStr || availStatus !== 'available' || !slug) return
    setClaimStatus('confirming')
    setErrorMsg(null)
    // Simulate wallet approval delay then tx
    await new Promise(r => setTimeout(r, 600))
    setClaimStatus('pending')
    const result = await registerWalletSubdomain(slug, walletStr)
    if (!result) {
      setClaimStatus('error')
      setErrorMsg('Registration failed — the name may have just been taken.')
      return
    }
    setTxSig(result.signature)
    setClaimedDomain(result.domain)
    setExistingDomain(slug)
    setClaimStatus('success')
  }, [walletStr, availStatus, slug])

  // ── Already has a domain ──────────────────────────────────────────────────
  const activeDomain = claimedDomain ? `${claimedDomain}` : existingDomain ? `${existingDomain}.${POTBOT_PARENT_DOMAIN}` : null

  return (
    <div className="card p-5 border border-pot-border space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏷️</span>
        <div>
          <h2 className="text-base font-semibold text-white leading-tight">Your Solana Identity</h2>
          <p className="text-xs text-pot-muted">Claim a personal <span className="font-mono text-pot-accent">.potbot.sol</span> subdomain</p>
        </div>
      </div>

      {/* Active domain badge */}
      {activeDomain && (
        <div className="flex items-center gap-2.5 bg-pot-green/10 border border-pot-green/20 rounded-xl px-4 py-3">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-xs text-pot-muted mb-0.5">Your registered domain</p>
            <p className="font-mono font-bold text-pot-green text-sm">{activeDomain}</p>
          </div>
          {txSig && (
            <span className="ml-auto text-[10px] font-mono text-pot-muted/70 truncate max-w-[80px]" title={txSig}>
              tx: {txSig.slice(0, 12)}…
            </span>
          )}
        </div>
      )}

      {/* Pricing table */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { chars: '3 chars', example: 'yd', price: '1 SOL', color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
          { chars: '4 chars', example: 'doge', price: '0.5 SOL', color: 'text-sky-400', bg: 'bg-sky-500/5 border-sky-500/20' },
          { chars: '5+ chars', example: 'degens', price: '0.1 SOL', color: 'text-pot-green', bg: 'bg-pot-green/5 border-pot-green/20' },
        ].map(({ chars, example, price: p, color, bg }) => (
          <div key={chars} className={`rounded-xl border px-3 py-2.5 text-center ${bg}`}>
            <div className={`text-sm font-bold font-mono ${color}`}>{p}</div>
            <div className="text-[10px] text-pot-muted mt-0.5">{chars}</div>
            <div className="text-[10px] text-pot-muted/50 font-mono">e.g. {example}</div>
          </div>
        ))}
      </div>

      {/* Search input */}
      {!activeDomain || claimStatus !== 'success' ? (
        <>
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                setClaimStatus('idle')
                setErrorMsg(null)
              }}
              placeholder="yourname"
              maxLength={32}
              disabled={!connected || claimStatus === 'pending' || claimStatus === 'confirming'}
              className="w-full bg-pot-dark border border-pot-border rounded-xl px-4 py-3 pr-36 text-white font-mono text-sm placeholder-pot-muted/50 focus:outline-none focus:border-pot-accent/50 disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-pot-muted pointer-events-none">
              .potbot.sol
            </span>
          </div>

          {/* Status indicator */}
          {slug && (
            <div className="flex items-center gap-2 text-xs min-h-[20px]">
              {availStatus === 'checking' && (
                <><span className="inline-block w-3 h-3 border-2 border-pot-muted/30 border-t-pot-accent rounded-full animate-spin" /><span className="text-pot-muted">Checking availability…</span></>
              )}
              {availStatus === 'too-short' && (
                <><span className="text-red-400">✗</span><span className="text-red-400">Minimum 3 characters</span></>
              )}
              {availStatus === 'available' && (
                <><span className="text-pot-green">✓</span><span className="text-pot-green font-mono font-semibold">{slug}.potbot.sol</span><span className="text-pot-muted">is available!</span></>
              )}
              {availStatus === 'taken' && (
                <><span className="text-red-400">✗</span><span className="text-red-400 font-mono">{slug}.potbot.sol</span><span className="text-red-400">is already taken</span></>
              )}
              {availStatus === 'available' && price && (
                <span className="ml-auto text-pot-accent font-mono font-bold">{price} SOL/yr</span>
              )}
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          {/* Claim button */}
          {!connected ? (
            <p className="text-xs text-pot-muted text-center py-1">Connect wallet to claim a domain</p>
          ) : (
            <button
              onClick={handleClaim}
              disabled={
                availStatus !== 'available' ||
                claimStatus === 'pending' ||
                claimStatus === 'confirming'
              }
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                bg-pot-accent text-pot-dark
                hover:bg-pot-accent/90 hover:shadow-lg hover:shadow-pot-accent/30
                disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {claimStatus === 'confirming' && (
                <><span className="inline-block w-4 h-4 border-2 border-pot-dark/30 border-t-pot-dark rounded-full animate-spin" />Approve in wallet…</>
              )}
              {claimStatus === 'pending' && (
                <><span className="inline-block w-4 h-4 border-2 border-pot-dark/30 border-t-pot-dark rounded-full animate-spin" />Registering on-chain…</>
              )}
              {(claimStatus === 'idle' || claimStatus === 'error') && (
                availStatus === 'available'
                  ? `Claim ${slug}.potbot.sol — ${price} SOL`
                  : 'Enter a name to check availability'
              )}
            </button>
          )}
        </>
      ) : (
        /* Success state */
        <div className="text-center py-2 space-y-1">
          <p className="text-sm text-pot-muted">You can now use this as your on-chain identity across PotBot 🎉</p>
        </div>
      )}

      <p className="text-[10px] text-pot-muted/50 text-center">
        Powered by Solana Name Service · Domains renew annually · <span className="font-mono">potbot.sol</span> parent
      </p>
    </div>
  )
}
