'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQueryClient } from '@tanstack/react-query'
import { BAG_LEGS, legLabel, isLegLive } from '@/lib/bag/config'
import {
  CLASSIC_WEIGHTS,
  MIN_LEGS,
  NAME_MAX,
  PRESETS,
  cleanName,
  createMessage,
  decodeWeights,
  encodeWeights,
  isValidSlug,
  rebalance,
  shareText,
  slugify,
  validateWeights,
  type BagWeights,
} from '@/lib/bag/recipes'
import { WeightBar } from './WeightBar'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

const PREVIEW_USD = 100

export function BagBuilder() {
  const { publicKey, signMessage, connected } = useWallet()
  const wallet = publicKey?.toBase58() ?? null
  const qc = useQueryClient()

  const [weights, setWeights] = useState<BagWeights>(CLASSIC_WEIGHTS)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<{ slug: string; name: string; weights: BagWeights } | null>(null)
  const [copied, setCopied] = useState(false)

  // Remix link: /bag?w=50-30-20
  useEffect(() => {
    const w = decodeWeights(new URLSearchParams(window.location.search).get('w'))
    if (w) setWeights(w)
  }, [])

  const effectiveSlug = slugTouched ? slug : slugify(name)
  const weightsOk = validateWeights(weights)
  const nameOk = cleanName(name).length >= 2
  const slugOk = isValidSlug(effectiveSlug)
  const activeLegs = useMemo(() => BAG_LEGS.filter(l => weights[l.key] > 0), [weights])

  async function save() {
    if (!wallet || !signMessage || !weightsOk || !nameOk || !slugOk) return
    setBusy(true)
    setError(null)
    try {
      const clean = cleanName(name)
      const ts = Date.now()
      const msg = createMessage({ slug: effectiveSlug, name: clean, weights, wallet, ts })
      const sig = await signMessage(new TextEncoder().encode(msg))
      const r = await fetch('/api/bag/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean, slug: effectiveSlug, weights, wallet, ts, signature: Buffer.from(sig).toString('base64') }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Could not save your BAG.')
      setSaved({ slug: j.slug, name: j.name, weights: j.weights })
      qc.invalidateQueries({ queryKey: ['bag-recipes'] })
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Something went wrong'
      setError(/reject|denied|cancel/i.test(m) ? 'Signature cancelled.' : m)
    } finally {
      setBusy(false)
    }
  }

  if (saved) {
    const link = `https://potbot.fun/bag/${saved.slug}`
    const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText(saved.name, saved.weights))}&url=${encodeURIComponent(link)}`
    return (
      <div className="card p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-green">Your BAG is live</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-white">{saved.name}</h2>
        <WeightBar weights={saved.weights} legend className="mt-4" />
        <p className="mt-4 text-sm text-pot-muted">
          Share the link. Every wallet that joins is counted for you, and when buying opens their buys on your BAG count for you too.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 truncate rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-sm text-white">{link}</code>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => {}) }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <a className="btn-primary text-center" href={xUrl} target="_blank" rel="noopener noreferrer">Share on X</a>
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <Link className="text-pot-accent underline" href={`/bag/${saved.slug}`}>Open your BAG page</Link>
          <button type="button" className="text-pot-muted underline" onClick={() => { setSaved(null); setName(''); setSlug(''); setSlugTouched(false); setCopied(false) }}>
            Build another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-white">Build your BAG</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => {
            const active = encodeWeights(p.weights) === encodeWeights(weights)
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setWeights(p.weights)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs transition ${active ? 'border-pot-accent text-white' : 'border-pot-border text-pot-muted hover:text-white'}`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <WeightBar weights={weights} className="mt-5" />

      <div className="mt-5 space-y-4">
        {BAG_LEGS.map(l => (
          <div key={l.key}>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`bag-w-${l.key}`} className="text-sm text-white">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: l.color }} aria-hidden />
                {legLabel(l)} <span className="text-pot-muted">· {l.symbol}</span>
                {!isLegLive(l) && <span className="ml-2 text-xs text-pot-amber">opens after the Nasdaq listing</span>}
              </label>
              <span className="font-mono text-lg tabular-nums text-white">{weights[l.key]}%</span>
            </div>
            <input
              id={`bag-w-${l.key}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={weights[l.key]}
              onChange={e => setWeights(w => rebalance(w, l.key, Number(e.target.value)))}
              className="mt-1 w-full cursor-pointer"
              style={{ accentColor: l.color }}
            />
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-pot-muted">
        {weightsOk ? (
          <>A ${PREVIEW_USD} buy would split into {activeLegs.map((l, i) => (
            <span key={l.key}>{i > 0 && ', '}<span className="text-white">${(PREVIEW_USD * weights[l.key]) / 100} {l.symbol}</span></span>
          ))}.</>
        ) : (
          <span className="text-pot-amber">A BAG needs at least {MIN_LEGS} assets.</span>
        )}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="bag-name" className="text-sm text-pot-muted">Name your BAG</label>
          <input
            id="bag-name"
            className="input mt-1"
            placeholder="e.g. Hard Money Club"
            maxLength={NAME_MAX}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="bag-slug" className="text-sm text-pot-muted">Link</label>
          <div className="mt-1 flex items-center rounded-xl border border-pot-border bg-pot-dark pl-4 focus-within:border-pot-green">
            <span className="shrink-0 text-sm text-pot-muted">potbot.fun/bag/</span>
            <input
              id="bag-slug"
              className="w-full bg-transparent py-3 pr-4 text-white outline-none"
              placeholder="hard-money-club"
              maxLength={24}
              value={effectiveSlug}
              onChange={e => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
            />
          </div>
          {effectiveSlug.length > 0 && !slugOk && (
            <p className="mt-1 text-xs text-pot-amber">3–24 characters: a–z, 0–9 and dashes. Some names are reserved.</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {connected && signMessage ? (
          <button type="button" onClick={save} disabled={busy || !weightsOk || !nameOk || !slugOk} className="btn-primary">
            {busy ? 'Check your wallet…' : 'Save and share your BAG'}
          </button>
        ) : connected ? (
          <p className="text-sm text-pot-amber">This wallet cannot sign messages. Try Phantom or Solflare.</p>
        ) : (
          <WalletMultiButton />
        )}
        <p className="text-xs text-pot-muted">Free. You sign a message, not a transaction. No funds move.</p>
      </div>
      {error && <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}
    </div>
  )
}
