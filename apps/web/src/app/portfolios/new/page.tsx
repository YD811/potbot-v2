'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicKey } from '@solana/web3.js'
import { usePotIndexActions, useAssetPrices, usePotIndexConfig } from '@/hooks/usePotIndex'
import { POT_INDEX_ASSETS } from '@/lib/pot-index/registry'
import { legColor } from '@/components/pot-index/CompositionBar'
import { ConnectButton } from '@/components/ConnectButton'

interface Row {
  mint: string
  weight: number // percent
}

/** Ticker from the name: initials for multi-word names, first letters for one word. */
function suggestSymbol(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const letters = words.length >= 2 ? words.map((w) => w[0]) : [...words[0].slice(0, 4)]
  return letters.join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
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
    document.title = 'Create a POTfolio — PotBot'
  }, [])

  const total = rows.reduce((s, r) => s + r.weight, 0)
  const available = POT_INDEX_ASSETS.filter((a) => !rows.some((r) => r.mint === a.mint))
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
        slippageBps: 100,
        maxTradeBps: 1000,
        onGrind: setGrind,
      })
      router.push(`/portfolios/${res.indexMint.toBase58()}?created=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="potfolio-create mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-black text-white sm:text-4xl">Create a POTfolio</h1>
      <p className="mt-2 text-white/70">
        Pick up to 5 assets, set target weights, publish. You get an index token that anyone can mint by depositing USDC.
        Weights are locked at creation, so depositors know exactly what they are buying.
      </p>

      {config.data === null && (
        <div className="mt-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          The program is not initialized on this network yet. Creation will fail until it is deployed.
        </div>
      )}

      <div className="potfolio-create-card card mt-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <label className="block">
            <span className="mb-1 block text-sm text-white/70">Name</span>
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
            <span className="mb-1 block text-sm text-white/70">Ticker</span>
            <input
              className="input font-mono uppercase"
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-white/70">Assets & target weights</span>
            <button type="button" onClick={equalize} className="text-xs text-pot-green hover:underline">
              Equal weights
            </button>
          </div>
          <div className="space-y-3">
            {rows.map((r, i) => {
              const a = POT_INDEX_ASSETS.find((x) => x.mint === r.mint)!
              const px = prices.data?.[r.mint]
              return (
                <div key={r.mint} className="potfolio-weight-row">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: legColor(i) }} />
                  <div className="min-w-0">
                    <div className="font-semibold text-white">{a.symbol}</div>
                    <div className="text-xs text-white/70">{px ? `$${px.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : a.name}</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={r.weight}
                    onChange={(e) => setWeight(i, Number(e.target.value))}
                    className="potfolio-weight-slider"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={r.weight}
                    onChange={(e) => setWeight(i, Number(e.target.value))}
                    className="potfolio-weight-input input px-2 py-1.5 text-right font-mono"
                  />
                  <span className="text-white/70">%</span>
                  <button
                    type="button"
                    disabled={rows.length <= 2}
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    className="text-white/70 hover:text-red-400 disabled:opacity-30"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
          <div className={`potfolio-weight-total flex min-h-[32px] flex-wrap items-center text-sm ${total === 100 ? 'potfolio-weight-total-valid text-pot-green' : 'text-yellow-300'}`}>
            <span className="font-semibold">Total {total}%</span>
            {total !== 100 && (
              <>
                <span>{total > 100 ? `remove ${total - 100}%` : `add ${100 - total}%`}</span>
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
                  className="rounded-full border border-yellow-300/50 px-2 py-0.5 text-xs text-yellow-200 hover:bg-yellow-300/10"
                >
                  Scale to 100%
                </button>
              </>
            )}
            {total === 100 && <span className="text-xs text-white/70">weights are locked once published</span>}
          </div>
          <div className="potfolio-add-asset">
            <input
              className="input min-w-0 px-2 py-1.5 font-mono text-xs"
              placeholder="paste token CA"
              value={ca}
              onChange={(e) => setCa(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const a = POT_INDEX_ASSETS.find((x) => x.mint === ca)
                if (!a) { setCaMsg('Not listed yet: assets need a Pyth price feed. Request listing.'); return }
                if (rows.some((r) => r.mint === a.mint)) { setCaMsg('Already in the basket.'); return }
                if (rows.length >= 5) { setCaMsg('Max 5 assets.'); return }
                setRows((rs) => [...rs, { mint: a.mint, weight: 0 }]); setCa(''); setCaMsg(null)
              }}
            />
            {available.length > 0 && rows.length < 5 && (
              <select
                className="input min-w-0 px-3 py-1.5 text-sm"
                value=""
                onChange={(e) => e.target.value && setRows((rs) => [...rs, { mint: e.target.value, weight: 0 }])}
              >
                <option value="">+ Add asset</option>
                {(['solana', 'crypto', 'stock', 'meme'] as const).map((c) => {
                  const group = available.filter((a) => (a.category ?? 'crypto') === c)
                  if (group.length === 0) return null
                  const label = { solana: 'Solana native', crypto: 'Crypto majors', stock: 'Stocks (xStocks)', meme: 'Memes' }[c]
                  return (
                    <optgroup key={c} label={label}>
                      {group.map((a) => (
                        <option key={a.mint} value={a.mint}>
                          {a.symbol} · {a.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            )}
          </div>
        </div>

        {caMsg && <p className="-mt-3 text-xs text-yellow-300">{caMsg}</p>}

        <div className="potfolio-publishing-summary border border-pot-border text-sm text-white/70">
          <p className="mb-4 text-base font-semibold text-white">What you are publishing</p>
          <ul>
            <li>
              <b className="text-white">Entry fee 0.30%</b> on every deposit, split in the same transaction: 0.12% to you as creator,
              0.12% to whoever referred the depositor (the holder who shared the link; with no referrer this part also goes to you),
              0.06% to the PotBot protocol. On a $10,000 deposit: $12 you, $12 referrer, $6 protocol.
            </li>
            <li><b className="text-white">Exit fee 0.50%</b> never leaves the Pot: it stays with the holders who remain.</li>
            <li><b className="text-white">No management fee.</b> You earn from deposits and from holding the token yourself.</li>
            <li>Weights are locked. Keepers move the basket toward them within on-chain limits. Nobody, including you, can withdraw assets.</li>
          </ul>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {!connected ? (
          <div className="potfolio-create-wallet"><ConnectButton /></div>
        ) : (
          <button type="button" className="potfolio-create-action btn-primary w-full" disabled={!valid || busy} onClick={submit}>
            {busy ? (grind > 0 ? `Minting a Pot… address (${Math.round(grind / 1000)}k tries)` : 'Creating…') : 'Create POTfolio'}
          </button>
        )}
      </div>
    </div>
  )
}
