'use client'

import nextDynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCreatePot } from '@/hooks/usePots'
import { PotTypeSelector, PotType } from '@/components/PotTypeSelector'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// SSR-safe — keeps the wallet-adapter-react-ui bundle out of the initial
// render so non-connected users can see the wizard immediately.
const WalletMultiButtonDynamic = nextDynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

// Identity emoji choices (item 3 — emoji picker in the Identity section).
const EMOJIS = ['🏆', '💎', '🚀', '🔥', '🌊', '⚡', '🎯', '🦁', '🌙', '💰']

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

// ── Strategy Autopilot presets ──────────────────────────────────────────────
// Each preset maps to an existing `yieldStrategy` NUMBER. Governance for every
// pot created here defaults to Advisory (item 5); the per-strategy quorum /
// approval are still persisted silently to the `governance_settings` table so
// the group can switch to voting later from inside the pot.
type RiskLevelName = 'conservative' | 'moderate' | 'aggressive'

interface StrategyPreset {
  id: number
  emoji: string
  label: string
  yieldStrategy: number       // existing MockPot.yieldStrategy number
  apy: string | null          // null = Custom (no estimate)
  risk: string
  riskColor: string
  blurb: string
  how: string
  gov: { quorumPct: number; approvalPct: number; votingWindowHours: number; riskLevel: RiskLevelName }
}

const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: 0,
    emoji: '✏️',
    label: 'Custom Strategy',
    yieldStrategy: 0,
    apy: null,
    risk: 'Manual',
    riskColor: 'text-pot-muted border-pot-border bg-pot-dark',
    blurb: 'Full control. Set your own rules and manage trades manually.',
    how: 'No preset. You configure governance and trades yourself once the pot is live.',
    gov: { quorumPct: 50, approvalPct: 60, votingWindowHours: 48, riskLevel: 'moderate' },
  },
  {
    id: 1,
    emoji: '🛡️',
    label: 'Safe',
    yieldStrategy: 1,
    apy: '8–12%*',
    risk: 'Low risk',
    riskColor: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    blurb: 'Capital-preservation first — staking + blue-chip DeFi.',
    how: 'Funds stay mostly in SOL staking and stable yield. The AI only proposes low-risk reallocations.',
    gov: { quorumPct: 60, approvalPct: 70, votingWindowHours: 72, riskLevel: 'conservative' },
  },
  {
    id: 2,
    emoji: '⚖️',
    label: 'Balanced',
    yieldStrategy: 2,
    apy: '15–25%*',
    risk: 'Medium risk',
    riskColor: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
    blurb: 'Mixed DeFi strategies tuned for steady growth.',
    how: 'The AI rotates across lending, LPs and momentum trades for a balanced risk/reward profile.',
    gov: { quorumPct: 50, approvalPct: 60, votingWindowHours: 48, riskLevel: 'moderate' },
  },
  {
    id: 3,
    emoji: '🔥',
    label: 'Aggressive',
    yieldStrategy: 3,
    apy: '30–60%+*',
    risk: 'High risk',
    riskColor: 'text-red-400 border-red-500/40 bg-red-500/10',
    blurb: 'High-conviction, high-velocity trading.',
    how: 'The AI hunts asymmetric upside and acts fast — higher reward at the cost of higher volatility.',
    gov: { quorumPct: 40, approvalPct: 55, votingWindowHours: 24, riskLevel: 'aggressive' },
  },
]

const LOCKUP_MAX = 365           // days, hard cap
const MIN_DEPOSIT_FLOOR = 0.001  // SOL, must be strictly > 0

const LOCKUP_PRESETS = [0, 7, 30, 90, 180, 365]

// Default governance for every pot created via this flow (item 5 — Advisory).
const DEFAULT_TRADE_LEVEL = 1     // Advisory
const DEFAULT_WITHDRAW_LEVEL = 1  // Advisory

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'your-pot'
  )
}

export default function CreateWizard() {
  // Set page title (client component — can't use metadata export)
  useEffect(() => {
    document.title = 'Create a Vault — PotBot'
  }, [])

  const router = useRouter()
  const { publicKey } = useWallet()
  const createPot = useCreatePot()

  const [potType, setPotType] = useState<PotType>('public')

  // Strategy Autopilot — the headline choice. `null` until the user picks a
  // card, which then reveals the rest of the form.
  const [strategyId, setStrategyId] = useState<number | null>(null)
  const selectedStrategy = STRATEGY_PRESETS.find((s) => s.id === strategyId) ?? null

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    emoji: '🏆',
    isPublic: true,
    minDeposit: 0.01,
    lockupDays: 0,
    yieldStrategy: 0,
    // Governance defaults to Advisory for every pot (item 5). The detailed
    // governance UI lives inside the pot, not in this create flow.
    tradeLevel: DEFAULT_TRADE_LEVEL,
    withdrawLevel: DEFAULT_WITHDRAW_LEVEL,
  })

  // Keep form.isPublic in sync with the PotTypeSelector
  useEffect(() => {
    update('isPublic', potType === 'public')
  }, [potType])

  const update = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // Selecting a strategy card applies its yield number. Governance stays at the
  // Advisory default; the per-strategy quorum/approval is written silently to
  // Supabase on creation (see applyGovDefaults).
  function pickStrategy(preset: StrategyPreset) {
    setStrategyId(preset.id)
    update('yieldStrategy', preset.yieldStrategy)
  }

  // --- validation ------------------------------------------------------------
  const nameOk       = form.name.trim().length > 0
  const minDepositOk = Number.isFinite(form.minDeposit) && form.minDeposit >= MIN_DEPOSIT_FLOOR
  const lockupOk     = Number.isInteger(form.lockupDays) && form.lockupDays >= 0 && form.lockupDays <= LOCKUP_MAX

  const formValid = !!selectedStrategy && nameOk && minDepositOk && lockupOk
  const canSubmit = formValid && !!publicKey && !createPot.isPending
  const yieldStrategy = YIELD_STRATEGIES.find((s) => s.value === form.yieldStrategy) ?? YIELD_STRATEGIES[0]
  const previewName = form.name.trim() || 'Amsterdam Alpha'
  const inviteLink = `https://potbot.fun/join/${slugify(form.name)}`

  const isPublic = form.isPublic

  /**
   * Silently persist the chosen strategy's governance defaults for this pot,
   * keyed by pot pubkey. Best effort: never block creation on the mirror.
   */
  async function applyGovDefaults(potPubkey: string) {
    if (!isSupabaseConfigured || !selectedStrategy) return
    const g = selectedStrategy.gov
    try {
      await Promise.resolve(
        supabase.from('governance_settings').upsert(
          {
            pot_pubkey: potPubkey,
            quorum_pct: g.quorumPct,
            approval_pct: g.approvalPct,
            voting_window_hours: g.votingWindowHours,
            risk_level: g.riskLevel,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'pot_pubkey' },
        ),
      )
    } catch {
      /* swallow — governance defaults are a convenience, not a blocker */
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — no-op */
    }
  }

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
      await applyGovDefaults(result.potAddress)
      router.push(`/pots/${result.potAddress}`)
    } catch (err) {
      console.error('Create POT failed:', err)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create an AI strategy POT</h1>
        <p className="text-pot-muted max-w-2xl">
          Pick an AI Autopilot, name your vault, and share the invite — your group can
          deposit, propose, and let the BOT trade on-chain. Wallet is only needed for the
          final deploy transaction.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="min-w-0">

      {!publicKey && (
        <div className="mb-6 rounded-2xl border border-pot-accent/30 bg-pot-accent/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Connect wallet to deploy on-chain</p>
              <p className="text-xs text-pot-muted mt-0.5">
                Build the pot first — wallet is only required for the final
                transaction. Estimated cost: ~0.1 SOL (devnet airdrop works).
              </p>
            </div>
            <WalletMultiButtonDynamic />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── STRATEGY AUTOPILOT — the prominent first choice ── */}
        <div className="rounded-2xl border border-pot-green/30 bg-gradient-to-br from-pot-green/5 via-pot-card to-pot-accent/5 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-semibold text-white">Choose your Strategy Autopilot</h2>
              <p className="text-xs text-pot-muted">
                The AI BOT trades within these rails. You can fine-tune everything later.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STRATEGY_PRESETS.map((s) => {
              const active = strategyId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStrategy(s)}
                  className={`group relative text-left rounded-2xl border p-4 transition ${
                    active
                      ? 'border-pot-green bg-pot-green/10 ring-1 ring-pot-green/40'
                      : 'border-pot-border bg-pot-dark hover:border-pot-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="relative">
                      <span className="text-[10px] text-pot-muted underline decoration-dotted cursor-help">
                        How it works
                      </span>
                      <span className="pointer-events-none absolute right-0 top-5 z-20 w-56 rounded-xl border border-pot-border bg-pot-dark p-3 text-[11px] leading-relaxed text-pot-muted opacity-0 shadow-xl transition group-hover:opacity-100">
                        {s.how}
                      </span>
                    </span>
                  </div>

                  <p className="mt-2 text-base font-bold text-white">{s.label}</p>
                  <p className="text-xs text-pot-muted mt-0.5">{s.blurb}</p>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {s.apy ? (
                      <>
                        <span className="text-sm font-bold text-pot-green tabular-nums">{s.apy}</span>
                        <span className="text-[10px] text-pot-muted">target APY</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-pot-muted">You set the rules</span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-semibold rounded-full border px-2 py-0.5 ${s.riskColor}`}>
                      {s.risk}
                    </span>
                    {active && <span className="text-pot-green text-sm">✓</span>}
                  </div>

                  <div className="mt-3 border-t border-pot-border/60 pt-2 text-[10px] font-semibold text-pot-green">
                    🤖 AI Autopilot included
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footnote for the estimated APY ranges (item 1) */}
          <p className="text-[11px] text-pot-muted italic">
            *Estimated ranges based on market conditions and your own management. Not guaranteed.
          </p>

          {!selectedStrategy && (
            <p className="text-xs text-pot-muted">Select a strategy above to continue ↑</p>
          )}
        </div>

        {/* ── REST OF FORM — revealed after a strategy is chosen ── */}
        {selectedStrategy && (
          <>
            {/* POT Type Selector — Public vs Private */}
            <PotTypeSelector value={potType} onChange={setPotType} />

            {/* Identity */}
            <div className="rounded-2xl border border-pot-border bg-pot-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Identity</h2>

              <div className="flex items-start gap-4">
                {/* Large selected emoji preview */}
                <div className="shrink-0 w-16 h-16 rounded-2xl border border-pot-border bg-pot-dark flex items-center justify-center text-4xl">
                  {form.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-sm text-pot-muted">POT Name</label>
                    <a
                      href="https://sns.id"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-pot-green hover:underline whitespace-nowrap"
                    >
                      Get a .sol name →
                    </a>
                  </div>
                  <input
                    type="text"
                    maxLength={32}
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="e.g. Diamond Hands DAO"
                    className="w-full rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-white placeholder:text-pot-muted focus:border-pot-green focus:outline-none focus:ring-1 focus:ring-pot-green/50"
                  />
                  <span className="text-xs text-pot-muted mt-1">{form.name.length}/32</span>
                </div>
              </div>

              {/* Emoji picker row */}
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

              <div>
                <label className="block text-sm text-pot-muted mb-1.5">
                  Description <span className="text-pot-muted/60">(optional)</span>
                </label>
                <textarea
                  maxLength={140}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="What's this pot about? (shown to members you invite)"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-sm text-white placeholder:text-pot-muted focus:border-pot-green focus:outline-none focus:ring-1 focus:ring-pot-green/50"
                />
                <span className="text-xs text-pot-muted mt-1">{form.description.length}/140</span>
              </div>
            </div>

            {/* Minimum Deposit — its own visible section (item 4) */}
            <div className="rounded-2xl border border-pot-border bg-pot-card p-6 space-y-2">
              <h2 className="text-lg font-semibold text-white">Minimum Deposit</h2>
              <p className="text-xs text-pot-muted">
                The smallest amount of SOL a member must deposit to join this pot.
              </p>
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
                <span className="text-xs text-pot-muted block">Must be at least {MIN_DEPOSIT_FLOOR} SOL</span>
              ) : (
                <span className="text-xs text-red-400 block">
                  Minimum deposit must be greater than 0 (≥ {MIN_DEPOSIT_FLOOR} SOL)
                </span>
              )}
            </div>

            {/* Invite link */}
            <div className="rounded-2xl border border-pot-border bg-pot-card p-6 space-y-2">
              <h2 className="text-lg font-semibold text-white">Invite link</h2>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-xs text-pot-green">
                  {inviteLink}
                </code>
                <button
                  type="button"
                  onClick={copyInvite}
                  className="shrink-0 rounded-xl border border-pot-border bg-pot-dark px-4 py-3 text-xs font-semibold text-white hover:border-pot-green transition"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <span className="text-xs text-pot-muted block">
                Auto-generated from your pot name — share it to invite members.
              </span>
            </div>

            {/* ── ADVANCED OPTIONS — lockup + manual yield override ── */}
            <div className="rounded-2xl border border-pot-border bg-pot-card">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between p-6"
              >
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Advanced options</h2>
                  <p className="text-xs text-pot-muted">
                    Lockup period & manual yield strategy — pre-filled from your Autopilot.
                    Governance defaults to Advisory and can be changed later inside the pot.
                  </p>
                </div>
                <span className="text-pot-muted text-sm">{showAdvanced ? '▲' : '▼'}</span>
              </button>

              {showAdvanced && (
                <div className="space-y-6 px-6 pb-6">
                  {/* Lockup */}
                  <div>
                    <div className="flex items-end justify-between mb-1.5">
                      <label className="block text-sm text-pot-muted">Lockup Period (Days)</label>
                      <span className="text-xs text-pot-muted">max {LOCKUP_MAX} days (1 year)</span>
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
                  </div>

                  {/* Yield Strategy override */}
                  <div>
                    <label className="block text-sm text-pot-muted mb-2">Yield Strategy (override)</label>
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
                </div>
              )}
            </div>

            {!canSubmit && (nameOk || form.name.length > 0) && (!minDepositOk || !lockupOk) && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
                {!minDepositOk && <p>• Minimum deposit must be ≥ {MIN_DEPOSIT_FLOOR} SOL (cannot be 0)</p>}
                {!lockupOk && <p>• Lockup must be between 0 and {LOCKUP_MAX} days</p>}
              </div>
            )}

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

            {formValid && (
              <div className="rounded-xl border border-pot-border bg-pot-card/50 p-4 text-sm text-pot-muted">
                <div className="flex items-center justify-between mb-1">
                  <span>Estimated deploy cost</span>
                  <span className="text-white font-mono">~0.1 SOL</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span>Governance</span>
                  <span className="text-white">Advisory (owner decides)</span>
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
          </>
        )}
      </form>
        </div>

        {/* ── LIVE PREVIEW CARD — border/glow reflects the selected pot type ── */}
        <aside className="lg:sticky lg:top-28 space-y-4">
          <div
            className={`rounded-2xl border p-5 transition-colors duration-300 bg-gradient-to-br via-pot-card ${
              isPublic
                ? 'border-pot-green/50 from-pot-green/10 to-pot-green/5 shadow-[0_0_32px_rgba(20,241,149,0.12)]'
                : 'border-pot-accent/50 from-pot-accent/10 to-pot-accent/5 shadow-[0_0_32px_rgba(153,69,255,0.15)]'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isPublic ? 'text-pot-green' : 'text-pot-accent'}`}>
                  Live preview
                </div>
                <h2 className="mt-1 text-xl font-black text-white truncate">
                  {form.emoji} {previewName}
                </h2>
                <p className="mt-1 text-xs text-pot-muted">
                  {isPublic ? 'Public vault · anyone can join' : 'Private vault · invite flow'}
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  isPublic
                    ? 'border-pot-green/40 bg-pot-green/10 text-pot-green'
                    : 'border-pot-accent/40 bg-pot-accent/10 text-pot-accent'
                }`}
              >
                {isPublic ? '🌐 Public' : '🔒 Private'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <PreviewStat
                label="Autopilot"
                value={selectedStrategy ? `${selectedStrategy.emoji} ${selectedStrategy.label}` : 'Not set'}
              />
              <PreviewStat label="Target APY" value={selectedStrategy?.apy ?? (selectedStrategy ? 'Manual' : '—')} />
              <PreviewStat label="Min deposit" value={`${form.minDeposit || 0} SOL`} />
              <PreviewStat label="Governance" value="Advisory" />
            </div>

            <div className="rounded-xl border border-pot-border bg-pot-dark/70 p-4 space-y-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-pot-muted">Demo flow</div>
                <p className="mt-1 text-sm text-white">
                  AI drafts proposals. Members vote. The program executes only after rules pass.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  'Deposit SOL and mint shares',
                  `AI monitors ${yieldStrategy.label.toLowerCase()} strategy`,
                  'Advisory governance — owner approves trades',
                  'Jupiter execution creates Explorer proof',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs text-pot-muted">
                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${isPublic ? 'bg-pot-green' : 'bg-pot-accent'}`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-pot-border bg-pot-card/70 p-4 text-xs text-pot-muted">
            <div className="font-bold text-white mb-2">Recommended setup</div>
            <p className="leading-relaxed">
              Use Public, the ⚖️ Balanced Autopilot, no lockup, and a small minimum deposit.
              This is the shortest path to deposit, vote, and verify execution.
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
