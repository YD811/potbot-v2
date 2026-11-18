'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useBagWallet } from '@/hooks/useBagWallet'
import { useQuery } from '@tanstack/react-query'
import { BAG_BUY_ENABLED } from '@/lib/bag/config'
import { OFFICIAL_SLUG, shortWallet, type BagWeights } from '@/lib/bag/recipes'
import { WeightBar } from './WeightBar'
import { useBagOrigin } from './useBagOrigin'


interface Me {
  joined: { slug: string; name: string; since: string; boughtUsd: number }[]
  referredBy: { wallet: string; since: string } | null
  referees: { wallet: string; since: string; bag: { slug: string; name: string } | null; boughtUsd: number; points: number; yourShare: number }[]
  totals: { referred: number; referredBought: number; referredBuyers: number }
  created: { slug: string; name: string; weights: BagWeights; official: boolean; joins: number; volumeUsd: number }[]
  buys: { signature: string; leg: string; side: 'buy' | 'sell'; usdc: number; bag: string | null; at: string }[]
  soldUsd: number
  points: { boughtUsd: number; buyConfirmed: number; buyPending: number; hold: number; referral: number; total: number }
}

const LEG_NAME: Record<string, string> = { btc: 'Bitcoin', ant: 'Anthropic', gold: 'Gold' }
const LEG_COLOR: Record<string, string> = { btc: '#F7931A', ant: '#E07A4F', gold: '#E9C46A' }

interface Holdings {
  positions: { leg: string; symbol: string; balance: number; valueUsd: number }[]
  totalUsd: number
  usdc: number
}
const int = (v: number) => Math.round(v).toLocaleString('en-US')
const usd = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-pot-muted">{sub}</p>}
    </div>
  )
}

export function BagDashboard() {
  const { address: wallet } = useBagWallet()
  const [copied, setCopied] = useState(false)

  const { data, isLoading, isError } = useQuery<Me>({
    queryKey: ['bag-me', wallet],
    queryFn: async () => {
      const r = await fetch(`/api/bag/me?wallet=${wallet}`)
      if (!r.ok) throw new Error('me')
      return r.json()
    },
    enabled: !!wallet,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  })

  const { data: holdings } = useQuery<Holdings>({
    queryKey: ['bag-holdings', wallet],
    queryFn: async () => {
      const r = await fetch(`/api/bag/holdings?wallet=${wallet}`)
      if (!r.ok) throw new Error('holdings')
      return r.json()
    },
    enabled: !!wallet,
    refetchInterval: 30_000,
  })

  const inviteSlug = data?.joined[0]?.slug ?? OFFICIAL_SLUG
  const origin = useBagOrigin()
  const invite = wallet ? `${origin}/bag/${inviteSlug}?ref=${wallet}` : ''

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-pot-green">BAG · Solana mainnet · Season 0</div>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Your BAG and points</h2>
        </div>
        <a href="/bag" className="btn-secondary">Buy more</a>
      </div>

      {!wallet ? (
        <div className="card p-6 text-pot-muted">Connect to see your BAG, your invites and your points.</div>
      ) : isLoading ? (
        <div className="card p-6 text-pot-muted">Loading…</div>
      ) : isError || !data ? (
        <div className="card p-6 text-pot-muted">Could not load your BAG right now. Refresh to try again.</div>
      ) : (
        <div className="space-y-8">
          {!BAG_BUY_ENABLED && (
            <p className="rounded-2xl border border-pot-accent/50 bg-pot-accent/10 p-4 text-sm text-pot-muted">
              Points start when buying opens after the Anthropic listing. Every wallet you bring before then is already counted for you.
            </p>
          )}

          {(() => {
            const value = holdings?.totalUsd ?? 0
            const bought = data.points.boughtUsd
            // Profit or loss on what went through PotBot: what it is worth now plus what was sold, minus what was paid.
            const pnl = value + data.soldUsd - bought
            const pnlPct = bought > 0 ? (pnl / bought) * 100 : 0
            const tone = pnl >= 0 ? 'text-pot-green' : 'text-pot-accent'
            const legs = (holdings?.positions ?? []).filter(p => p.valueUsd > 0.005)
            return (
              <section className="card p-6">
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">Your BAG is worth</p>
                    <p className="mt-1 font-display text-5xl font-semibold tabular-nums tracking-[-0.02em] text-white">{holdings ? usd(value) : '…'}</p>
                    {bought > 0 && holdings && (
                      <p className={`mt-1 text-sm tabular-nums ${tone}`}>
                        {pnl >= 0 ? '+' : '-'}{usd(Math.abs(pnl))} ({pnl >= 0 ? '+' : '-'}{Math.abs(pnlPct).toFixed(1)}%)
                        <span className="ml-2 text-pot-muted">on {usd(bought)} bought{data.soldUsd > 0 ? `, ${usd(data.soldUsd)} sold` : ''}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a href="/bag#buy" className="btn-primary">{bought > 0 ? 'Buy more' : 'Buy your first BAG'}</a>
                    {value > 0 && <a href="/bag#buy" className="btn-secondary">Sell</a>}
                  </div>
                </div>
                {legs.length > 0 && (
                  <>
                    <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-pot-border/40">
                      {legs.map(l => (
                        <span key={l.leg} style={{ width: `${(l.valueUsd / value) * 100}%`, background: LEG_COLOR[l.leg] ?? '#888' }} />
                      ))}
                    </div>
                    <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      {legs.map(l => (
                        <li key={l.leg} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-white">
                            <span className="h-2 w-2 rounded-full" style={{ background: LEG_COLOR[l.leg] ?? '#888' }} aria-hidden />
                            {LEG_NAME[l.leg] ?? l.leg}
                          </span>
                          <span className="tabular-nums text-pot-muted">{usd(l.valueUsd)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-4 text-xs text-pot-muted">
                  Live value of the Bitcoin, Anthropic and gold tokens in this wallet. They are in your wallet, not with PotBot.
                  {holdings && holdings.usdc > 0 ? ` You also have ${usd(holdings.usdc)} USDC ready to spend.` : ''}
                </p>
              </section>
            )
          })()}

          <section className="grid gap-3 sm:grid-cols-2">
            <Stat
              label="BAG Points"
              value={int(data.points.total + data.points.buyPending)}
              sub={data.points.buyPending > 0
                ? `${int(data.points.total)} confirmed · ${int(data.points.buyPending)} pending, confirmed 7 days after a buy if you still hold half`
                : `Confirmed: buy ${int(data.points.buyConfirmed)} · hold ${int(data.points.hold)} · invites ${int(data.points.referral)}`}
            />
            <Stat
              label="People you brought"
              value={int(data.totals.referred)}
              sub={data.totals.referred > 0 ? `${data.totals.referredBuyers} bought, ${usd(data.totals.referredBought)} in total · you get +10% of their points` : 'Share your link below. You get +10% of their points.'}
            />
          </section>

          <section className="card p-5">
            <h2 className="font-display text-2xl font-semibold text-white">Invite and earn points</h2>
            <p className="mt-1 text-sm text-pot-muted">
              Wallets that join through your link are linked to you for good. You earn +10% of the BAG Points they earn. They lose nothing.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="flex-1 truncate rounded-lg bg-pot-dark px-3 py-2 text-xs text-white">{invite}</code>
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm"
                onClick={() => { navigator.clipboard?.writeText(invite).then(() => setCopied(true)).catch(() => {}) }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            {data.referredBy && (
              <p className="mt-3 text-xs text-pot-muted">You were invited by {shortWallet(data.referredBy.wallet)} on {day(data.referredBy.since)}.</p>
            )}
            {data.referees.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-pot-border text-left font-mono text-xs uppercase tracking-[0.1em] text-pot-muted">
                      <th className="py-2 pr-4 font-normal">Wallet</th>
                      <th className="py-2 pr-4 font-normal">BAG</th>
                      <th className="py-2 pr-4 font-normal">Since</th>
                      <th className="py-2 pr-4 text-right font-normal">Bought</th>
                      <th className="py-2 text-right font-normal">Your points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referees.map(r => (
                      <tr key={r.wallet} className="border-b border-pot-border/60 last:border-0">
                        <td className="py-2 pr-4 font-mono text-white">{shortWallet(r.wallet)}</td>
                        <td className="py-2 pr-4">{r.bag ? <Link href={`/bag/${r.bag.slug}`} className="text-pot-accent underline">{r.bag.name}</Link> : <span className="text-pot-muted">—</span>}</td>
                        <td className="py-2 pr-4 text-pot-muted">{day(r.since)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-white">{usd(r.boughtUsd)}</td>
                        <td className="py-2 text-right tabular-nums text-pot-green">+{int(r.yourShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.joined.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-semibold text-white">BAGs you are in</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {data.joined.map(j => (
                  <li key={j.slug}>
                    <Link href={`/bag/${j.slug}`} className="card flex items-center justify-between gap-3 p-4 transition hover:border-pot-accent">
                      <span className="min-w-0 truncate font-semibold text-white">{j.name}</span>
                      <span className="shrink-0 font-mono text-sm text-pot-muted">{usd(j.boughtUsd)} bought · since {day(j.since)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl font-semibold text-white">Your trades</h2>
            {data.buys.length === 0 ? (
              <div className="card mt-4 p-5 text-sm text-pot-muted">No trades yet.{BAG_BUY_ENABLED ? ' Your first buy shows up here within a minute.' : ''}</div>
            ) : (
              <div className="card mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-pot-border text-left font-mono text-xs uppercase tracking-[0.1em] text-pot-muted">
                      <th className="px-4 py-3 font-normal">When</th>
                      <th className="px-4 py-3 font-normal">Side</th>
                      <th className="px-4 py-3 font-normal">Asset</th>
                      <th className="px-4 py-3 font-normal">BAG</th>
                      <th className="px-4 py-3 text-right font-normal">USDC</th>
                      <th className="px-4 py-3 text-right font-normal">Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buys.map(b => (
                      <tr key={b.signature} className="border-b border-pot-border/60 last:border-0">
                        <td className="px-4 py-3 text-pot-muted">{day(b.at)}</td>
                        <td className={`px-4 py-3 ${b.side === 'sell' ? 'text-pot-accent' : 'text-pot-green'}`}>{b.side === 'sell' ? 'Sold' : 'Bought'}</td>
                        <td className="px-4 py-3 text-white">{LEG_NAME[b.leg] ?? b.leg}</td>
                        <td className="px-4 py-3">{b.bag ? <Link href={`/bag/${b.bag}`} className="text-pot-accent underline">{b.bag}</Link> : <span className="text-pot-muted">—</span>}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-white">{usd(b.usdc)}</td>
                        <td className="px-4 py-3 text-right"><a href={`https://solscan.io/tx/${b.signature}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-pot-accent underline">{b.signature.slice(0, 8)}…</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>


          <section>
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-white">BAGs you built</h2>
              <Link href="/bag#build" className="text-sm text-pot-accent underline">Build a BAG</Link>
            </div>
            {data.created.length === 0 ? (
              <div className="card mt-4 p-5 text-sm text-pot-muted">None yet. Wallets that join your BAG without an invite link are linked to you.</div>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.created.map(b => (
                  <li key={b.slug}>
                    <Link href={`/bag/${b.slug}`} className="card flex flex-col gap-3 p-4 transition hover:border-pot-accent sm:flex-row sm:items-center">
                      <span className="min-w-0 flex-1 truncate font-semibold text-white">{b.name}</span>
                      <WeightBar weights={b.weights} className="w-full sm:w-40" />
                      <span className="shrink-0 font-mono text-sm text-white">{b.joins}<span className="ml-1 text-xs text-pot-muted">joined</span></span>
                      <span className="shrink-0 font-mono text-sm text-white">{usd(b.volumeUsd)}<span className="ml-1 text-xs text-pot-muted">vol</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-pot-muted">
            How points work: a buy gives 10 points per $1 (×2 in Genesis), pending for 7 days and confirmed only if you still hold at least half of what you bought. Holding gives 1 point per $1 per day, counted once a day. Selling gives no points. Points have no monetary value, are not a token and carry no promise of any airdrop or payout.
          </p>
        </div>
      )}
    </>
  )
}
