'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { BAG_BUY_ENABLED } from '@/lib/bag/config'
import { OFFICIAL_SLUG, shortWallet, type BagWeights } from '@/lib/bag/recipes'
import { WeightBar } from './WeightBar'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

interface Me {
  joined: { slug: string; name: string; since: string } | null
  referredBy: { wallet: string; since: string } | null
  referees: { wallet: string; since: string; bag: { slug: string; name: string } | null; boughtUsd: number; points: number; yourShare: number }[]
  totals: { referred: number; referredBought: number; referredBuyers: number }
  created: { slug: string; name: string; weights: BagWeights; official: boolean; joins: number; volumeUsd: number }[]
  points: { boughtUsd: number; buyConfirmed: number; buyPending: number; hold: number; referral: number; total: number }
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
  const { publicKey } = useWallet()
  const wallet = publicKey?.toBase58() ?? null
  const [copied, setCopied] = useState(false)

  const { data, isLoading, isError } = useQuery<Me>({
    queryKey: ['bag-me', wallet],
    queryFn: async () => {
      const r = await fetch(`/api/bag/me?wallet=${wallet}`)
      if (!r.ok) throw new Error('me')
      return r.json()
    },
    enabled: !!wallet,
    refetchInterval: 60_000,
  })

  const inviteSlug = data?.joined?.slug ?? OFFICIAL_SLUG
  const invite = wallet ? `https://potbot.fun/bag/${inviteSlug}?ref=${wallet}` : ''

  return (
    <>
      <PageHeader
        eyebrow="BAG · Season 0"
        title="Your BAG"
        lede="Your invite link, the wallets you brought and your BAG Points."
        action={<WalletMultiButton />}
      />

      {!wallet ? (
        <div className="card p-6 text-pot-muted">Connect a wallet to see your BAG, your invites and your points.</div>
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

          <section className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="BAG Points"
              value={int(data.points.total)}
              sub={`Buy ${int(data.points.buyConfirmed)} · hold ${int(data.points.hold)} · invites ${int(data.points.referral)}${data.points.buyPending > 0 ? ` · ${int(data.points.buyPending)} pending` : ''}`}
            />
            <Stat
              label="Wallets you brought"
              value={int(data.totals.referred)}
              sub={`${data.totals.referredBuyers} bought · ${usd(data.totals.referredBought)} in total`}
            />
            <Stat
              label="You bought"
              value={usd(data.points.boughtUsd)}
              sub={data.joined ? `In ${data.joined.name}` : 'Not in a BAG yet'}
            />
          </section>

          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white">Your invite link</p>
                <p className="mt-1 text-xs text-pot-muted">
                  Wallets that join through it are linked to you for good. You earn +10% of the BAG Points they earn. They lose nothing.
                </p>
              </div>
              {data.joined ? (
                <Link href={`/bag/${data.joined.slug}`} className="text-sm text-pot-accent underline">Your BAG: {data.joined.name}</Link>
              ) : (
                <Link href={`/bag/${OFFICIAL_SLUG}`} className="btn-primary px-4 py-2 text-sm">Join the PotBot BAG</Link>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="flex-1 truncate rounded-lg bg-pot-dark px-3 py-2 text-xs text-white">{invite}</code>
              <button
                type="button"
                className="btn-secondary px-4 py-2 text-sm"
                onClick={() => { navigator.clipboard?.writeText(invite).then(() => setCopied(true)).catch(() => {}) }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {data.referredBy && (
              <p className="mt-3 text-xs text-pot-muted">You were invited by {shortWallet(data.referredBy.wallet)} on {day(data.referredBy.since)}.</p>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-white">People you brought</h2>
            {data.referees.length === 0 ? (
              <div className="card mt-4 p-5 text-sm text-pot-muted">Nobody yet. Share your invite link.</div>
            ) : (
              <div className="card mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-pot-border text-left font-mono text-xs uppercase tracking-[0.1em] text-pot-muted">
                      <th className="px-4 py-3 font-normal">Wallet</th>
                      <th className="px-4 py-3 font-normal">BAG</th>
                      <th className="px-4 py-3 font-normal">Since</th>
                      <th className="px-4 py-3 text-right font-normal">Bought</th>
                      <th className="px-4 py-3 text-right font-normal">Your points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referees.map(r => (
                      <tr key={r.wallet} className="border-b border-pot-border/60 last:border-0">
                        <td className="px-4 py-3 font-mono text-white">{shortWallet(r.wallet)}</td>
                        <td className="px-4 py-3">{r.bag ? <Link href={`/bag/${r.bag.slug}`} className="text-pot-accent underline">{r.bag.name}</Link> : <span className="text-pot-muted">—</span>}</td>
                        <td className="px-4 py-3 text-pot-muted">{day(r.since)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-white">{usd(r.boughtUsd)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-pot-green">+{int(r.yourShare)}</td>
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
            Buy points show before the 7-day check that you still hold at least half of what you bought. Points have no monetary value, are not a token and carry no promise of any airdrop or payout.
          </p>
        </div>
      )}
    </>
  )
}
