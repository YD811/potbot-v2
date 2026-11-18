'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'
import { VersionedTransaction } from '@solana/web3.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BAG_LEGS,
  BAG_MAX_BUY_USDC,
  BAG_MIN_BUY_USDC,
  USDC_DECIMALS,
  isLegLive,
  legLabel,
  liveLegs,
  smartSplitUsdc,
  type BagLeg,
  type BagLegKey,
} from '@/lib/bag/config'
import { legsForWeights, type BagWeights } from '@/lib/bag/recipes'
import { useBagRef } from './useBagRef'
import { useBagOrigin } from './useBagOrigin'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

interface Holdings {
  positions: { leg: BagLegKey; symbol: string; balance: number; priceUsd: number; valueUsd: number }[]
  totalUsd: number
  fullBag: boolean
  usdc: number
  sol: number
  referrals: number
  points: null | { boughtUsd: number; buyConfirmed: number; buyPending: number; hold: number; referral: number; total: number }
}

type BuyStep = 'quote' | 'simulate' | 'sign' | 'send'
type LegStatus = {
  state: 'idle' | 'waiting' | 'quoting' | 'signing' | 'sending' | 'done' | 'error'
  step?: BuyStep
  code?: number
  msg?: string
  sig?: string
  /** Kept on a failed leg so it can be retried on its own. */
  amountRaw?: string
  total?: string
}

const WALLET_TIMEOUT_MS = 60_000
const STEP_LABEL: Record<BuyStep, string> = { quote: 'Quote', simulate: 'Pre-check', sign: 'Signature', send: 'Send' }
const STATE_LABEL: Partial<Record<LegStatus['state'], string>> = {
  waiting: 'waiting',
  quoting: 'getting a quote and pre-checking…',
  signing: 'approve in your wallet…',
  sending: 'sending…',
}

class StepError extends Error {
  constructor(message: string, public code?: number) { super(message) }
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

const RISK_KEY = 'potbot.bag.risk-ack.v1'

function readStore(k: string): string | null {
  try { return window.localStorage.getItem(k) } catch { return null }
}
function writeStore(k: string, v: string) {
  try { window.localStorage.setItem(k, v) } catch { /* private mode */ }
}

const fmtUsd = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`

interface BagClientProps {
  /** Custom weights (a community BAG). Defaults to the classic equal-weight BAG. */
  weights?: BagWeights
  /** Recipe slug the buys are attributed to. */
  bagSlug?: string
  title?: string
}

export function BagClient({ weights, bagSlug, title = 'Buy the BAG' }: BagClientProps = {}) {
  const { publicKey, signTransaction, connected } = useWallet()
  const wallet = publicKey?.toBase58() ?? null
  const qc = useQueryClient()

  const [amount, setAmount] = useState('100')
  const [riskAck, setRiskAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Partial<Record<BagLegKey, LegStatus>>>({})
  const ref = useBagRef()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setRiskAck(readStore(RISK_KEY) === '1')
  }, [])

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

  const { data: board } = useQuery<{ rows: { rank: number; wallet: string; points: number }[] }>({
    queryKey: ['bag-leaderboard'],
    queryFn: async () => (await fetch('/api/bag/leaderboard')).json(),
    refetchInterval: 300_000,
  })

  const amountNum = Number(amount) || 0
  const amountOk = amountNum >= BAG_MIN_BUY_USDC && amountNum <= BAG_MAX_BUY_USDC
  const enoughUsdc = !holdings || holdings.usdc >= amountNum
  const enoughSol = !holdings || holdings.sol >= 0.01
  const allLegs = useMemo(() => (weights ? legsForWeights(weights) : BAG_LEGS), [weights])
  const legs = useMemo(() => (weights ? allLegs.filter(isLegLive) : liveLegs()), [weights, allLegs])
  const notLive = useMemo(() => allLegs.filter(l => !isLegLive(l)), [allLegs])

  const plan = useMemo(() => {
    const raw = BigInt(Math.floor(amountNum * 10 ** USDC_DECIMALS))
    const current: Partial<Record<BagLegKey, number>> = {}
    for (const p of holdings?.positions ?? []) current[p.leg] = p.valueUsd
    return smartSplitUsdc(raw, current, legs)
  }, [amountNum, holdings, legs])

  /** One leg, start to finish: quote → simulate (server) → sign → send. */
  const buyLeg = useCallback(async (leg: BagLeg, amountRaw: bigint, total: bigint): Promise<boolean> => {
    if (!wallet || !signTransaction) return false
    const set = (st: LegStatus) => setStatus(s => ({ ...s, [leg.key]: st }))
    let step: BuyStep = 'quote'
    try {
      set({ state: 'quoting' })
      const q = new URLSearchParams({ leg: leg.key, amount: String(amountRaw), total: String(total), taker: wallet })
      const r = await withTimeout(fetch(`/api/bag/order?${q}`), 30_000, 'Quote timed out. Try again.')
      const j = await r.json()
      if (!r.ok) {
        step = j.step === 'simulate' ? 'simulate' : 'quote'
        throw new StepError(j.error ?? `${leg.symbol}: quote failed`, j.code)
      }

      step = 'sign'
      set({ state: 'signing' })
      const tx = VersionedTransaction.deserialize(Buffer.from(j.transaction, 'base64'))
      const signed = await withTimeout(signTransaction(tx), WALLET_TIMEOUT_MS, 'Wallet did not respond. Try again or use another wallet.')

      step = 'send'
      set({ state: 'sending' })
      const x = await withTimeout(fetch('/api/bag/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTransaction: Buffer.from(signed.serialize()).toString('base64'),
          requestId: j.requestId,
          leg: leg.key,
          ref: ref ?? undefined,
          bag: bagSlug,
        }),
      }), 90_000, 'Sending timed out. Check your wallet history before trying again.')
      const xj = await x.json()
      if (!x.ok) {
        set({ state: 'error', step, code: xj.code ?? undefined, msg: xj.error ?? 'Swap failed', sig: xj.signature, amountRaw: String(amountRaw), total: String(total) })
        return false
      }
      set({ state: 'done', sig: xj.signature })
      return true
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Something went wrong'
      const msg = /reject|denied|cancel|declin/i.test(raw) ? 'Cancelled in the wallet.' : raw
      set({ state: 'error', step, code: e instanceof StepError ? e.code : undefined, msg, amountRaw: String(amountRaw), total: String(total) })
      return false
    }
  }, [wallet, signTransaction, ref, bagSlug])

  /** Buy every live leg, one wallet prompt per leg. A failed leg does not stop the next one. */
  const buy = useCallback(async () => {
    if (!wallet || !amountOk || !riskAck || !signTransaction) return
    setBusy(true)
    const total = BigInt(Math.floor(amountNum * 10 ** USDC_DECIMALS))
    const todo = legs.filter(l => (plan.get(l.key) ?? 0n) >= 1_000_000n)
    setStatus(Object.fromEntries(todo.map(l => [l.key, { state: 'waiting' } as LegStatus])))
    try {
      for (const l of todo) await buyLeg(l, plan.get(l.key)!, total)
    } finally {
      setBusy(false)
      qc.invalidateQueries({ queryKey: ['bag-holdings', wallet] })
    }
  }, [wallet, amountOk, riskAck, signTransaction, amountNum, legs, plan, buyLeg, qc])

  /** Retry only a leg that failed, with the amount it was planned at. */
  const retryLeg = useCallback(async (leg: BagLeg) => {
    const st = status[leg.key]
    if (!st?.amountRaw || !st.total || busy) return
    setBusy(true)
    try {
      await buyLeg(leg, BigInt(st.amountRaw), BigInt(st.total))
    } finally {
      setBusy(false)
      qc.invalidateQueries({ queryKey: ['bag-holdings', wallet] })
    }
  }, [status, busy, buyLeg, qc, wallet])

  const origin = useBagOrigin()
  const refLink = wallet ? `${origin}/bag${bagSlug ? `/${bagSlug}` : ''}?ref=${wallet}` : ''

  return (
    <div className="space-y-6">
      {/* Risk banner — always visible */}
      <div className="rounded-2xl border border-pot-accent/50 bg-pot-accent/10 p-4 text-sm">
        <p className="font-semibold text-pot-accent">Beta. High risk. Not investment advice.</p>
        <p className="mt-1 text-pot-muted">
          BAG buys three third-party tokens into your own wallet through Jupiter. PotBot never holds your funds.
          Each token is issued by a third party that can freeze or claw it back. Tokenized stocks are not available
          to US persons. Prices can go to zero. Only use money you can afford to lose.
        </p>
      </div>

      {/* Legs */}
      <div className="grid gap-3 sm:grid-cols-3">
        {allLegs.map(l => {
          const pos = holdings?.positions.find(p => p.leg === l.key)
          return (
            <div key={l.key} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest" style={{ color: l.color }}>{legLabel(l)}</span>
                <span className="font-mono text-xs text-pot-muted">{(l.weightBps / 100).toFixed(0)}%</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-white">{l.symbol}</p>
              <p className="text-xs text-pot-muted">{l.issuer}</p>
              {!isLegLive(l) && <p className="mt-2 text-xs text-pot-amber">Not live yet. Opens after the listing.</p>}
              {pos && <p className="mt-2 text-sm text-white">{pos.balance.toPrecision(4)} · {fmtUsd(pos.valueUsd)}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {l.risks.map(r => (
                  <span key={r} className="rounded-full border border-pot-border px-2 py-0.5 text-[10px] text-pot-muted">{r}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Buy */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <WalletMultiButton />
        </div>
        <label className="mt-4 block text-sm text-pot-muted" htmlFor="bag-amount">Amount (USDC)</label>
        <div className="mt-1 flex gap-2">
          <input
            id="bag-amount"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-lg text-white outline-none focus:border-pot-accent"
          />
          {[50, 100, 250].map(v => (
            <button key={v} type="button" onClick={() => setAmount(String(v))} className="rounded-xl border border-pot-border px-3 text-sm text-pot-muted hover:text-white">${v}</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-pot-muted">
          Beta limit ${BAG_MIN_BUY_USDC}–${BAG_MAX_BUY_USDC} per buy. Keep ~0.01 SOL for network fees and new token accounts.
          {holdings && <> Wallet: {fmtUsd(holdings.usdc)} USDC · {holdings.sol.toFixed(3)} SOL.</>}
        </p>

        {amountNum > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {legs.map(l => {
              const raw = plan.get(l.key) ?? 0n
              const st = status[l.key]
              return (
                <li key={l.key} className="rounded-lg px-1 py-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white">{l.symbol}</span>
                    <span className="font-mono text-pot-muted">
                      {fmtUsd(Number(st?.amountRaw ?? raw) / 10 ** USDC_DECIMALS)}
                      {st && st.state === 'done' && <span className="text-pot-green"> · done</span>}
                      {st && STATE_LABEL[st.state] && <span className="text-pot-amber"> · {STATE_LABEL[st.state]}</span>}
                      {st?.sig && (
                        <a className="ml-2 underline" href={`https://solscan.io/tx/${st.sig}`} target="_blank" rel="noopener noreferrer">view on Solscan</a>
                      )}
                    </span>
                  </div>
                  {st?.state === 'error' && (
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs" role="alert">
                      <span className="text-red-400">
                        {st.step ? `${STEP_LABEL[st.step]} failed: ` : ''}{st.msg}{st.code != null ? ` (Jupiter code ${st.code})` : ''}
                      </span>
                      <button type="button" onClick={() => retryLeg(l)} disabled={busy} className="rounded-full border border-pot-border px-3 py-1 text-white hover:border-pot-accent disabled:opacity-50">
                        Retry {l.symbol}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {holdings && holdings.totalUsd > 0 && (
          <p className="mt-2 text-xs text-pot-muted">New USDC goes to underweight legs first, so every buy rebalances your BAG. Nothing is sold.</p>
        )}

        <label className="mt-4 flex items-start gap-2 text-sm text-pot-muted">
          <input
            type="checkbox"
            checked={riskAck}
            onChange={e => { setRiskAck(e.target.checked); writeStore(RISK_KEY, e.target.checked ? '1' : '0') }}
            className="mt-1"
          />
          <span>I understand this is an unaudited beta, the tokens are third-party issued, I am not a US person, and I can lose everything.</span>
        </label>

        {notLive.length > 0 && legs.length > 0 && (
          <p className="mt-4 rounded-xl border border-pot-amber/50 bg-pot-amber/10 px-3 py-2 text-sm text-white">
            {notLive.map(l => legLabel(l)).join(' and ')} {notLive.length > 1 ? 'are' : 'is'} not live yet. This buy splits between {legs.map(l => legLabel(l)).join(' and ')}.
          </p>
        )}

        <button
          type="button"
          onClick={buy}
          disabled={!connected || !signTransaction || !amountOk || !riskAck || busy || !enoughUsdc || !enoughSol || legs.length === 0}
          className="btn-primary mt-4 w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!connected ? 'Connect a wallet' : !enoughUsdc ? 'Not enough USDC' : !enoughSol ? 'Add ~0.01 SOL for fees' : busy ? 'Buying, one approval per asset…' : `Buy ${fmtUsd(amountNum)} of BAG`}
        </button>
        <p className="mt-2 text-center text-[11px] text-pot-muted">Swaps by Jupiter, one wallet approval per asset. A 1% PotBot fee is included in each swap and shown before you sign.</p>
      </div>

      {/* Your BAG + points */}
      {wallet && holdings && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-semibold text-white">Your BAG</h3>
            <p className="mt-2 text-3xl font-semibold text-white">{fmtUsd(holdings.totalUsd)}</p>
            <p className={`mt-1 text-sm ${holdings.fullBag ? 'text-pot-green' : 'text-pot-muted'}`}>
              {holdings.fullBag ? 'Full BAG: ×1.25 hold points' : 'Balance your legs within 10 percentage points of target for ×1.25 hold points'}
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-white">BAG Points · Genesis</h3>
            {holdings.points ? (
              <>
                <p className="mt-2 text-3xl font-semibold text-pot-green">{Math.round(holdings.points.total).toLocaleString('en-US')}</p>
                <p className="mt-1 text-xs text-pot-muted">
                  Pending buy points {Math.round(holdings.points.buyPending).toLocaleString('en-US')} · hold {Math.round(holdings.points.hold).toLocaleString('en-US')} · referrals {Math.round(holdings.points.referral).toLocaleString('en-US')} ({holdings.referrals})
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-pot-muted">Points start with your first buy.</p>
            )}
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(refLink).then(() => setCopied(true)).catch(() => {}) }}
              className="mt-3 w-full rounded-xl border border-pot-border px-3 py-2 text-sm text-white hover:border-pot-accent"
            >
              {copied ? 'Copied' : 'Copy your referral link'}
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {board && board.rows.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white">Leaderboard</h3>
          <ol className="mt-3 space-y-1 font-mono text-sm">
            {board.rows.slice(0, 10).map(r => (
              <li key={r.rank} className="flex justify-between text-pot-muted">
                <span>#{r.rank} {r.wallet}</span><span className="text-white">{r.points.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
