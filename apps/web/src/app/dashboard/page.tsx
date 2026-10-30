'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PageHeader } from '@/components/PageHeader'
import { ConnectButton } from '@/components/ConnectButton'
import { usePotIndexProgram, usePots, useAllPotStats, useNavHistoryAll } from '@/hooks/usePotIndex'
import { Sparkline } from '@/components/pot-index/NavChart'
import { fetchPotActivity, fetchWalletPosition, type PotEvent, type PotView } from '@/lib/pot-index/client'
import { plantSrc, potSeries, stageForUsd, STAGES } from '@/lib/pot-index/garden'
import { ENTRY_FEE_BPS } from '@/lib/pot-index/client'
import { explorerTx } from '@/lib/pot-index/registry'

const usd = (v: number, d = 2) => `$${v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`
const CREATOR_SHARE = 0.4 // of the entry fee

/**
 * My Dashboard: only what belongs to the connected wallet. Positions with the share of each
 * POTFolio, the POTFolios this wallet created with the fees they earned, and the wallet's own
 * activity. Everything is read from the chain (token accounts + transaction history).
 */
export default function DashboardPage() {
  const { connection, pubkey } = usePotIndexProgram()
  const pots = usePots()
  const stats = useAllPotStats(pots.data)
  const series = useNavHistoryAll()
  const me = pubkey?.toBase58()

  const data = useQuery({
    queryKey: ['pot-index', 'dashboard', me, (pots.data ?? []).map((p) => p.address.toBase58()).join(',')],
    enabled: !!pubkey && !!pots.data && pots.data.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const list = pots.data!
      const atas = list.map((p) => getAssociatedTokenAddressSync(p.indexMint, pubkey!))
      const infos = await connection.getMultipleAccountsInfo(atas, 'confirmed')
      const positions: { pot: PotView; shares: number; costUsd: number; realizedUsd: number; depositedUsd: number; withdrawnUsd: number }[] = []
      for (let i = 0; i < list.length; i++) {
        if (!infos[i]) continue
        const bal = await connection.getTokenAccountBalance(atas[i], 'confirmed').catch(() => null)
        const shares = Number(bal?.value.uiAmount ?? 0)
        const pos = await fetchWalletPosition(connection, list[i], pubkey!).catch(() => null)
        if (shares <= 0 && !(pos && pos.events > 0)) continue
        positions.push({ pot: list[i], shares, costUsd: pos?.costUsd ?? 0, realizedUsd: pos?.realizedUsd ?? 0, depositedUsd: pos?.depositedUsd ?? 0, withdrawnUsd: pos?.withdrawnUsd ?? 0 })
      }
      // POTFolios this wallet created: entry fees earned (40% of each deposit's fee), from the Pot's history.
      const mine = list.filter((p) => p.creator.equals(pubkey!))
      const created: { pot: PotView; deposits: number; feesUsd: number; events: PotEvent[] }[] = []
      for (const p of mine) {
        const ev = await fetchPotActivity(connection, p, 100).catch(() => [] as PotEvent[])
        const deps = ev.filter((e): e is Extract<PotEvent, { kind: 'deposit' }> => e.kind === 'deposit')
        created.push({ pot: p, deposits: deps.length, feesUsd: deps.reduce((s, e) => s + e.feeUsdc * CREATOR_SHARE, 0), events: ev })
      }
      // The wallet's own activity across the POTFolios it touched.
      type Mine = (Extract<PotEvent, { kind: 'deposit' }> | Extract<PotEvent, { kind: 'exit' }>) & { pot: PotView }
      const activity: Mine[] = []
      for (const h of positions) {
        const ev = await fetchPotActivity(connection, h.pot, 60).catch(() => [] as PotEvent[])
        for (const e of ev) if ((e.kind === 'deposit' || e.kind === 'exit') && e.user === me) activity.push({ ...e, pot: h.pot } as Mine)
      }
      activity.sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
      return { positions, created, activity: activity.slice(0, 20) }
    },
  })

  const rows = useMemo(
    () =>
      (data.data?.positions ?? []).map((h) => {
        const st = stats.data?.[h.pot.address.toBase58()]
        const value = h.shares * (st?.indexPrice ?? 1)
        const pnl = h.costUsd > 0 ? value - h.costUsd : 0
        const share = st && st.supply > 0 ? (h.shares / st.supply) * 100 : 0
        return { ...h, value, pnl, pct: h.costUsd > 0 ? (pnl / h.costUsd) * 100 : 0, share, nav: st?.navUsd ?? 0 }
      }),
    [data.data, stats.data],
  )
  const total = rows.reduce((a, r) => a + r.value, 0)
  const totalPnl = rows.reduce((a, r) => a + r.pnl, 0)
  const totalRealized = rows.reduce((a, r) => a + r.realizedUsd, 0)
  const creatorFees = (data.data?.created ?? []).reduce((a, c) => a + c.feesUsd, 0)
  const tone = (v: number) => (v >= 0 ? 'text-pot-green' : 'text-pot-accent')
  const sign = (v: number) => (v >= 0 ? '+' : '-')

  const fmtShares = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 4 })
  const createdCount = data.data?.created.length ?? 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Dashboard"
        title={pubkey ? 'Yours, from the chain' : 'Your dashboard'}
        lede={pubkey ? 'Only what this wallet holds, created and did. Nothing here is stored by PotBot.' : 'Connect a wallet to see your POTFolios, your entry prices and what you earned.'}
      />

      {!pubkey && (
        <div className="relative min-h-[460px] overflow-hidden rounded-[32px] border border-pot-border bg-pot-card">
          <div aria-hidden className="pointer-events-none select-none p-6 opacity-60 blur-[3px] sm:p-8">
            <div className="grid gap-3 sm:grid-cols-4">
              {['Total value', 'P&L', 'POTFolios held', 'Earned'].map((l) => (
                <div key={l} className="rounded-2xl border border-pot-border p-4" style={{ background: 'var(--pot-bg)' }}>
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-pot-muted">{l}</div>
                  <div className="v3-skeleton mt-2 h-7 w-24" />
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {(pots.data ?? []).slice(0, 3).map((p) => (
                <div key={p.address.toBase58()} className="flex items-center gap-3 rounded-2xl border border-pot-border p-3" style={{ background: 'var(--pot-bg)' }}>
                  <img src={plantSrc(potSeries(p), 1)} alt="" className="h-9 w-9 rounded-xl object-contain" />
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className="v3-skeleton ml-auto h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="v3-rise max-w-md rounded-3xl border border-pot-border bg-pot-card p-7 text-center shadow-[0_30px_60px_-30px_rgba(0,0,0,.45)]">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Everything you hold, in one view</h2>
              <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm text-pot-muted">
                {['Value and P&L of every POTFolio you hold', 'What you earned as a creator and referrer', 'Your invite links, ready to copy'].map((t) => (
                  <li key={t} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pot-accent" />{t}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap justify-center gap-3 [&>button]:!justify-center">
                <ConnectButton />
                <Link href="/portfolios" className="btn-secondary">Explore POTFolios</Link>
              </div>
              <p className="mt-3 text-xs text-pot-muted">Read from the chain. PotBot stores nothing about your wallet.</p>
            </div>
          </div>
        </div>
      )}

      {pubkey && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Total value" value={usd(total)} />
            <Tile label="P&L" value={`${sign(totalPnl)}${usd(Math.abs(totalPnl))}`} tone={tone(totalPnl)} hint={`realized ${sign(totalRealized)}${usd(Math.abs(totalRealized))}`} />
            <Tile label="POTFolios held" value={String(rows.length)} />
            <Tile label="Created" value={String(createdCount)} hint={`${usd(creatorFees)} earned, ${CREATOR_SHARE * 100}% of each ${ENTRY_FEE_BPS / 100}% entry fee`} />
          </div>

          <section className="mb-6 rounded-3xl border border-pot-border bg-pot-card p-6">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Your POTFolios</h2>
            {data.isLoading && <p className="mt-3 text-[15px] text-pot-muted">Reading your wallet.</p>}
            {data.data && rows.length === 0 && (
              <div className="mt-4 rounded-2xl border border-pot-border p-6 text-center">
                <p className="text-[15px] text-pot-muted">Nothing here yet.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Link href="/portfolios" className="btn-primary">Explore POTFolios</Link>
                  <Link href="/portfolios/new" className="btn-secondary">Build your own</Link>
                </div>
              </div>
            )}
            {rows.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="text-left font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">
                      <th className="py-2 pr-4 font-normal">POTFolio</th>
                      <th className="hidden py-2 pr-4 text-right font-normal sm:table-cell">Tokens</th>
                      <th className="hidden py-2 pr-4 text-right font-normal sm:table-cell">Share</th>
                      <th className="hidden py-2 pr-4 font-normal md:table-cell">7d</th>
                      <th className="py-2 pr-4 text-right font-normal">Value</th>
                      <th className="py-2 text-right font-normal">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pot-border">
                    {rows.map((r) => {
                      const lvl = stageForUsd(r.nav)
                      const href = `/portfolios/${r.pot.indexMint.toBase58()}`
                      return (
                        <tr key={r.pot.address.toBase58()} className="transition hover:bg-pot-dark/60">
                          <td className="py-3 pr-4">
                            <Link href={href} className="flex items-center gap-3">
                              <img src={plantSrc(potSeries(r.pot), lvl)} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-white">{r.pot.name} <span className="font-mono text-sm text-pot-muted">${r.pot.symbol}</span></span>
                                <span className="block text-xs text-pot-muted">
                                  avg entry <span className="font-mono tabular-nums">{r.shares > 0 && r.costUsd > 0 ? usd(r.costUsd / r.shares, 4) : '-'}</span>, Level {lvl} {STAGES[lvl - 1].name}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td className="hidden py-3 pr-4 text-right font-mono tabular-nums text-white sm:table-cell">{fmtShares(r.shares)}</td>
                          <td className="hidden py-3 pr-4 text-right font-mono tabular-nums text-white sm:table-cell">{r.share.toFixed(2)}%</td>
                          <td className="hidden w-28 py-3 pr-4 md:table-cell">
                            <Sparkline points={series.data?.[r.pot.indexMint.toBase58()] ?? []} width={112} height={32} fill={false} className="h-8 w-28" />
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums text-white">
                            {usd(r.value)}
                            <span className="block text-xs text-pot-muted">of {usd(r.nav, 0)}</span>
                          </td>
                          <td className={`py-3 text-right font-mono tabular-nums ${tone(r.pnl)}`}>
                            {r.costUsd > 0 ? (
                              <>
                                {sign(r.pnl)}{usd(Math.abs(r.pnl))}
                                <span className="block text-xs">{r.pnl >= 0 ? '+' : ''}{r.pct.toFixed(2)}%</span>
                              </>
                            ) : (
                              <span className="text-pot-muted">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mb-6 rounded-3xl border border-pot-border bg-pot-card p-6">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Invite and earn</h2>
            <p className="mt-2 text-[15px] text-pot-muted">Deposits made through your link pay you <span className="font-mono tabular-nums text-white">{CREATOR_SHARE * 100}%</span> of the <span className="font-mono tabular-nums text-white">{ENTRY_FEE_BPS / 100}%</span> entry fee, on-chain, in the same transaction. One link per POTFolio.</p>
            <div className="mt-4 space-y-2">
              {(rows.length ? rows.map((r) => r.pot) : (pots.data ?? []).slice(0, 3)).map((p) => {
                const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://potbot.fun'}/portfolios/${p.indexMint.toBase58()}?ref=${me}`
                return (
                  <div key={p.address.toBase58()} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate font-mono text-sm text-white">${p.symbol}</span>
                    <input readOnly value={link} className="input flex-1 truncate font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" className="btn-secondary shrink-0" onClick={() => { void navigator.clipboard.writeText(link); toast.success(`Link for $${p.symbol} copied`) }}>Copy</button>
                  </div>
                )
              })}
            </div>
          </section>

          {data.data && data.data.created.length > 0 && (
            <section className="mb-6 rounded-3xl border border-pot-border bg-pot-card p-6">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">POTFolios you created</h2>
              <div className="mt-3 divide-y divide-pot-border">
                {data.data.created.map((c) => {
                  const st = stats.data?.[c.pot.address.toBase58()]
                  return (
                    <Link key={c.pot.address.toBase58()} href={`/portfolios/${c.pot.indexMint.toBase58()}`} className="flex items-center gap-3 py-3 transition hover:bg-pot-dark/60">
                      <img src={plantSrc(potSeries(c.pot), stageForUsd(st?.navUsd ?? 0))} alt="" className="h-9 w-9 rounded-xl object-contain" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-white">{c.pot.name} <span className="font-mono text-sm text-pot-muted">${c.pot.symbol}</span></div>
                        <div className="text-xs text-pot-muted">
                          TVL <span className="font-mono tabular-nums">{usd(st?.navUsd ?? 0, 0)}</span>, <span className="font-mono tabular-nums">{st?.holders ?? 0}</span> holders, <span className="font-mono tabular-nums">{c.deposits}</span> deposits
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">fees earned</div>
                        <div className="font-mono font-semibold tabular-nums text-pot-green">{usd(c.feesUsd)}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {data.data && data.data.activity.length > 0 && (
            <section className="rounded-3xl border border-pot-border bg-pot-card p-6">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Your activity</h2>
              <ul className="mt-3 divide-y divide-pot-border text-[15px]">
                {data.data.activity.map((e) => (
                  <li key={e.sig} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-white">
                      {e.kind === 'deposit'
                        ? <>Deposited <span className="font-mono tabular-nums">{usd(e.amountUsdc)}</span> for <span className="font-mono tabular-nums">{fmtShares(e.shares)} ${e.pot.symbol}</span></>
                        : <>Redeemed <span className="font-mono tabular-nums">{fmtShares(e.shares)} ${e.pot.symbol}</span>{e.toUsdc ? <> for <span className="font-mono tabular-nums">{usd(e.usdcOut)}</span></> : ' for the assets'}</>}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-pot-muted">
                      {e.time ? new Date(e.time * 1000).toLocaleString() : ''}{' '}
                      <a className="ml-1 text-white underline underline-offset-4" href={explorerTx(e.sig)} target="_blank" rel="noreferrer">tx</a>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Tile({ label, value, tone, hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="v3-rise rounded-3xl border border-pot-border bg-pot-card p-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-pot-muted">{label}</div>
      <div className={`mt-1.5 font-display text-3xl font-semibold tabular-nums tracking-[-0.02em] ${tone ?? 'text-white'}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-pot-muted">{hint}</div>}
    </div>
  )
}
