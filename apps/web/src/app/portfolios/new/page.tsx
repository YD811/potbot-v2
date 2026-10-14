'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicKey } from '@solana/web3.js'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { friendlyError } from '@/lib/pot-index/errors'
import { DevnetFaucet } from '@/components/pot-index/DevnetFaucet'
import { usePotIndexActions, useAssetPrices, usePotIndexConfig } from '@/hooks/usePotIndex'
import { POT_INDEX_ASSETS } from '@/lib/pot-index/registry'
import { legColor } from '@/components/pot-index/CompositionBar'
import { ConnectButton } from '@/components/ConnectButton'
import { PageHeader } from '@/components/PageHeader'

interface Row {
  mint: string
  weight: number // percent
}

const CATEGORY_LABEL: Record<'solana' | 'crypto' | 'stock' | 'meme', string> = {
  solana: 'Solana',
  crypto: 'Crypto',
  stock: 'Stock',
  meme: 'Meme',
}

/** Ticker from the name: initials for multi-word names, first letters for one word. */
function suggestSymbol(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const letters = words.length >= 2 ? words.map((w) => w[0]) : [...words[0].slice(0, 4)]
  return letters.join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
}

function StepHeading({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-sm tabular-nums text-pot-accent">{n}</span>
      <div>
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">{title}</h2>
        {hint && <p className="mt-1 text-sm text-pot-muted">{hint}</p>}
      </div>
    </div>
  )
}

export default function NewPotPage() {
  const router = useRouter()
  const { createPot, connected } = usePotIndexActions()
  const prices = useAssetPrices()
  const config = usePotIndexConfig()
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [symbolTouched, setSymbolTouched] = useState(false)
  const [rows, setRows] = useState<Row[]>(() =>
    POT_INDEX_ASSETS.slice(0, 2).map((a, i) => ({ mint: a.mint, weight: i === 0 ? 60 : 40 })),
  )
  const [ca, setCa] = useState('')
  const [caMsg, setCaMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [grind, setGrind] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Create a POTFolio · PotBot'
  }, [])

  const total = rows.reduce((s, r) => s + r.weight, 0)
  const valid = useMemo(
    () => name.trim().length > 0 && name.length <= 32 && symbol.trim().length > 0 && symbol.length <= 10 && rows.length >= 2 && total === 100 && rows.every((r) => r.weight > 0),
    [name, symbol, rows, total],
  )

  const setWeight = (i: number, w: number) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, weight: Math.max(0, Math.min(100, Math.round(w))) } : r)))

  const equalize = () => {
    const n = rows.length
    const base = Math.floor(100 / n)
    setRows((rs) => rs.map((r, i) => ({ ...r, weight: i === 0 ? 100 - base * (n - 1) : base })))
  }

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await createPot({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        legs: rows.map((r) => ({ mint: new PublicKey(r.mint), weightBps: r.weight * 100 })),
        depositCapUsd: 0,
        slippageBps: 50,
        maxTradeBps: 1000,
        onGrind: setGrind,
      })
      router.push(`/portfolios/${res.indexMint.toBase58()}?created=1`)
    } catch (e) {
      setError(friendlyError(e, { devnet: true }))
    } finally {
      setBusy(false)
    }
  }

  const toggleAsset = (mint: string) => {
    if (rows.some((r) => r.mint === mint)) {
      if (rows.length <= 2) return
      setRows((rs) => rs.filter((r) => r.mint !== mint))
      return
    }
    if (rows.length >= 5) { setCaMsg('A POTFolio holds up to 5 assets. Remove one to add another.'); return }
    setCaMsg(null)
    setRows((rs) => [...rs, { mint, weight: 0 }])
  }

  // Bar segments for the preview: current weights, scaled so the bar is always full.
  const previewLegs = rows.map((r, i) => ({
    key: r.mint,
    symbol: POT_INDEX_ASSETS.find((x) => x.mint === r.mint)?.symbol ?? '',
    pct: total > 0 ? (r.weight / total) * 100 : 100 / rows.length,
    color: legColor(i),
  }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Create" title="Build a POTFolio" lede="Up to 5 assets. Weights lock at creation. One transaction." />

      {config.data === null && (
        <p className="mb-6 rounded-2xl border border-pot-border bg-pot-card px-5 py-4 text-sm text-pot-muted">
          The program is not initialized on this network yet. Creation will fail until it is deployed.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Steps */}
        <div className="space-y-6">
          {/* 01 Name and ticker */}
          <section className="rounded-3xl border border-pot-border bg-pot-card p-5 sm:p-6">
            <StepHeading n="01" title="Name and ticker" />
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_160px]">
              <label className="block">
                <span className="mb-1.5 block text-sm text-pot-muted">Name</span>
                <input
                  className="input"
                  maxLength={32}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!symbolTouched) setSymbol(suggestSymbol(e.target.value))
                  }}
                  placeholder="Solana Blue Chips"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-pot-muted">Ticker</span>
                <input
                  className="input font-mono uppercase tabular-nums"
                  maxLength={10}
                  value={symbol}
                  onChange={(e) => {
                    setSymbolTouched(true)
                    setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }}
                  placeholder="SBC"
                />
              </label>
            </div>
          </section>

          {/* 02 Pick assets */}
          <section className="rounded-3xl border border-pot-border bg-pot-card p-5 sm:p-6">
            <StepHeading n="02" title="Pick assets" hint={`${rows.length} of 5 selected. At least 2.`} />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {POT_INDEX_ASSETS.map((a) => {
                const idx = rows.findIndex((r) => r.mint === a.mint)
                const selected = idx >= 0
                const px = prices.data?.[a.mint]
                const cat = a.category ?? 'crypto'
                return (
                  <button
                    key={a.mint}
                    type="button"
                    onClick={() => toggleAsset(a.mint)}
                    aria-pressed={selected}
                    className={`rounded-2xl border bg-pot-dark p-4 text-left transition duration-200 ease-pot hover:-translate-y-0.5 ${selected ? 'border-pot-accent' : 'border-pot-border hover:border-pot-muted/60'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-base font-medium text-white">{a.symbol}</span>
                      {selected && <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: legColor(idx) }} />}
                    </div>
                    <p className="mt-1 truncate text-sm text-pot-muted">{a.name}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-pot-border px-2.5 py-0.5 text-xs text-pot-muted">{CATEGORY_LABEL[cat]}</span>
                      {px != null && <span className="font-mono text-xs tabular-nums text-pot-muted">${px.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-5">
              <span className="mb-1.5 block text-sm text-pot-muted">Or paste a token address</span>
              <input
                className="input font-mono text-sm"
                placeholder="Token address, then Enter"
                value={ca}
                onChange={(e) => setCa(e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const a = POT_INDEX_ASSETS.find((x) => x.mint === ca)
                  if (!a) { setCaMsg('That token is not listed yet. Assets need a price feed before they can join a POTFolio.'); return }
                  if (rows.some((r) => r.mint === a.mint)) { setCaMsg('That asset is already in the basket.'); return }
                  if (rows.length >= 5) { setCaMsg('A POTFolio holds up to 5 assets. Remove one to add another.'); return }
                  setRows((rs) => [...rs, { mint: a.mint, weight: 0 }]); setCa(''); setCaMsg(null)
                }}
              />
              {caMsg && <p className="mt-2 text-sm text-pot-muted">{caMsg}</p>}
            </div>
          </section>

          {/* 03 Weights */}
          <section className="rounded-3xl border border-pot-border bg-pot-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <StepHeading n="03" title="Weights" hint="Target share of every deposit. Must add up to 100%." />
              <button type="button" onClick={equalize} className="rounded-full border border-pot-border px-3 py-1 text-xs text-white transition hover:border-pot-muted">
                Equal weights
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {rows.map((r, i) => {
                const a = POT_INDEX_ASSETS.find((x) => x.mint === r.mint)!
                return (
                  <div key={r.mint} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[88px_1fr_88px_auto]">
                    <div className="flex items-center gap-2 sm:order-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: legColor(i) }} />
                      <span className="font-mono text-sm font-medium text-white">{a.symbol}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 sm:order-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={r.weight}
                        onChange={(e) => setWeight(i, Number(e.target.value))}
                        className="input w-[64px] px-2 py-1.5 text-right font-mono text-sm tabular-nums"
                        aria-label={`${a.symbol} percent`}
                      />
                      <span className="text-sm text-pot-muted">%</span>
                    </div>
                    <button
                      type="button"
                      disabled={rows.length <= 2}
                      onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                      className="text-sm text-pot-muted transition hover:text-white disabled:opacity-30 sm:order-4"
                      aria-label={`Remove ${a.symbol}`}
                    >
                      Remove
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={r.weight}
                      onChange={(e) => setWeight(i, Number(e.target.value))}
                      className="pot-range col-span-3 w-full sm:order-2 sm:col-span-1"
                      style={{ ['--pct' as string]: `${r.weight}%` }}
                      aria-label={`${a.symbol} weight`}
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-pot-border pt-4 text-sm">
              <span className={`font-mono tabular-nums ${total === 100 ? 'text-white' : 'text-pot-muted'}`}>Total {total}%</span>
              {total !== 100 && (
                <>
                  <span className="text-pot-muted">{total > 100 ? `Remove ${total - 100}% to continue.` : `Add ${100 - total}% to continue.`}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (total <= 0) return
                      setRows((rs) => {
                        const scaled = rs.map((r) => Math.round((r.weight / total) * 100))
                        const diff = 100 - scaled.reduce((a, b) => a + b, 0)
                        return rs.map((r, i) => ({ ...r, weight: scaled[i] + (i === 0 ? diff : 0) }))
                      })
                    }}
                    className="btn-secondary px-4 py-1.5 text-xs"
                  >
                    Scale to 100%
                  </button>
                </>
              )}
              {total === 100 && <span className="text-pot-muted">Weights lock once the POTFolio is created.</span>}
            </div>
          </section>

          {/* 04 Review */}
          <section className="rounded-3xl border border-pot-border bg-pot-card p-5 sm:p-6">
            <StepHeading n="04" title="Review" />
            <div className="mt-5">
              <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-pot-border">
                {previewLegs.map((l) => (
                  <div key={l.key} style={{ width: `${l.pct}%`, background: l.color }} />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {rows.map((r, i) => {
                  const a = POT_INDEX_ASSETS.find((x) => x.mint === r.mint)
                  return (
                    <li key={r.mint} className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: legColor(i) }} />
                      <span className="font-mono text-white">{a?.symbol}</span>
                      <span className="font-mono tabular-nums text-pot-muted">{r.weight}%</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <p className="mt-5 text-[15px] text-pot-muted">Holders pay 0.30% on entry. 40% of it is yours, paid in the same transaction.</p>

            {error && <p className="mt-4 text-sm text-pot-muted">{error}</p>}

            <div className="mt-6">
              {!connected ? (
                <ConnectButton />
              ) : (
                <button type="button" className="btn-primary w-full sm:w-auto" disabled={!valid || busy} onClick={submit}>
                  {busy ? (grind > 0 ? 'Picking a Pot address' : 'Creating') : 'Create POTFolio'}
                </button>
              )}
            </div>
            <p className="mt-3 text-sm text-pot-muted">One transaction. About 0.03 SOL in account rent.</p>
            {connected && POT_INDEX_SETTINGS.cluster !== 'mainnet-beta' && (
              <div className="mt-4">
                <DevnetFaucet compact />
              </div>
            )}
          </section>
        </div>

        {/* Live preview */}
        <aside className="hidden lg:block lg:sticky lg:top-24">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">Preview</p>
          <div className="rounded-3xl border border-pot-border bg-pot-card p-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/garden/pink-1.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" />
              <div className="min-w-0">
                <h3 className="truncate font-display text-xl font-semibold tracking-[-0.02em] text-white">{name.trim() || 'Your POTFolio'}</h3>
                <p className="font-mono text-xs text-pot-muted">${symbol || 'TICKER'}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-pot-border">
                {previewLegs.map((l) => (
                  <div key={l.key} style={{ width: `${l.pct}%`, background: l.color }} />
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {previewLegs.map((l, i) => (
                  <li key={l.key} className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                    <span className="font-mono text-white">{l.symbol}</span>
                    <span className="font-mono tabular-nums text-pot-muted">{rows[i].weight}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-pot-muted">
              <span>Level 1 · Seedling</span>
              <span className="font-mono tabular-nums">TVL $0</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-pot-muted">This is how it appears in the catalog.</p>
        </aside>
      </div>
    </div>
  )
}
