'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import {
  useMyIndexBalance,
  useMyUsdcBalance,
  usePot,
  usePotIndexActions,
  usePotStats,
  useAssetPublishTimes,
} from '@/hooks/usePotIndex'
import { estimateShares, EXIT_FEE_BPS, ENTRY_FEE_BPS, MIN_DEPOSIT_USDC } from '@/lib/pot-index/client'
import { assetByMint, explorerAddress, explorerTx, POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { CompositionBar } from '@/components/pot-index/CompositionBar'
import { ActivityFeed } from '@/components/pot-index/ActivityFeed'
import { PlantBadge } from '@/components/pot-index/PlantBadge'
import { STAGES, stageForUsd } from '@/lib/pot-index/garden'
import { ConnectButton } from '@/components/ConnectButton'

function safePubkey(s: string | null): PublicKey | null {
  try {
    return s ? new PublicKey(s) : null
  } catch {
    return null
  }
}

export default function PotPage() {
  const params = useParams<{ mint: string }>()
  const search = useSearchParams()
  const mint = params.mint
  // Referral: first touch wins and is remembered per POTfolio for 30 days, so the referrer is still
  // paid when the holder comes back later without the link.
  const [referrer, setReferrer] = useState<PublicKey | null>(null)
  useEffect(() => {
    const key = `potbot-ref-${mint}`
    const fromUrl = safePubkey(search.get('ref'))
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? 'null') as { ref: string; at: number } | null
      const fresh = stored && Date.now() - stored.at < 30 * 24 * 3600 * 1000 ? safePubkey(stored.ref) : null
      if (fresh) setReferrer(fresh)
      else if (fromUrl) {
        localStorage.setItem(key, JSON.stringify({ ref: fromUrl.toBase58(), at: Date.now() }))
        setReferrer(fromUrl)
      }
    } catch {
      setReferrer(fromUrl)
    }
  }, [mint, search])
  const pot = usePot(mint)
  const stats = usePotStats(pot.data)
  const publishTimes = useAssetPublishTimes()
  // Any leg whose Pyth feed is older than the program's max age (300 s) blocks deposits — stocks outside market hours.
  const stalePrices = useMemo(() => {
    if (!pot.data || !publishTimes.data) return false
    const now = Date.now() / 1000
    return pot.data.legs.some((l) => now - (publishTimes.data![l.mint.toBase58()] ?? 0) > 300)
  }, [pot.data, publishTimes.data])
  const myShares = useMyIndexBalance(pot.data)
  const myUsdc = useMyUsdcBalance()
  const { deposit, exit, exitUsdc, connected, pubkey } = usePotIndexActions()

  const [tab, setTab] = useState<'deposit' | 'exit'>('deposit')
  const [amount, setAmount] = useState('100')
  const [exitPct, setExitPct] = useState(100)
  const [exitMode, setExitMode] = useState<'assets' | 'usdc'>('assets')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (pot.data) document.title = `${pot.data.name} ($${pot.data.symbol}) — PotBot`
  }, [pot.data])

  const amountNum = Number(amount) || 0
  const estShares = useMemo(() => {
    if (!stats.data || amountNum <= 0) return 0
    return estimateShares(amountNum, stats.data.navUsd, stats.data.supply * 1e6) / 1e6
  }, [stats.data, amountNum])

  const myShareNum = (myShares.data ?? 0) / 1e6
  const sharesInNum = Math.floor(myShareNum * exitPct / 100 * 1e6) / 1e6
  const exitPreview = useMemo(() => {
    if (!pot.data || !stats.data || sharesInNum <= 0 || stats.data.supply <= 0) return null
    const frac = Math.min(1, sharesInNum / stats.data.supply) * (1 - EXIT_FEE_BPS / 10_000)
    return {
      usdc: (stats.data.cash / 1e6) * frac,
      legs: pot.data.legs.map((l, i) => ({
        symbol: assetByMint(l.mint.toBase58())?.symbol ?? '?',
        amount: (stats.data!.legs[i] / 10 ** l.decimals) * frac,
        usd: stats.data!.legsUsd[i] * frac,
      })),
    }
  }, [pot.data, stats.data, sharesInNum])

  const refLink = typeof window !== 'undefined' && pubkey ? `${window.location.origin}/portfolios/${mint}?ref=${pubkey.toBase58()}` : ''

  const run = async (fn: () => Promise<string | string[]>, okText: string | ((r: string | string[]) => string)) => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fn()
      const sig = Array.isArray(r) ? r[r.length - 1] : r
      setMsg({ ok: true, text: typeof okText === 'function' ? okText(r) : okText, sig })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  if (pot.isLoading) return <div className="mx-auto max-w-5xl px-4 py-10 text-white/70">Loading Pot…</div>
  if (!pot.data)
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-white/70">Pot not found on {POT_INDEX_SETTINGS.cluster}.</p>
        <Link href="/portfolios" className="text-pot-green underline">All portfolios</Link>
      </div>
    )
  const p = pot.data

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {search.get('created') && (
        <div className="mb-6 rounded-xl border border-pot-green/40 bg-pot-green/10 px-4 py-3 text-sm text-white">
          Your POTfolio is live. Share the link below: every deposit through it pays you the referral share.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Pot info */}
        <section className="space-y-6">
          <header>
            <div className="flex flex-wrap items-center gap-3">
              <PlantBadge pot={p} navUsd={stats.data?.navUsd} size={64} />
              <h1 className="text-3xl font-black text-white">{p.name}</h1>
              <span className="rounded-full border border-pot-green/40 bg-pot-green/10 px-2 py-0.5 font-mono text-xs text-pot-green">
                ${p.symbol}
              </span>
              {p.paused && <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-200">deposits paused</span>}
              {stalePrices && !p.paused && <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-200">market closed: deposits reopen with live prices, exits always open</span>}
            </div>
            <p className="mt-1 text-sm text-white/70">
              by {p.creator.toBase58().slice(0, 4)}…{p.creator.toBase58().slice(-4)} · created{' '}
              {new Date(p.createdAt * 1000).toLocaleDateString()}
              {stats.data && (() => {
                const lvl = stageForUsd(stats.data.navUsd)
                const next = STAGES[lvl] // undefined at level 6
                return (
                  <>
                    {' '}· <span className="text-pot-green">Level {lvl} {STAGES[lvl - 1].name}</span>
                    {next ? ` · next level at ${next.label}` : ' · max level'}
                  </>
                )
              })()}
            </p>
          </header>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="NAV" value={stats.data ? `$${stats.data.navUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'} />
            <Stat label="Index price" value={stats.data ? `$${stats.data.indexPrice.toFixed(4)}` : '—'} />
            <Stat label="Supply" value={stats.data ? `${stats.data.supply.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${p.symbol}` : '—'} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-white">Composition</h2>
            <CompositionBar pot={p} actualUsd={stats.data?.legsUsd} cashUsd={stats.data ? stats.data.cash / 1e6 : undefined} />
            <p className="mt-3 text-xs text-white/70">
              Target weights are fixed. Deposits land as USDC cash; anyone can rebalance it into the basket within on-chain limits
              (max {p.maxTradeBps / 100}% of NAV per trade, {p.slippageBps / 100}% slippage band).
            </p>
          </div>

          <div className="card p-5 text-sm text-white/70">
            <h2 className="mb-2 font-semibold text-white">How this POTfolio works</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Deposit USDC → the Pot mints ${p.symbol} at the current NAV per token. Entry fee {ENTRY_FEE_BPS / 100}%.</li>
              <li>Redeem ${p.symbol} → you receive your share of every asset inside, in kind. {EXIT_FEE_BPS / 100}% stays for remaining holders.</li>
              <li>The index token is a normal SPL token: hold it, send it, trade it.</li>
              <li>Nobody, not the creator and not PotBot, can withdraw the assets. There is no such instruction.</li>
            </ul>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <a className="text-pot-green hover:underline" href={explorerAddress(p.address.toBase58())} target="_blank" rel="noreferrer">Pot account ↗</a>
              <a className="text-pot-green hover:underline" href={explorerAddress(p.indexMint.toBase58())} target="_blank" rel="noreferrer">Index mint ↗</a>
              <a className="text-pot-green hover:underline" href={explorerAddress(POT_INDEX_SETTINGS.programId)} target="_blank" rel="noreferrer">Program ↗</a>
            </p>
          </div>

          <ActivityFeed pot={p} />
        </section>

        {/* Right: actions */}
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex rounded-xl border border-pot-border bg-pot-dark p-1 text-sm font-semibold">
              {(['deposit', 'exit'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-lg py-2 capitalize transition ${tab === t ? 'bg-pot-green text-pot-dark' : 'text-white/70 hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>

            {tab === 'deposit' ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 flex justify-between text-xs text-white/70">
                    <span>Amount (USDC)</span>
                    <span>balance {myUsdc.data?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}</span>
                  </span>
                  <input className="input" type="number" min={MIN_DEPOSIT_USDC} value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <div className="rounded-lg bg-pot-dark p-3 text-xs text-white/70">
                  <div className="flex justify-between"><span>You receive (est.)</span><span className="text-white">{estShares.toFixed(4)} ${p.symbol}</span></div>
                  <div className="flex justify-between"><span>Entry fee</span><span>{(amountNum * ENTRY_FEE_BPS / 10_000).toFixed(2)} USDC</span></div>
                  {referrer && <div className="flex justify-between"><span>Referred by</span><span className="font-mono">{referrer.toBase58().slice(0, 4)}…{referrer.toBase58().slice(-4)}</span></div>}
                </div>
                {!connected ? (
                  <div className="[&>button]:!w-full [&>button]:!justify-center"><ConnectButton /></div>
                ) : (
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={!connected || busy || amountNum < MIN_DEPOSIT_USDC || p.paused || stalePrices}
                  onClick={() =>
                    run(
                      () => deposit(p, amountNum, referrer && !referrer.equals(pubkey!) ? referrer : null),
                      (r) => {
                        const n = (r as unknown as { allocated?: number }).allocated ?? 0
                        return n > 0 ? `Deposited ${amountNum} USDC and bought ${n} of ${p.legs.length} assets` : `Deposited ${amountNum} USDC (keepers allocate it next)`
                      },
                    )
                  }
                >
                  {stalePrices ? 'Market closed: mint opens with live prices' : busy ? 'Confirm in wallet…' : `Deposit & mint $${p.symbol}`}
                </button>
                )}
                <p className="text-xs text-white/70">One wallet prompt: prices are posted, your tokens are minted at the current value, and the basket is bought in the same go. Min {MIN_DEPOSIT_USDC} USDC.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* What you want back */}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-pot-dark p-1">
                  <button
                    type="button"
                    onClick={() => setExitMode('assets')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${exitMode === 'assets' ? 'bg-pot-green text-pot-dark' : 'text-white/70 hover:text-white'}`}
                  >
                    Get the assets
                  </button>
                  <button
                    type="button"
                    onClick={() => setExitMode('usdc')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${exitMode === 'usdc' ? 'bg-pot-green text-pot-dark' : 'text-white/70 hover:text-white'}`}
                  >
                    Get USDC
                  </button>
                </div>

                {/* How much: percent slider + max */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-white/70">
                    <span>Redeem {exitPct}% of your ${p.symbol}</span>
                    <button type="button" className="font-semibold text-pot-green" onClick={() => setExitPct(100)}>Max</button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={exitPct}
                    onChange={(e) => setExitPct(Number(e.target.value))}
                    className="pot-range w-full"
                    style={{ ['--pct' as string]: `${exitPct}%` }}
                  />
                  <div className="mt-1 flex justify-between text-xs text-white/70">
                    {[25, 50, 75, 100].map((q) => (
                      <button key={q} type="button" onClick={() => setExitPct(q)} className={q === exitPct ? 'text-pot-green' : 'hover:text-white'}>{q}%</button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-white">
                    {sharesInNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${p.symbol}
                    {stats.data && <span className="text-white/70"> ≈ ${(sharesInNum * stats.data.indexPrice).toFixed(2)}</span>}
                  </p>
                </div>

                {exitPreview && exitMode === 'assets' && (
                  <div className="rounded-lg bg-pot-dark p-3 text-xs text-white/70">
                    <p className="mb-1 text-white">You receive, every asset in kind:</p>
                    {exitPreview.usdc > 0.005 && <div className="flex justify-between"><span>USDC (not yet bought in)</span><span>{exitPreview.usdc.toFixed(2)}</span></div>}
                    {exitPreview.legs.map((l) => (
                      <div key={l.symbol} className="flex justify-between"><span>{l.symbol}</span><span>{l.amount.toFixed(6)} (≈${l.usd.toFixed(2)})</span></div>
                    ))}
                  </div>
                )}
                {exitPreview && exitMode === 'usdc' && (
                  <div className="rounded-lg bg-pot-dark p-3 text-xs text-white/70">
                    <p className="mb-1 text-white">You receive USDC:</p>
                    <div className="flex justify-between"><span>Your share, sold at market</span><span>≈ ${(exitPreview.usdc + exitPreview.legs.reduce((a, l) => a + l.usd, 0)).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Conversion fee 0.10% (on the sold part)</span><span>−${(exitPreview.legs.reduce((a, l) => a + l.usd, 0) * 0.001).toFixed(2)}</span></div>
                    <p className="mt-1">Sold in the same transaction. If the sale gives less than the on-chain minimum, nothing happens and you keep your tokens.{stalePrices ? ' Market closed: live prices needed, choose "Get the assets" meanwhile.' : ''}</p>
                  </div>
                )}
                {!connected ? (
                  <div className="[&>button]:!w-full [&>button]:!justify-center"><ConnectButton /></div>
                ) : (
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={!connected || busy || sharesInNum <= 0 || sharesInNum > myShareNum + 1e-9 || (exitMode === 'usdc' && stalePrices)}
                  onClick={() =>
                    exitMode === 'usdc'
                      ? run(() => exitUsdc(p, Math.floor(sharesInNum * 1e6)), `Redeemed ${sharesInNum.toFixed(4)} $${p.symbol} for USDC`)
                      : run(() => exit(p, Math.floor(sharesInNum * 1e6)), `Redeemed ${sharesInNum.toFixed(4)} $${p.symbol}`)
                  }
                >
                  {busy ? 'Confirm in wallet…' : exitMode === 'usdc' ? `Redeem ${exitPct}% for USDC` : `Redeem ${exitPct}% for the assets`}
                </button>
                )}
                <p className="text-xs text-white/70">Always available, no oracle, no pause. {EXIT_FEE_BPS / 100}% stays in the Pot for the holders who remain.</p>
              </div>
            )}

            {msg && (
              <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${msg.ok ? 'bg-pot-green/10 text-pot-green' : 'bg-red-500/10 text-red-300'}`}>
                {msg.text}
                {msg.sig && (
                  <>
                    {' · '}
                    <a className="underline" href={explorerTx(msg.sig)} target="_blank" rel="noreferrer">tx ↗</a>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-white">Your position</h3>
            <p className="mt-1 text-2xl font-bold text-white">{myShareNum.toFixed(4)} <span className="text-base text-white/70">${p.symbol}</span></p>
            <p className="text-sm text-white/70">≈ ${stats.data ? (myShareNum * stats.data.indexPrice).toFixed(2) : '—'}</p>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-white">Share & earn</h3>
            <p className="mt-1 text-xs text-white/70">Deposits through your link pay you 40% of the entry fee.</p>
            <div className="mt-2 flex gap-2">
              <input className="input flex-1 px-3 py-2 text-xs" readOnly value={refLink || 'Connect a wallet to get your link'} />
              <button
                type="button"
                className="btn-secondary px-3 py-2 text-xs"
                disabled={!refLink}
                onClick={async () => {
                  await navigator.clipboard.writeText(refLink)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {POT_INDEX_SETTINGS.cluster !== 'mainnet-beta' && <DevnetFaucet />}
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-white/70">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function DevnetFaucet() {
  const { pubkey } = usePotIndexActions()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [gotSol, setGotSol] = useState(0)
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-white">Devnet faucet</h3>
      <p className="mt-1 text-xs text-white/70">Get 1,000 test USDC to try this Pot. A fresh wallet also gets a little SOL for fees. Devnet only, no real value.</p>
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
