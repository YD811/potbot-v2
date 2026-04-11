'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCreatePot } from '@/hooks/usePots'

const EMOJIS = ['\ud83e\udeb4', '\ud83c\udf0a', '\ud83d\udd25', '\ud83d\ude80', '\ud83d\udc8e', '\ud83c\udf19', '\u26a1', '\ud83c\udfaf', '\ud83e\udd8a', '\ud83d\udc38', '\ud83e\udd81', '\ud83d\udc0b']

const GOV_LEVELS = [
  { value: 0, label: 'Autocracy', desc: 'Owner decides everything' },
  { value: 1, label: 'Advisory', desc: 'Members advise, owner decides' },
  { value: 2, label: 'Majority', desc: '>50% shares to pass' },
  { value: 3, label: 'Supermajority', desc: '>66% shares to pass' },
  { value: 4, label: 'Consensus', desc: '100% agreement required' },
]

const YIELD_STRATEGIES = [
  { value: 0, label: 'None', desc: 'Manual trading only' },
  { value: 1, label: 'Conservative', desc: 'SOL staking, low risk' },
  { value: 2, label: 'Balanced', desc: 'Mixed DeFi strategies' },
  { value: 3, label: 'Aggressive', desc: 'High yield, higher risk' },
]

export default function CreatePotPage() {
  const router = useRouter()
  const { publicKey } = useWallet()
  const createPot = useCreatePot()

  const [form, setForm] = useState({
    name: '',
    emoji: '\ud83e\udeb4',
    isPublic: true,
    minDeposit: 0.01,
    lockupDays: 0,
    yieldStrategy: 0,
    tradeLevel: 0,
    withdrawLevel: 0,
  })

  const update = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) return

    try {
      const result = await createPot.mutateAsync({
        name: form.name,
        emoji: form.emoji,
        isPublic: form.isPublic,
        minDeposit: form.minDeposit,
        lockupSeconds: form.lockupDays * 86400,
        yieldStrategy: form.yieldStrategy,
        tradeLevel: form.tradeLevel,
        withdrawLevel: form.withdrawLevel,
      })
      router.push(`/pots/${result.potAddress}`)
    } catch (err) {
      console.error('Create POT failed:', err)
    }
  }

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl mb-4 block">\ud83d\udd0c</span>
        <h2 className="text-2xl font-bold text-white mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-pot-muted">
          You need a connected wallet to create a POT
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Create a New POT</h1>
      <p className="text-pot-muted mb-8">
        Set up your collective trading vault. You&apos;ll be the first member
        and authority.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name + Emoji */}
        <div className="rounded-2xl border border-pot-border bg-pot-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Identity</h2>

          <div>
            <label className="block text-sm text-pot-muted mb-1.5">
              POT Name
            </label>
            <input
              type="text"
              maxLength={32}
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Diamond Hands DAO"
              className="w-full rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-white placeholder:text-pot-muted focus:border-pot-green focus:outline-none focus:ring-1 focus:ring-pot-green/50"
            />
            <span className="text-xs text-pot-muted mt-1">
              {form.name.length}/32
            </span>
          </div>

          <div>
            <label className="block text-sm text-pot-muted mb-1.5">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => update('emoji', e)}
                  className={`text-2xl p-2 rounded-lg transition ${
                    form.emoji === e
                      ? 'bg-pot-green/20 ring-2 ring-pot-green'
                      : 'bg-pot-dark hover:bg-pot-border'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Config */}
        <div className="rounded-2xl border border-pot-border bg-pot-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Configuration</h2>

          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Public POT</p>
              <p className="text-xs text-pot-muted">
                Anyone can deposit and join
              </p>
            </div>
            <button
              type="button"
              onClick={() => update('isPublic', !form.isPublic)}
              className={`relative h-6 w-11 rounded-full transition ${
                form.isPublic ? 'bg-pot-green' : 'bg-pot-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
                  form.isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Min deposit */}
          <div>
            <label className="block text-sm text-pot-muted mb-1.5">
              Minimum Deposit (SOL)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={form.minDeposit}
              onChange={(e) => update('minDeposit', parseFloat(e.target.value))}
              className="w-full rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-white focus:border-pot-green focus:outline-none focus:ring-1 focus:ring-pot-green/50"
            />
          </div>

          {/* Lockup */}
          <div>
            <label className="block text-sm text-pot-muted mb-1.5">
              Lockup Period (Days)
            </label>
            <input
              type="number"
              min="0"
              value={form.lockupDays}
              onChange={(e) => update('lockupDays', parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-white focus:border-pot-green focus:outline-none focus:ring-1 focus:ring-pot-green/50"
            />
            <span className="text-xs text-pot-muted mt-1">
              0 = no lockup, members can withdraw anytime
            </span>
          </div>
        </div>

        {/* Yield Strategy */}
        <div className="rounded-2xl border border-pot-border bg-pot-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Yield Strategy</h2>
          <div className="grid grid-cols-2 gap-3">
            {YIELD_STRATEGIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => update('yieldStrategy', s.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  form.yieldStrategy === s.value
                    ? 'border-pot-green bg-pot-green/10 text-white'
                    : 'border-pot-border bg-pot-dark text-gray-400 hover:border-pot-muted'
                }`}
              >
                <p className="font-medium text-sm">{s.label}</p>
                <p className="text-xs text-pot-muted mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Governance */}
        <div className="rounded-2xl border border-pot-border bg-pot-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Governance</h2>

          <div>
            <label className="block text-sm text-pot-muted mb-2">
              Trade Governance
            </label>
            <div className="space-y-2">
              {GOV_LEVELS.map((g) => (
                <label
                  key={g.value}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    form.tradeLevel === g.value
                      ? 'border-pot-green bg-pot-green/10'
                      : 'border-pot-border hover:border-pot-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="tradeLevel"
                    value={g.value}
                    checked={form.tradeLevel === g.value}
                    onChange={() => update('tradeLevel', g.value)}
                    className="sr-only"
                  />
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      form.tradeLevel === g.value
                        ? 'border-pot-green bg-pot-green'
                        : 'border-pot-muted'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{g.label}</p>
                    <p className="text-xs text-pot-muted">{g.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-pot-muted mb-2">
              Withdraw Governance
            </label>
            <div className="space-y-2">
              {GOV_LEVELS.map((g) => (
                <label
                  key={g.value}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    form.withdrawLevel === g.value
                      ? 'border-pot-accent bg-pot-accent/10'
                      : 'border-pot-border hover:border-pot-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="withdrawLevel"
                    value={g.value}
                    checked={form.withdrawLevel === g.value}
                    onChange={() => update('withdrawLevel', g.value)}
                    className="sr-only"
                  />
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      form.withdrawLevel === g.value
                        ? 'border-pot-accent bg-pot-accent'
                        : 'border-pot-muted'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{g.label}</p>
                    <p className="text-xs text-pot-muted">{g.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!form.name || createPot.isPending}
          className="w-full rounded-xl bg-pot-green py-4 text-lg font-bold text-pot-dark transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createPot.isPending ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin">\ud83e\udeb4</span> Creating...
            </span>
          ) : (
            `Create ${form.emoji} ${form.name || 'POT'}`
          )}
        </button>

        {createPot.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
            {(createPot.error as Error).message}
          </div>
        )}
      </form>
    </div>
  )
}
