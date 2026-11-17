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
  liveLegs,
  smartSplitUsdc,
  type BagLegKey,
} from '@/lib/bag/config'

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

type LegStatus = { state: 'idle' | 'quoting' | 'signing' | 'sending' | 'done' | 'error'; msg?: string; sig?: string }

const REF_KEY = 'potbot.bag.ref'
const RISK_KEY = 'potbot.bag.risk-ack.v1'

function readStore(k: string): string | null {
  try { return window.localStorage.getItem(k) } catch { return null }
}
function writeStore(k: string, v: string) {
  try { window.localStorage.setItem(k, v) } catch { /* private mode */ }
}

const fmtUsd = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`

export function BagClient() {
  const { publicKey, signAllTransactions, signTransaction, connected } = useWallet()
  const wallet = publicKey?.toBase58() ?? null
  const qc = useQueryClient()

  const [amount, setAmount] = useState('100')
  const [riskAck, setRiskAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Partial<Record<BagLegKey, LegStatus>>>({})
  const [ref, setRef] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('ref')
    if (fromUrl && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(fromUrl)) writeStore(REF_KEY, fromUrl)
    setRef(readStore(REF_KEY))
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
  const legs = liveLegs()

  const plan = useMemo(() => {
    const raw = BigInt(Math.floor(amountNum * 10 ** USDC_DECIMALS))
    const current: Partial<Record<BagLegKey, number>> = {}
    for (const p of holdings?.positions ?? []) current[p.leg] = p.valueUsd
    return smartSplitUsdc(raw, current, legs)
  }, [amountNum, holdings, legs])

  const buy = useCallback(async () => {
    if (!wallet || !amountOk || !riskAck) return
    setBusy(true)
    const total = BigInt(Math.floor(amountNum * 10 ** USDC_DECIMALS))
    const todo = legs.filter(l => (plan.get(l.key) ?? 0n) >= 1_000_000n)
    const next: Partial<Record<BagLegKey, LegStatus>> = {}
    todo.forEach(l => { next[l.key] = { state: 'quoting' } })
    setStatus(next)

    try {
      // 1. Quote every leg.
      const orders = await Promise.all(todo.map(async l => {
        const q = new URLSearchParams({ leg: l.key, amount: String(plan.get(l.key)), total: String(total), taker: wallet })
        const r = await fetch(`/api/bag/order?${q}`)
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? `${l.symbol}: quote failed`)
        return { leg: l, ...j } as { leg: typeof l; transaction: string; requestId: string }
      }))

      // 2. One wallet prompt for all legs.
      setStatus(s => Object.fromEntries(Object.keys(s).map(k => [k, { state: 'signing' }])))
      const txs = orders.map(o => VersionedTransaction.deserialize(Buffer.from(o.transaction, 'base64')))
      const signed = signAllTransactions
        ? await signAllTransactions(txs)
        : await Promise.all(txs.map(t => signTransaction!(t)))

      // 3. Execute leg by leg.
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i]
        setStatus(s => ({ ...s, [o.leg.key]: { state: 'sending' } }))
        const r = await fetch('/api/bag/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signedTransaction: Buffer.from(signed[i].serialize()).toString('base64'),
            requestId: o.requestId,
            leg: o.leg.key,
            ref: ref ?? undefined,
          }),
        })
        const j = await r.json()
        setStatus(s => ({
          ...s,
          [o.leg.key]: r.ok
            ? { state: 'done', sig: j.signature }
            : { state: 'error', msg: j.error ?? 'Swap failed', sig: j.signature },
        }))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setStatus(s => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v?.state === 'done' ? v : { state: 'error', msg }])))
    } finally {
      setBusy(false)
      qc.invalidateQueries({ queryKey: ['bag-holdings', wallet] })
    }
  }, [wallet, amountOk, riskAck, amountNum, legs, plan, signAllTransactions, signTransaction, ref, qc])

  const refLink = wallet ? `https://potbot.fun/bag?ref=${wallet}` : ''

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
        {BAG_LEGS.map(l => {
          const pos = holdings?.positions.find(p => p.leg === l.key)
          return (
            <div key={l.key} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest" style={{ color: l.color }}>{l.name}</span>
                <span className="font-mono text-xs text-pot-muted">{(l.weightBps / 100).toFixed(0)}%</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-white">{l.symbol}</p>
              <p className="text-xs text-pot-muted">{l.issuer}</p>
              {!isLegLive(l) && <p className="mt-2 text-xs text-pot-amber">Goes live with the Nasdaq listing (19 Nov)</p>}
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
          <h2 className="text-xl font-semibold text-white">Buy the BAG</h2>
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
                <li key={l.key} className="flex items-center justify-between">
                  <span className="text-white">{l.symbol}</span>
                  <span className="font-mono text-pot-muted">
                    {fmtUsd(Number(raw) / 10 ** USDC_DECIMALS)}
                    {st && st.state !== 'idle' && (
                      <span className={st.state === 'error' ? ' text-red-400' : st.state === 'done' ? ' text-pot-green' : ' text-pot-amber'}>
                        {' · '}{st.state === 'done' ? 'done' : st.state === 'error' ? st.msg : `${st.state}…`}
                      </span>
                    )}
                    {st?.sig && (
                      <a className="ml-2 underline" href={`https://solscan.io/tx/${st.sig}`} target="_blank" rel="noopener noreferrer">tx</a>
                    )}
                  </span>
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

        <button
          type="button"
          onClick={buy}
          disabled={!connected || !amountOk || !riskAck || busy || !enoughUsdc || !enoughSol || legs.length === 0}
          className="btn-primary mt-4 w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!connected ? 'Connect a wallet' : !enoughUsdc ? 'Not enough USDC' : !enoughSol ? 'Add ~0.01 SOL for fees' : busy ? 'Buying…' : `Buy ${fmtUsd(amountNum)} of BAG`}
        </button>
        <p className="mt-2 text-center text-[11px] text-pot-muted">Swaps by Jupiter. A small integrator fee goes to PotBot.</p>
      </div>

      {/* Your BAG + points */}
      {wallet && holdings && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-semibold text-white">Your BAG</h3>
            <p className="mt-2 text-3xl font-semibold text-white">{fmtUsd(holdings.totalUsd)}</p>
            <p className={`mt-1 text-sm ${holdings.fullBag ? 'text-pot-green' : 'text-pot-muted'}`}>
              {holdings.fullBag ? 'Full BAG: ×1.25 hold points' : 'Balance your legs within ±10% of target for ×1.25 hold points'}
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
