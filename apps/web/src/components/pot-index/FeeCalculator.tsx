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
    <div className="card p-5">
      <h3 className="font-semibold text-white">What a creator earns</h3>
      <p className="mt-1 text-xs text-white/70">Move the numbers. Everything is paid inside the deposit transaction; nothing to claim.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-white/70">
          <span className="flex justify-between"><span>Deposits into your POTfolio per month</span><span className="text-white">{usd(monthly)}</span></span>
          <input type="range" className="pot-range mt-2 w-full" style={{ ['--pct' as string]: `${((monthly - 1000) / 999_000) * 100}%` }} min={1000} max={1_000_000} step={1000} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
        </label>
        <label className="block text-xs text-white/70">
          <span className="flex justify-between"><span>Share arriving through your own link</span><span className="text-white">{ownLink}%</span></span>
          <input type="range" className="pot-range mt-2 w-full" style={{ ['--pct' as string]: `${ownLink}%` }} min={0} max={100} step={5} value={ownLink} onChange={(e) => setOwnLink(Number(e.target.value))} />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-pot-dark p-3">
          <p className="text-[11px] text-white/60">Creator share</p>
          <p className="text-lg font-bold text-pot-green">{usd(creator)}</p>
          <p className="text-[11px] text-white/50">per month</p>
        </div>
        <div className="rounded-lg bg-pot-dark p-3">
          <p className="text-[11px] text-white/60">Referral share</p>
          <p className="text-lg font-bold text-pot-green">{usd(referral)}</p>
          <p className="text-[11px] text-white/50">per month</p>
        </div>
        <div className="rounded-lg bg-pot-dark p-3">
          <p className="text-[11px] text-white/60">Yours per year</p>
          <p className="text-lg font-bold text-white">{usd(yearly)}</p>
          <p className="text-[11px] text-white/50">protocol gets {usd(protocol)}/mo</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/50">
        Entry fee {ENTRY * 100}% split {CREATOR * 100} / {REFERRER * 100} / {PROTOCOL * 100}. Deposits not arriving through your link pay their own referrer, or the protocol when there is none. Holders pay no management fee; the protocol also takes {CONVERSION * 100}% on redemptions to USDC.
      </p>
    </div>
  )
}
