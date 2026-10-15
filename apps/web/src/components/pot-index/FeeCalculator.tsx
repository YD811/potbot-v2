'use client'

import { useState } from 'react'

const ENTRY = 0.003
const CREATOR = 0.4
const REFERRER = 0.4
const PROTOCOL = 0.2
const CONVERSION = 0.001

function usd(v: number) {
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

/** What a creator earns from the entry fee split, with the numbers typed in. */
export function FeeCalculator() {
  const [monthly, setMonthly] = useState(50_000)
  const [ownLink, setOwnLink] = useState(50)
  const creator = monthly * ENTRY * CREATOR
  const referral = monthly * (ownLink / 100) * ENTRY * REFERRER
  const protocol = monthly * ENTRY * PROTOCOL
  const yearly = (creator + referral) * 12

  return (
    <div className="rounded-3xl border border-pot-border bg-pot-card p-6">
      <h3 className="font-semibold text-white">What a creator earns</h3>
      <p className="mt-1 text-sm text-pot-muted">Move the sliders. Everything is paid inside the deposit transaction, nothing to claim.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm text-pot-muted">
          <span className="flex items-baseline justify-between gap-3">
            <span>Deposits into your POTFolio per month</span>
            <span className="font-mono tabular-nums text-white">{usd(monthly)}</span>
          </span>
          <input type="range" className="pot-range mt-3 w-full" style={{ ['--pct' as string]: `${((monthly - 1000) / 999_000) * 100}%` }} min={1000} max={1_000_000} step={1000} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
        </label>
        <label className="block text-sm text-pot-muted">
          <span className="flex items-baseline justify-between gap-3">
            <span>Share arriving through your own link</span>
            <span className="font-mono tabular-nums text-white">{ownLink}%</span>
          </span>
          <input type="range" className="pot-range mt-3 w-full" style={{ ['--pct' as string]: `${ownLink}%` }} min={0} max={100} step={5} value={ownLink} onChange={(e) => setOwnLink(Number(e.target.value))} />
        </label>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Result label="Creator share" value={usd(creator)} note="per month" />
        <Result label="Referral share" value={usd(referral)} note="per month" />
        <Result label="Yours per year" value={usd(yearly)} note={`protocol gets ${usd(protocol)} per month`} />
      </div>
      <p className="mt-4 text-sm text-pot-muted">
        Entry fee <Num>{ENTRY * 100}%</Num>, split <Num>{CREATOR * 100} / {REFERRER * 100} / {PROTOCOL * 100}</Num>. Deposits not arriving through your link pay their own referrer, or the protocol when there is none. Holders pay no management fee. The protocol takes <Num>{CONVERSION * 100}%</Num> on redemptions to USDC.
      </p>
    </div>
  )
}

function Result({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-pot-border bg-pot-dark p-4">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-0.5 text-xs text-pot-muted">{note}</p>
    </div>
  )
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular-nums text-white">{children}</span>
}
