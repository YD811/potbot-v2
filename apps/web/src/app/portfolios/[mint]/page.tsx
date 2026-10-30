'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { PublicKey } from '@solana/web3.js'
import {
  useMyIndexBalance,
  useMyUsdcBalance,
  usePot,
  usePotIndexActions,
  usePotStats,
  useAssetPublishTimes,
  useWalletPosition,
  useNavHistory,
} from '@/hooks/usePotIndex'
import { estimateShares, EXIT_FEE_BPS, ENTRY_FEE_BPS, MIN_DEPOSIT_USDC } from '@/lib/pot-index/client'
import { assetByMint, explorerAddress, explorerTx, POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { CompositionTable } from '@/components/pot-index/CompositionTable'
import { ActivityFeed } from '@/components/pot-index/ActivityFeed'
import { reportClientError } from '@/lib/pot-index/client-log'
import { friendlyError } from '@/lib/pot-index/errors'
import { DevnetFaucet } from '@/components/pot-index/DevnetFaucet'
import { NavChart } from '@/components/pot-index/NavChart'
import { PositionCard } from '@/components/pot-index/PositionCard'
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
  // Referral: first touch wins and is remembered per POTFolio for 30 days, so the referrer is still
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
  // Prices are served by a fallback source while the Pyth key is not entitled: nothing can be minted until Pyth is back.
  const feedDown = publishTimes.data?.source === 'coingecko'
  // Any leg whose Pyth feed is older than the program's max age blocks deposits — stocks outside market hours.
  const stalePrices = useMemo(() => {
    if (!pot.data || !publishTimes.data) return false
    const now = Date.now() / 1000
    return pot.data.legs.some((l) => now - (publishTimes.data!.times[l.mint.toBase58()] ?? 0) > 300)
  }, [pot.data, publishTimes.data])
  const myShares = useMyIndexBalance(pot.data)
  const myUsdc = useMyUsdcBalance()
  const { deposit, exit, exitUsdc, connected, pubkey } = usePotIndexActions()

  const [tab, setTab] = useState<'deposit' | 'exit'>('deposit')
  const [amount, setAmount] = useState('100')
  const [exitPct, setExitPct] = useState(100)
  const [exitMode, setExitMode] = useState<'assets' | 'usdc'>('usdc')
  const position = useWalletPosition(pot.data)
  const navHist = useNavHistory(pot.data?.indexMint.toBase58() ?? '', '7d')
  const nav7d = navHist.data?.stats?.change7d ?? null
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (pot.data) document.title = `${pot.data.name} ($${pot.data.symbol}) · PotBot`
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
    const id = toast.loading('Confirm in your wallet…')
    const started = Date.now()
    try {
      const r = await fn()
      const sig = Array.isArray(r) ? r[r.length - 1] : r
      const text = typeof okText === 'function' ? okText(r) : okText
      setMsg({ ok: true, text, sig })
      toast.success(
        <span>
          {text} <span className="opacity-70">· {((Date.now() - started) / 1000).toFixed(0)} s</span>
          {sig && <a className="ml-1 underline" href={explorerTx(sig)} target="_blank" rel="noreferrer">tx ↗</a>}
        </span>,
        { id, duration: 7000 },
      )
    } catch (e) {
      reportClientError('pot-page', e, { pot: mint, wallet: pubkey?.toBase58() })
      const text = friendlyError(e, { devnet: POT_INDEX_SETTINGS.cluster !== 'mainnet-beta' })
      setMsg({ ok: false, text })
      toast.error(text, { id, duration: 8000 })
    } finally {
      setBusy(false)
    }
  }


  if (pot.isLoading) return <div className="mx-auto max-w-5xl px-4 py-10 text-[15px] text-pot-muted">Loading POTFolio.</div>
  if (!pot.data)
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-[15px] text-pot-muted">This POTFolio was not found. Check the link, or browse the list.</p>
        <Link href="/portfolios" className="btn-secondary mt-4 inline-block">All POTFolios</Link>
      </div>
    )
  const p = pot.data
  const pageUrl = typeof window !== 'undefined' ? `${window.location.origin}/portfolios/${mint}` : ''
  const shareLink = refLink || pageUrl

  const copyShareLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
    } catch {
      const el = document.getElementById('potfolio-share-link') as HTMLInputElement | null
      if (el) {
        el.focus()
        el.select()
        try {
          document.execCommand('copy')
        } catch {
          /* the text stays selected so it can be copied by hand */
        }
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {search.get('created') && (
        <div className="mb-6 rounded-2xl border border-pot-border bg-pot-card px-5 py-4 text-[15px] text-white">
          Your POTFolio is live. Share the link at the bottom of this page: every deposit through it pays you the referral share.
        </div>
      )}
      {/* Mobile: a slim title so the trade card sits right under it */}
      <div className="mb-4 flex items-center gap-3 lg:hidden">
        <PlantBadge pot={p} navUsd={stats.data?.navUsd} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold tracking-[-0.02em] text-white">{p.name}</h1>
          <p className="font-mono text-xs text-pot-muted">${p.symbol}{stats.data ? ` · $${stats.data.indexPrice.toFixed(4)}` : ''}{nav7d != null ? ` · ${nav7d >= 0 ? '+' : ''}${nav7d.toFixed(2)}% 7d` : ''}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left: POTFolio info */}
        <section className="space-y-6">
          {/* Hero */}
          <header className="v3-rise relative hidden overflow-hidden lg:block rounded-[32px] border border-pot-border bg-pot-card p-6 sm:p-8">
            <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
              <PlantBadge pot={p} navUsd={stats.data?.navUsd} size={88} />
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">POTFolio · ${p.symbol}</p>
                <h1 className="mt-1.5 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[44px]">{p.name}</h1>
                <p className="mt-2 font-mono text-xs tabular-nums text-pot-muted">
                  by <a href={explorerAddress(p.creator.toBase58())} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-white hover:underline">{p.creator.toBase58().slice(0, 4)}…{p.creator.toBase58().slice(-4)}</a> · since {new Date(p.createdAt * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {stats.data && (() => {
                  const lvl = stageForUsd(stats.data.navUsd)
                  const cur = STAGES[lvl - 1]
                  const next = STAGES[lvl]
                  const prog = next ? Math.min(1, Math.max(0, (stats.data.navUsd - cur.minUsd) / (next.minUsd - cur.minUsd))) : 1
                  return (
                    <div className="mt-4 max-w-sm">
                      <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-pot-muted">
                        <span className="text-pot-green">Level {lvl} · {cur.name}</span>
                        <span>{next ? `${next.name} at ${usdShort(next.minUsd)}` : 'Top level'}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pot-border">
                        <div className="comp-seg h-full rounded-full bg-pot-green" style={{ width: `${Math.max(3, prog * 100)}%` }} />
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
            {(p.paused || stalePrices) && (
              <p className="mt-5 border-t border-pot-border pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-pot-muted">
                {p.paused ? 'Deposits paused by the creator · redeeming works' : feedDown ? 'On devnet · deposits reopen with the new price feed · redeeming works' : 'Market closed · deposits reopen with live prices · redeeming works'}
              </p>
            )}
          </header>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Token price" value={stats.data ? `$${stats.data.indexPrice.toFixed(4)}` : '—'} sub={nav7d != null ? `${nav7d >= 0 ? '+' : ''}${nav7d.toFixed(2)}% over 7d` : undefined} tone={nav7d == null ? undefined : nav7d >= 0 ? 'text-pot-green' : 'text-pot-accent'} />
            <Stat label="Pot value" value={stats.data ? `$${stats.data.navUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'} />
            <Stat label="Supply" value={stats.data ? `${stats.data.supply.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'} sub={`$${p.symbol}`} />
            <Stat label="Entry fee" value={`${ENTRY_FEE_BPS / 100}%`} sub="40% to the creator" />
          </div>

          <NavChart mint={p.indexMint.toBase58()} symbol={p.symbol} entry={position.data && position.data.shares > 0 && position.data.costUsd > 0 ? position.data.costUsd / position.data.shares : null} />

          <CompositionTable pot={p} actualUsd={stats.data?.legsUsd} cashUsd={stats.data ? stats.data.cash / 1e6 : undefined} legAmounts={stats.data?.legs} />

          <details className="group rounded-3xl border border-pot-border bg-pot-card p-6 text-[15px] text-pot-muted">
            <summary className="flex cursor-pointer list-none select-none items-center justify-between font-display text-xl font-semibold tracking-[-0.02em] text-white">How this POTFolio works<span aria-hidden className="text-2xl font-normal text-pot-muted transition group-open:rotate-45">+</span></summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Deposit USDC and the POTFolio mints ${p.symbol} at the basket&apos;s value per token. Entry fee {ENTRY_FEE_BPS / 100}%.</li>
              <li>Redeem ${p.symbol} and you receive your share of every asset inside, or USDC. {EXIT_FEE_BPS / 100}% stays for the holders who remain.</li>
              <li>The token is a normal SPL token: hold it, send it, trade it.</li>
              <li>There is no withdraw instruction: only your own redemption moves the assets out.</li>
            </ul>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
              <a className="text-pot-muted underline-offset-2 transition hover:text-white hover:underline" href={explorerAddress(p.address.toBase58())} target="_blank" rel="noreferrer">POTFolio account</a>
              <a className="text-pot-muted underline-offset-2 transition hover:text-white hover:underline" href={explorerAddress(p.indexMint.toBase58())} target="_blank" rel="noreferrer">Token mint</a>
              <a className="text-pot-muted underline-offset-2 transition hover:text-white hover:underline" href={explorerAddress(POT_INDEX_SETTINGS.programId)} target="_blank" rel="noreferrer">Program</a>
            </p>
          </details>

          <ActivityFeed pot={p} />
        </section>

        {/* Right: deposit / redeem */}
        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-24 lg:self-start">
          <div className="v3-rise rounded-[28px] border-2 border-pot-accent/60 bg-pot-card p-6 shadow-[0_30px_60px_-34px_rgba(224,122,79,.55)] sm:p-7">
            <p className="mb-4 font-display text-2xl font-semibold tracking-[-0.02em] text-white">{tab === 'deposit' ? <>Buy <span className="text-pot-accent">${p.symbol}</span></> : <>Redeem <span className="text-pot-accent">${p.symbol}</span></>}</p>
            <div className="relative mb-5 grid grid-cols-2 rounded-full border border-pot-border p-1">
              <span aria-hidden className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-pot-accent transition-transform duration-500 ease-pot" style={{ transform: tab === 'deposit' ? 'translateX(0)' : 'translateX(100%)' }} />
              {(['deposit', 'exit'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={`relative z-[1] rounded-full py-1.5 text-sm font-semibold transition-colors duration-300 ${tab === t ? 'text-pot-dark' : 'text-pot-muted hover:text-white'}`}>
                  {t === 'deposit' ? 'Deposit' : 'Redeem'}
                </button>
              ))}
            </div>

            {tab === 'deposit' ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 flex justify-between font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">
                    <span>Amount, USDC</span>
                    <span className="tabular-nums">Balance {myUsdc.data?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}</span>
                  </span>
                  <input className="input font-mono text-xl tabular-nums" type="number" min={MIN_DEPOSIT_USDC} value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">You receive</div>
                  <div className="mt-1 font-mono text-3xl tabular-nums text-white">
                    {estShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} <span className="text-lg text-pot-muted">${p.symbol}</span>
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-pot-muted"><span>Entry fee {ENTRY_FEE_BPS / 100}%</span><span>{(amountNum * ENTRY_FEE_BPS / 10_000).toFixed(2)} USDC</span></div>
                  {referrer && <div className="flex justify-between font-mono text-xs text-pot-muted"><span>Referred by</span><span>{referrer.toBase58().slice(0, 4)}…{referrer.toBase58().slice(-4)}</span></div>}
                </div>
                {!connected ? (
                  <div className="[&>button]:!w-full [&>button]:!justify-center"><ConnectButton /></div>
                ) : (
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={!connected || busy || amountNum < MIN_DEPOSIT_USDC || p.paused || stalePrices || (myUsdc.data !== undefined && amountNum > myUsdc.data)}
                  onClick={() =>
                    run(
                      () => deposit(p, amountNum, referrer && !referrer.equals(pubkey!) ? referrer : null),
                      (r) => {
                        const n = (r as unknown as { allocated?: number }).allocated ?? 0
                        return n > 0 ? `Deposited ${amountNum} USDC and bought ${n} of ${p.legs.length} assets` : `Deposited ${amountNum} USDC. The basket is bought next.`
                      },
                    )
                  }
                >
                  {busy ? 'Confirm in wallet' : 'Deposit'}
                </button>
                )}
                {connected && stalePrices && !p.paused && (
                  <p className="text-sm text-pot-muted">The market is closed, so deposits wait for live prices. Redeeming for the assets works now.</p>
                )}
                {connected && myUsdc.data !== undefined && amountNum > myUsdc.data && (
                  <p className="text-sm text-pot-muted">You have {myUsdc.data.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC in this wallet. Lower the amount{POT_INDEX_SETTINGS.cluster !== 'mainnet-beta' ? ' or get test USDC below' : ''}.</p>
                )}
                <p className="text-sm text-pot-muted">Minted at the basket&apos;s value. The basket is bought right after. Minimum {MIN_DEPOSIT_USDC} USDC.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* What you want back */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExitMode('usdc')}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${exitMode === 'usdc' ? 'border-pot-accent bg-pot-accent text-pot-dark' : 'border-pot-border text-pot-muted hover:text-white'}`}
                  >
                    USDC
                  </button>
                  <button
                    type="button"
                    onClick={() => setExitMode('assets')}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${exitMode === 'assets' ? 'border-pot-accent bg-pot-accent text-pot-dark' : 'border-pot-border text-pot-muted hover:text-white'}`}
                  >
                    The assets
                  </button>
                </div>

                {/* How much: percent slider + max */}
                <div>
                  <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">
                    <span className="tabular-nums">Redeem {exitPct}% of your ${p.symbol}</span>
                    <button type="button" className="text-white underline-offset-2 hover:underline" onClick={() => setExitPct(100)}>Max</button>
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
                  <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-pot-muted">
                    {[25, 50, 75, 100].map((q) => (
                      <button key={q} type="button" onClick={() => setExitPct(q)} className={q === exitPct ? 'text-white' : 'hover:text-white'}>{q}%</button>
                    ))}
                  </div>
                  <p className="mt-3 font-mono text-base tabular-nums text-white">
                    {sharesInNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${p.symbol}
                    {stats.data && <span className="text-pot-muted"> ≈ ${(sharesInNum * stats.data.indexPrice).toFixed(2)}</span>}
                  </p>
                </div>

                {exitPreview && exitMode === 'assets' && (
                  <div>
                    <div className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">You receive</div>
                    <div className="mt-1 font-mono text-3xl tabular-nums text-white">≈ ${(exitPreview.usdc + exitPreview.legs.reduce((a, l) => a + l.usd, 0)).toFixed(2)} <span className="text-lg text-pot-muted">in {exitPreview.legs.length + (exitPreview.usdc > 0.005 ? 1 : 0)} tokens</span></div>
                    <div className="mt-2 space-y-1 font-mono text-xs tabular-nums text-pot-muted">
                      {exitPreview.legs.map((l) => (
                        <div key={l.symbol} className="flex justify-between"><span className="text-white">{l.symbol}</span><span>{l.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} <span>≈ ${l.usd.toFixed(2)}</span></span></div>
                      ))}
                      {exitPreview.usdc > 0.005 && <div className="flex justify-between"><span className="text-white">USDC</span><span>{exitPreview.usdc.toFixed(2)}</span></div>}
                    </div>
                    <PnlLine position={position.data} shares={sharesInNum} valueUsd={exitPreview.usdc + exitPreview.legs.reduce((a, l) => a + l.usd, 0)} />
                  </div>
                )}
                {exitPreview && exitMode === 'usdc' && (() => {
                  const sold = exitPreview.legs.reduce((a, l) => a + l.usd, 0)
                  const fee = sold * 0.001
                  const net = exitPreview.usdc + sold - fee
                  return (
                    <div>
                      <div className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">You receive</div>
                      <div className="mt-1 font-mono text-3xl tabular-nums text-white">≈ ${net.toFixed(2)} <span className="text-lg text-pot-muted">USDC</span></div>
                      <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-pot-muted"><span>Conversion fee 0.10%</span><span>−${fee.toFixed(2)}</span></div>
                      <PnlLine position={position.data} shares={sharesInNum} valueUsd={net} />
                      <details className="mt-2 text-sm text-pot-muted">
                        <summary className="cursor-pointer select-none">Details</summary>
                        <p className="mt-1">Your share of every asset is sold at the live price in the same transaction. If the sale would give less than the onchain minimum, nothing happens and you keep your tokens.{stalePrices ? ' The market is closed and live prices are needed. Choose "The assets" meanwhile.' : ''}</p>
                      </details>
                    </div>
                  )
                })()}
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
                  {busy ? 'Confirm in wallet' : 'Redeem'}
                </button>
                )}
                <p className="text-sm text-pot-muted">Exits cannot be paused. Minimum enforced onchain. {EXIT_FEE_BPS / 100}% stays for the holders who remain.</p>
              </div>
            )}

            {POT_INDEX_SETTINGS.cluster !== 'mainnet-beta' && (
              <div className="mt-5 border-t border-pot-border pt-4"><DevnetFaucet compact /></div>
            )}

            {msg && (
              <div className={`mt-4 border-t border-pot-border pt-3 text-sm ${msg.ok ? 'text-white' : 'text-pot-muted'}`}>
                {msg.ok ? msg.text : `The transaction did not go through. ${msg.text}`}
                {msg.sig && (
                  <>
                    {' · '}
                    <a className="underline-offset-2 hover:underline" href={explorerTx(msg.sig)} target="_blank" rel="noreferrer">View transaction</a>
                  </>
                )}
              </div>
            )}
          </div>

          <PositionCard pot={p} sharesBase={myShares.data} indexPrice={stats.data?.indexPrice} connected={connected} change7d={nav7d} />

        </aside>
      </div>

      {/* Share strip */}
      <div className="mt-8 rounded-3xl border border-pot-border bg-pot-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">Share this POTFolio</h2>
            <p className="mt-1 text-sm text-pot-muted">
              Invite and earn: 40% of the entry fee goes to the creator, referrers earn too.{' '}
              <Link href="/dashboard" className="text-white underline-offset-2 hover:underline">See your earnings</Link>
            </p>
            <input id="potfolio-share-link" className="input mt-3 font-mono text-xs" readOnly value={shareLink} aria-label="Link to this POTFolio" />
          </div>
          <button type="button" className="btn-primary shrink-0 md:w-auto" disabled={!shareLink} onClick={copyShareLink}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  )
}

function usdShort(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
  if (v >= 1_000) return `$${(v / 1_000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-pot-border bg-pot-card px-4 py-3.5">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-pot-muted">{label}</p>
      <p className="mt-1 break-words font-display text-2xl font-semibold tabular-nums text-white">{value}</p>
      {sub && <p className={`text-xs ${tone ?? 'text-pot-muted'}`}>{sub}</p>}
    </div>
  )
}

/** What this redemption realises against the wallet's average entry (cost basis from on-chain history). */
function PnlLine({ position, shares, valueUsd }: { position: { shares: number; costUsd: number } | undefined; shares: number; valueUsd: number }) {
  if (!position || position.shares <= 0 || shares <= 0) return null
  const costOfPart = (position.costUsd / position.shares) * Math.min(shares, position.shares)
  const pnl = valueUsd - costOfPart
  const pct = costOfPart > 0 ? (pnl / costOfPart) * 100 : 0
  const up = pnl >= 0
  return (
    <div className="mt-3 flex items-center justify-between border-t border-pot-border pt-2 font-mono text-xs tabular-nums">
      <span className="text-pot-muted">Since your entry (${costOfPart.toFixed(2)} in)</span>
      <span className={up ? 'text-pot-green' : 'text-pot-muted'}>{up ? '+' : '−'}${Math.abs(pnl).toFixed(2)} ({up ? '+' : ''}{pct.toFixed(2)}%)</span>
    </div>
  )
}
