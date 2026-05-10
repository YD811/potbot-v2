'use client'

import nextDynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCreatePot } from '@/hooks/usePots'
import { PotTypeSelector, PotType } from '@/components/PotTypeSelector'

// SSR-safe — keeps the wallet-adapter-react-ui bundle out of the initial
// render so non-connected users can see the wizard immediately.
const WalletMultiButtonDynamic = nextDynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

const EMOJIS = ['🪴', '🌊', '🔥', '🚀', '💎', '🌙', '⚡', '🎯', '🦊', '🐸', '🦁', '🐋']

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

const LOCKUP_MAX = 365           // days, hard cap
const MIN_DEPOSIT_FLOOR = 0.001  // SOL, must be strictly > 0

const LOCKUP_PRESETS = [0, 7, 30, 90, 180, 365]

export default function CreateWizard() {
  // Set page title (client component — can't use metadata export)
  useEffect(() => {
    document.title = 'Create a Vault — PotBot'
  }, [])

  const router = useRouter()
  const { publicKey } = useWallet()
  const createPot = useCreatePot()

  const [potType, setPotType] = useState<PotType>('public')

  const [form, setForm] = useState({
    name: '',
    emoji: '🪴',
    isPublic: true,
    minDeposit: 0.01,
    lockupDays: 0,
    yieldStrategy: 0,
    tradeLevel: 0,
    withdrawLevel: 0,
  })

  // Keep form.isPublic in sync with the PotTypeSelector
  useEffect(() => {
    update('isPublic', potType === 'public')
  }, [potType])

  const update = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // --- validation ------------------------------------------------------------
  const nameOk       = form.name.trim().length > 0
  const minDepositOk = Number.isFinite(form.minDeposit) && form.minDeposit >= MIN_DEPOSIT_FLOOR
  const lockupOk     = Number.isInteger(form.lockupDays) && form.lockupDays >= 0 && form.lockupDays <= LOCKUP_MAX

  // Wizard itself doesn't require a wallet — only the final deploy step does.
  // Form is valid as soon as name/minDeposit/lockup pass; wallet-gate is a
  // separate concern enforced in `handleSubmit` and on the submit button.
  const formValid = nameOk && minDepositOk && lockupOk
  const canSubmit = formValid && !!publicKey && !createPot.isPending
  const tradeGov = GOV_LEVELS.find((g) => g.value === form.tradeLevel) ?? GOV_LEVELS[0]
  const withdrawGov = GOV_LEVELS.find((g) => g.value === form.withdrawLevel) ?? GOV_LEVELS[0]
  const yieldStrategy = YIELD_STRATEGIES.find((s) => s.value === form.yieldStrategy) ?? YIELD_STRATEGIES[0]
  const previewName = form.name.trim() || 'Amsterdam Alpha'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !canSubmit) return

    try {
      const result = await createPot.mutateAsync({
        name: form.name.trim(),
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

  // NOTE: we deliberately do NOT early-return on `!publicKey` — the full
  // wizard stays usable without a wallet so visitors can see what they're
  // about to create. Connect is only required on final Submit (see below).

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create an AI strategy POT</h1>
        <p className="text-pot-muted max-w-2xl">
          Configure the vault your group will see: custody, deposits, voting rules,
          and the AI proposal surface. Wallet is only needed for the final deploy transaction.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="min-w-0">

      {/* Wallet banner — only shown when form is otherwise valid but wallet
          is missing, so the user isn't nagged until the very last step. */}
      {!publicKey && (
        <div className="mb-6 rounded-2xl border border-pot-accent/30 bg-pot-accent/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Connect wallet to deploy on-chain
              </p>
              <p className="text-xs text-pot-muted mt-0.5">
                Build the pot first — wallet is only required for the final
                transaction. Estimated cost: ~0.02 SOL (devnet airdrop works).
              </p>
            </div>
            <WalletMultiButtonDynamic />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* POT Type Selector — Public vs Private */}
        <PotTypeSelector value={potType} onChange={setPotType} />

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
        <div className="rounded-2xl border border-pot-border bg-pot-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Configuration</h2>

          {/* Public toggle — kept in sync with PotTypeSelector above */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Public POT</p>
              <p className="text-xs text-pot-muted">
                Anyone can deposit and join
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !form.isPublic
                update('isPublic', next)
                setPotType(next ? 'public' : 'private')
              }}
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
              min={MIN_DEPOSIT_FLOOR}
              required
              value={form.minDeposit}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                update('minDeposit', Number.isFinite(v) ? v : 0)
              }}
              className={`w-full rounded-xl border bg-pot-dark px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                minDepositOk
                  ? 'border-pot-border focus:border-pot-green focus:ring-pot-green/50'
                  : 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40'
              }`}
            />
            {minDepositOk ? (
              <span className="text-xs text-pot-muted mt-1 block">
                Must be at least {MIN_DEPOSIT_FLOOR} SOL
              </span>
            ) : (
              <span className="text-xs text-red-400 mt-1 block">
                Minimum deposit must be greater than 0 (≥ {MIN_DEPOSIT_FLOOR} SOL)
              </span>
            )}
          </div>

          {/* Lockup — slider + numeric input, capped at 365 */}
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <label className="block text-sm text-pot-muted">
                Lockup Period (Days)
              </label>
              <span className="text-xs text-pot-muted">
                max {LOCKUP_MAX} days (1 year)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={LOCKUP_MAX}
                step={1}
                value={form.lockupDays}
                onChange={(e) => update('lockupDays', parseInt(e.target.value, 10) || 0)}
                className="flex-1 accent-pot-green h-2 rounded-full bg-pot-dark cursor-pointer"
              />
              <input
                type="number"
                min={0}
                max={LOCKUP_MAX}
                step={1}
                value={form.lockupDays}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (!Number.isFinite(n)) { update('lockupDays', 0); return }
                  update('lockupDays', Math.max(0, Math.min(LOCKUP_MAX, n)))
                }}
                className={`w-24 rounded-lg border bg-pot-dark px-3 py-2 text-right font-mono text-white tabular-nums focus:outline-none focus:ring-1 ${
                  lockupOk
                    ? 'border-pot-border focus:border-pot-green focus:ring-pot-green/50'
                    : 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40'
                }`}
              />
            </div>

            {/* Presets — quick snap */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {LOCKUP_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update('lockupDays', d)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    form.lockupDays === d
                      ? 'border-pot-green text-pot-green bg-pot-green/10'
                      : 'border-pot-border text-pot-muted hover:text-white hover:border-pot-muted'
                  }`}
                >
                  {d === 0 ? 'None' : `${d}d`}
                </button>
              ))}
            </div>

            <span className="text-xs text-pot-muted mt-2 block">
              {form.lockupDays === 0
                ? 'No lockup — members can withdraw anytime'
                : `Members can't withdraw for ${form.lockupDays} day${form.lockupDays === 1 ? '' : 's'} after deposit`}
            </span>
            {!lockupOk && (
              <span className="text-xs text-red-400 mt-1 block">
                Lockup must be between 0 and {LOCKUP_MAX} days
              </span>
            )}
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

        {/* Validation summary (only when blocked) */}
        {!canSubmit && (nameOk || form.name.length > 0) && (!minDepositOk || !lockupOk) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
            {!minDepositOk && (
              <p>• Minimum deposit must be ≥ {MIN_DEPOSIT_FLOOR} SOL (cannot be 0)</p>
            )}
            {!lockupOk && (
              <p>• Lockup must be between 0 and {LOCKUP_MAX} days</p>
            )}
          </div>
        )}

        {/* Submit — gated on wallet presence AND form validity. */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-pot-green py-4 text-lg font-bold text-pot-dark transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createPot.isPending ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin">🪴</span> Creating...
            </span>
          ) : !publicKey && formValid ? (
            'Connect wallet to deploy'
          ) : (
            `Create ${form.emoji} ${form.name || 'POT'}`
          )}
        </button>

        {/* Cost preview — always shown, independent of wallet state. */}
        {formValid && (
          <div className="rounded-xl border border-pot-border bg-pot-card/50 p-4 text-sm text-pot-muted">
            <div className="flex items-center justify-between mb-1">
              <span>Estimated deploy cost</span>
              <span className="text-white font-mono">~0.02 SOL</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span>Protocol fee on swaps</span>
              <span className="text-white font-mono">0.30%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Your role</span>
              <span className="text-white">first member + authority</span>
            </div>
          </div>
        )}

        {createPot.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
            {(createPot.error as Error).message}
          </div>
        )}
      </form>
        </div>

        <aside className="lg:sticky lg:top-28 space-y-4">
          <div className="rounded-2xl border border-pot-green/30 bg-gradient-to-br from-pot-green/10 via-pot-card to-pot-accent/10 p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-pot-green">
                  Live preview
                </div>
                <h2 className="mt-1 text-xl font-black text-white truncate">
                  {form.emoji} {previewName}
                </h2>
                <p className="mt-1 text-xs text-pot-muted">
                  {form.isPublic ? 'Public vault · anyone can join' : 'Private vault · invite flow'}
                </p>
              </div>
              <span className="rounded-full border border-pot-border bg-pot-dark px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-pot-muted">
                Devnet
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <PreviewStat label="Min deposit" value={`${form.minDeposit || 0} SOL`} />
              <PreviewStat label="Lockup" value={form.lockupDays === 0 ? 'None' : `${form.lockupDays}d`} />
              <PreviewStat label="Trade vote" value={tradeGov.label} />
              <PreviewStat label="Withdraw vote" value={withdrawGov.label} />
            </div>

            <div className="rounded-xl border border-pot-border bg-pot-dark/70 p-4 space-y-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-pot-muted">
                  Demo flow
                </div>
                <p className="mt-1 text-sm text-white">
                  AI drafts proposals. Members vote. The program executes only after rules pass.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  'Deposit SOL and mint shares',
                  `AI monitors ${yieldStrategy.label.toLowerCase()} strategy`,
                  `${tradeGov.label} approval gates each swap`,
                  'Jupiter execution creates Explorer proof',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs text-pot-muted">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-pot-green shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-pot-border bg-pot-card/70 p-4 text-xs text-pot-muted">
            <div className="font-bold text-white mb-2">Recommended for Frontier</div>
            <p className="leading-relaxed">
              Use Public, Majority trade governance, no lockup, and a small minimum deposit.
              This gives judges the shortest path to deposit, vote, and verify execution.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-pot-border bg-pot-dark/70 p-3">
      <div className="text-[10px] uppercase tracking-wider text-pot-muted">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-white">{value}</div>
    </div>
  )
}
