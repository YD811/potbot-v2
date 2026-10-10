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
} from '@/hooks/usePotIndex'
import { estimateShares, EXIT_FEE_BPS, ENTRY_FEE_BPS, MIN_DEPOSIT_USDC } from '@/lib/pot-index/client'
import { assetByMint, explorerAddress, explorerTx, POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { CompositionBar } from '@/components/pot-index/CompositionBar'
import { ActivityFeed } from '@/components/pot-index/ActivityFeed'

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
  const referrer = safePubkey(search.get('ref'))
  const pot = usePot(mint)
  const stats = usePotStats(pot.data)
  const myShares = useMyIndexBalance(pot.data)
  const myUsdc = useMyUsdcBalance()
  const { deposit, exit, connected, pubkey } = usePotIndexActions()

  const [tab, setTab] = useState<'deposit' | 'exit'>('deposit')
  const [amount, setAmount] = useState('100')
  const [sharesIn, setSharesIn] = useState('')
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
  const sharesInNum = Number(sharesIn) || 0
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

  const run = async (fn: () => Promise<string | string[]>, okText: string) => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fn()
      const sig = Array.isArray(r) ? r[r.length - 1] : r
      setMsg({ ok: true, text: okText, sig })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  if (pot.isLoading) return <div className="mx-auto max-w-5xl px-4 py-10 text-pot-muted">Loading Pot…</div>
  if (!pot.data)
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-pot-muted">Pot not found on {POT_INDEX_SETTINGS.cluster}.</p>
        <Link href="/portfolios" className="text-pot-green underline">All portfolios</Link>
      </div>
    )
  const p = pot.data

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {search.get('created') && (
        <div className="mb-6 rounded-xl border border-pot-green/40 bg-pot-green/10 px-4 py-3 text-sm text-white">
          Your Pot is live. Share the link below — every deposit through it pays you the referral share.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Pot info */}
        <section className="space-y-6">
          <header>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-white">{p.name}</h1>
              <span className="rounded-full border border-pot-green/40 bg-pot-green/10 px-2 py-0.5 font-mono text-xs text-pot-green">
                ${p.symbol}
              </span>
              {p.paused && <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-200">deposits paused</span>}
            </div>
            <p className="mt-1 text-sm text-pot-muted">
              by {p.creator.toBase58().slice(0, 4)}…{p.creator.toBase58().slice(-4)} · created{' '}
              {new Date(p.createdAt * 1000).toLocaleDateString()}
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
            <p className="mt-3 text-xs text-pot-muted">
              Target weights are fixed. Deposits land as USDC cash; anyone can rebalance it into the basket within on-chain limits
              (max {p.maxTradeBps / 100}% of NAV per trade, {p.slippageBps / 100}% slippage band).
            </p>
          </div>

          <div className="card p-5 text-sm text-pot-muted">
            <h2 className="mb-2 font-semibold text-white">How this Pot works</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Deposit USDC → the Pot mints ${p.symbol} at the current NAV per token. Entry fee {ENTRY_FEE_BPS / 100}%.</li>
              <li>Burn ${p.symbol} → you receive your share of every asset inside, in kind. {EXIT_FEE_BPS / 100}% stays for remaining holders.</li>
              <li>The index token is a normal SPL token: hold it, send it, trade it.</li>
              <li>Nobody — not the creator, not PotBot — can withdraw the assets. There is no such instruction.</li>
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
                <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-lg py-2 capitalize transition ${tab === t ? 'bg-pot-green text-pot-dark' : 'text-pot-muted hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>

            {tab === 'deposit' ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 flex justify-between text-xs text-pot-muted">
                    <span>Amount (USDC)</span>
                    <span>balance {myUsdc.data?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}</span>
                  </span>
                  <input className="input" type="number" min={MIN_DEPOSIT_USDC} value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <div className="rounded-lg bg-pot-dark p-3 text-xs text-pot-muted">
                  <div className="flex justify-between"><span>You receive (est.)</span><span className="text-white">{estShares.toFixed(4)} ${p.symbol}</span></div>
                  <div className="flex justify-between"><span>Entry fee</span><span>{(amountNum * ENTRY_FEE_BPS / 10_000).toFixed(2)} USDC</span></div>
                  {referrer && <div className="flex justify-between"><span>Referred by</span><span className="font-mono">{referrer.toBase58().slice(0, 4)}…{referrer.toBase58().slice(-4)}</span></div>}
                </div>
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={!connected || busy || amountNum < MIN_DEPOSIT_USDC || p.paused}
                  onClick={() => run(() => deposit(p, amountNum, referrer && !referrer.equals(pubkey!) ? referrer : null), `Deposited ${amountNum} USDC`)}
                >
                  {!connected ? 'Connect wallet' : busy ? 'Confirm in wallet…' : `Deposit & mint $${p.symbol}`}
                </button>
                <p className="text-[11px] text-pot-muted">Posts fresh Pyth prices in the same transaction, then mints at NAV. Min {MIN_DEPOSIT_USDC} USDC.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 flex justify-between text-xs text-pot-muted">
                    <span>Burn (${p.symbol})</span>
                    <button type="button" className="text-pot-green" onClick={() => setSharesIn(String(myShareNum))}>max {myShareNum.toFixed(4)}</button>
                  </span>
                  <input className="input" type="number" min={0} value={sharesIn} onChange={(e) => setSharesIn(e.target.value)} />
                </label>
                {exitPreview && (
                  <div className="rounded-lg bg-pot-dark p-3 text-xs text-pot-muted">
                    <p className="mb-1 text-white">You receive, in kind:</p>
                    <div className="flex justify-between"><span>USDC</span><span>{exitPreview.usdc.toFixed(2)}</span></div>
                    {exitPreview.legs.map((l) => (
                      <div key={l.symbol} className="flex justify-between"><span>{l.symbol}</span><span>{l.amount.toFixed(6)} (≈${l.usd.toFixed(2)})</span></div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={!connected || busy || sharesInNum <= 0 || sharesInNum > myShareNum + 1e-9}
                  onClick={() => run(() => exit(p, Math.floor(sharesInNum * 1e6)), `Burned ${sharesInNum} $${p.symbol}`)}
                >
                  {!connected ? 'Connect wallet' : busy ? 'Confirm in wallet…' : 'Burn & receive assets'}
                </button>
                <p className="text-[11px] text-pot-muted">Always available — no oracle, no pause. {EXIT_FEE_BPS / 100}% stays in the Pot.</p>
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
            <p className="mt-1 text-2xl font-bold text-white">{myShareNum.toFixed(4)} <span className="text-base text-pot-muted">${p.symbol}</span></p>
            <p className="text-sm text-pot-muted">≈ ${stats.data ? (myShareNum * stats.data.indexPrice).toFixed(2) : '—'}</p>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-white">Share & earn</h3>
            <p className="mt-1 text-xs text-pot-muted">Deposits through your link pay you 40% of the entry fee.</p>
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
      <p className="text-xs text-pot-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function DevnetFaucet() {
  const { pubkey } = usePotIndexActions()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-white">Devnet faucet</h3>
      <p className="mt-1 text-xs text-pot-muted">Get 1,000 test USDC to try this Pot. Devnet only, no real value.</p>
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
            setState('done')
          } catch (e) {
            setErr(e instanceof Error ? e.message : String(e))
            setState('error')
          }
        }}
      >
        {state === 'busy' ? 'Sending…' : state === 'done' ? 'Sent 1,000 tUSDC ✓' : 'Get test USDC'}
      </button>
      {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
    </div>
  )
}
