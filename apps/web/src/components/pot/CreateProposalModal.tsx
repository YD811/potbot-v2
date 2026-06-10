'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { PublicKey } from '@solana/web3.js'
import { JupiterSwapPanel } from '@/components/JupiterSwapPanel'
import { BudgetGrantPanel } from '@/components/BudgetGrantPanel'
import { useCreateProposal } from '@/hooks/usePots'
import { useHumanText } from '@/hooks/useHumanText'

/* ──────────────────────────────────────────────────────────────
   CreateProposalModal — Phase 2
   Categorized proposal picker. Dispatches to on-chain ProposalType
   (see packages/sdk/src/types.ts).

   Categories → options:
     Trading   — Swap (Jupiter), Set AI Agent, Yield Strategy,
                 Limit (soon), DCA (soon)
     Treasury  — Budget Grant, Beneficiary Withdraw
     Governance— Change Trade/Withdraw Level, Risk Config,
                 Add/Remove Member
     Shares    — Tokenize POT
     NFT&Domain— Mint Tamagotchi (soon), SNS (soon)
     Custom    — Freeform (signal-only transferFunds)
   ────────────────────────────────────────────────────────────── */

type Category =
  | 'trading' | 'treasury' | 'governance'
  | 'shares' | 'nft' | 'custom'

const CATEGORIES: Array<{ id: Category; emoji: string; label: string; desc: string }> = [
  { id: 'trading', emoji: '🔄', label: 'Trading', desc: 'Swap, DCA, staking, liquidity' },
  { id: 'treasury', emoji: '💰', label: 'Treasury', desc: 'Budget grants & withdraws' },
  { id: 'governance', emoji: '⚖️', label: 'Governance', desc: 'Change governance rules' },
  { id: 'shares', emoji: '🪙', label: 'Shares', desc: 'Tokenize POT to SPL' },
  { id: 'nft', emoji: '🎨', label: 'NFT & Domain', desc: 'Tamagotchi, SNS (Phase 3)' },
  { id: 'custom', emoji: '✍️', label: 'Custom', desc: 'Propose your own change' },
]

type Opt = { key: string; label: string; emoji: string; soon?: boolean }

const OPTIONS: Record<Category, Opt[]> = {
  trading: [
    { key: 'swap', label: 'Jupiter Swap', emoji: '🔁' },
    { key: 'dca', label: 'DCA Schedule', emoji: '🗓️' },
    { key: 'staking', label: 'Staking (mSOL / jitoSOL)', emoji: '🥩' },
    { key: 'liquidity', label: 'Provide Liquidity (Orca / Raydium)', emoji: '💧' },
    { key: 'setAgent', label: 'Set AI Agent', emoji: '🤖' },
    { key: 'yieldStrategy', label: 'Change Yield Strategy', emoji: '📈' },
    { key: 'limit', label: 'Limit Order', emoji: '🎯', soon: true },
  ],
  treasury: [
    { key: 'grant', label: 'Budget Grant', emoji: '💸' },
    { key: 'withdraw', label: 'Beneficiary Withdraw', emoji: '🏦' },
  ],
  governance: [
    { key: 'settings', label: 'Change governance rules', emoji: '⚖️' },
  ],
  shares: [
    { key: 'tokenize', label: 'Tokenize POT (SPL)', emoji: '🪙' },
  ],
  nft: [
    { key: 'mintTama', label: 'Mint Tamagotchi', emoji: '🦎', soon: true },
    { key: 'sns', label: 'Register SNS Domain', emoji: '🌐', soon: true },
  ],
  custom: [
    { key: 'freeform', label: 'Freeform Proposal', emoji: '✍️' },
  ],
}

type Props = {
  open: boolean
  onClose: () => void
  potPubkey: string
  nextProposalId: number
  vaultBalance: number
  potForBudgetGrant: any
  currentUserPubkey?: string
  /** Deep-link the wizard straight to a category/option (e.g. from the
   *  Holdings "Propose Staking" quick action). */
  initialCategory?: Category | null
  initialOption?: string | null
  /** Pre-fill the amount (SOL) for the deep-linked form. */
  prefillAmount?: number
}

export default function CreateProposalModal({
  open, onClose,
  potPubkey, nextProposalId, vaultBalance,
  potForBudgetGrant, currentUserPubkey,
  initialCategory = null, initialOption = null, prefillAmount,
}: Props) {
  const t = useHumanText()
  const createProposal = useCreateProposal()
  const [category, setCategory] = useState<Category | null>(initialCategory)
  const [option, setOption] = useState<string | null>(initialOption)

  // Sync deep-link selection whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setCategory(initialCategory)
      setOption(initialOption)
    }
  }, [open, initialCategory, initialOption])

  function reset() { setCategory(initialCategory); setOption(initialOption) }
  function handleClose() { reset(); onClose() }

  if (!open) return null

  const pickedOption = category && option
    ? OPTIONS[category].find((o) => o.key === option) ?? null
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 pt-16"
      onClick={handleClose}
    >
      <div
        className="bg-pot-card border border-pot-border rounded-3xl w-full max-w-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-pot-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {category && (
              <button
                onClick={option ? () => setOption(null) : () => setCategory(null)}
                className="text-pot-muted hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-white/5 transition flex-shrink-0"
              >
                ← Back
              </button>
            )}
            <h2 className="text-xl font-bold text-white truncate">
              {!category && `Create ${t('Proposal')}`}
              {category && !option && `Create ${t('Proposal')} — ${CATEGORIES.find((c) => c.id === category)?.label}`}
              {pickedOption && `${pickedOption.emoji} ${pickedOption.label}`}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-pot-muted hover:text-white text-2xl leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Step 1 — Category grid */}
        {!category && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="text-left bg-pot-dark border border-pot-border hover:border-pot-accent rounded-2xl p-4 transition group"
              >
                <div className="text-3xl mb-2">{c.emoji}</div>
                <div className="font-bold text-white group-hover:text-pot-accent transition">{c.label}</div>
                <div className="text-xs text-pot-muted mt-1">{c.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Option list */}
        {category && !option && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OPTIONS[category].map((o) => (
              <button
                key={o.key}
                onClick={() => { if (!o.soon) setOption(o.key) }}
                disabled={o.soon}
                className={
                  'text-left bg-pot-dark border border-pot-border rounded-2xl p-4 transition ' +
                  (o.soon ? 'opacity-50 cursor-not-allowed' : 'hover:border-pot-accent cursor-pointer')
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{o.emoji}</div>
                    <div className="font-bold text-white">{o.label}</div>
                  </div>
                  {o.soon && (
                    <span className="text-xs px-2 py-0.5 bg-pot-accent/20 text-pot-accent rounded-full">
                      Soon
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3 — Specific form */}
        {category && option && (
          <div className="p-6 w-full">
            {category === 'trading' && option === 'swap' && (
              <JupiterSwapPanel
                mode="vault"
                potPubkey={potPubkey}
                vaultBalance={vaultBalance}
                onPropose={async ({ fromMint, toMint, amountSol, description }: any) => {
                  const amountLamports = Math.round(amountSol * 1e9)
                  await createProposal.mutateAsync({
                    potAddress: potPubkey,
                    nextProposalId,
                    proposalType: { swap: { fromMint, toMint, amount: amountLamports } },
                    description,
                    swapMeta: {
                      inputMint: fromMint,
                      outputMint: toMint,
                      amountLamports,
                      inputSymbol: description.split(' ')[2] ?? 'SOL',
                      outputSymbol: description.split('→')[1]?.trim() ?? '?',
                    },
                  })
                  handleClose()
                }}
              />
            )}

            {category === 'treasury' && option === 'grant' && (
              <BudgetGrantPanel
                potPubkey={potPubkey}
                pot={{ ...potForBudgetGrant, nextProposalId }}
                currentUserPubkey={currentUserPubkey}
              />
            )}

            {/* Structured "smart" forms — auto-generate the description */}
            {category === 'trading' && (option === 'staking' || option === 'liquidity' || option === 'dca') && (
              <SmartTradingForm
                kind={option}
                potPubkey={potPubkey}
                nextProposalId={nextProposalId}
                vaultBalance={vaultBalance}
                prefillAmount={prefillAmount}
                createProposal={createProposal}
                onDone={handleClose}
              />
            )}

            {category === 'governance' && (
              <GovernanceProposalForm
                potPubkey={potPubkey}
                nextProposalId={nextProposalId}
                createProposal={createProposal}
                onDone={handleClose}
              />
            )}

            {((category === 'trading' && (option === 'setAgent' || option === 'yieldStrategy'))
              || (category === 'treasury' && option === 'withdraw')
              || (category === 'shares' && option === 'tokenize')
              || (category === 'custom' && option === 'freeform')) && (
              <GenericProposalForm
                kind={{ cat: category as Category, key: option }}
                potPubkey={potPubkey}
                nextProposalId={nextProposalId}
                createProposal={createProposal}
                onDone={handleClose}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────── Generic form for simple on-chain variants ───────── */

function GenericProposalForm({
  kind, potPubkey, nextProposalId, createProposal, onDone,
}: {
  kind: { cat: Category; key: string }
  potPubkey: string
  nextProposalId: number
  createProposal: ReturnType<typeof useCreateProposal>
  onDone: () => void
}) {
  const [description, setDescription] = useState('')
  const [wallet, setWallet] = useState('')
  const [amount, setAmount] = useState('')
  const [tradeLevel, setTradeLevel] = useState('1')
  const [withdrawLevel, setWithdrawLevel] = useState('1')
  const [strategy, setStrategy] = useState('0')
  const [agent, setAgent] = useState('')
  const [maxTradeBps, setMaxTradeBps] = useState('500')
  const [maxTradeSize, setMaxTradeSize] = useState('2000')
  const [maxMembers, setMaxMembers] = useState('50')
  const [ticker, setTicker] = useState('')
  const [purpose, setPurpose] = useState('')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function parsePubkey(v: string): PublicKey | null {
    try { return new PublicKey(v) } catch { return null }
  }

  async function submit() {
    setErr(null); setBusy(true)
    try {
      let proposalType: Record<string, any> | null = null

      if (kind.cat === 'trading' && kind.key === 'setAgent') {
        const pk = parsePubkey(agent)
        if (!pk) throw new Error('Invalid agent pubkey')
        proposalType = { setAgent: { agent: pk, maxTradeBps: Number(maxTradeBps) } }
      } else if (kind.cat === 'trading' && kind.key === 'yieldStrategy') {
        proposalType = { changeYield: { newStrategy: Number(strategy) } }
      } else if (kind.cat === 'trading' && (kind.key === 'staking' || kind.key === 'liquidity')) {
        // Not executed on-chain yet — create a signal proposal carrying the
        // intent in its purpose/description so members can vote on it.
        const tag = kind.key === 'staking' ? 'stake' : 'liquidity'
        proposalType = { transferFunds: { to: new PublicKey(potPubkey), amount: 0, purpose: tag } }
      } else if (kind.cat === 'treasury' && kind.key === 'withdraw') {
        const pk = parsePubkey(wallet)
        if (!pk) throw new Error('Invalid beneficiary pubkey')
        const lam = Math.round(parseFloat(amount) * 1e9)
        if (!lam || lam <= 0) throw new Error('Amount must be positive')
        proposalType = { withdraw: { beneficiary: pk, amount: lam } }
      } else if (kind.cat === 'governance' && kind.key === 'settings') {
        proposalType = { changeSettings: { newTradeLevel: Number(tradeLevel), newWithdrawLevel: Number(withdrawLevel) } }
      } else if (kind.cat === 'governance' && kind.key === 'risk') {
        proposalType = { updateRiskConfig: { maxTradeSizeBps: Number(maxTradeSize), maxMembers: Number(maxMembers) } }
      } else if (kind.cat === 'governance' && (kind.key === 'addMember' || kind.key === 'removeMember')) {
        const pk = parsePubkey(wallet)
        if (!pk) throw new Error('Invalid member pubkey')
        proposalType = kind.key === 'addMember'
          ? { addMember: { wallet: pk } }
          : { removeMember: { wallet: pk } }
      } else if (kind.cat === 'shares' && kind.key === 'tokenize') {
        if (!ticker || ticker.length < 2 || ticker.length > 12) throw new Error('Ticker 2-12 chars')
        proposalType = { tokenizePot: { ticker: ticker.toUpperCase() } }
      } else if (kind.cat === 'custom' && kind.key === 'freeform') {
        proposalType = { transferFunds: { to: new PublicKey(potPubkey), amount: 0, purpose: (purpose || 'signal').slice(0, 64) } }
      }

      if (!proposalType) throw new Error('Proposal type not built')

      const finalDescription = description.trim() || defaultDescription(kind)
      await createProposal.mutateAsync({
        potAddress: potPubkey,
        nextProposalId,
        proposalType,
        description: finalDescription,
      })
      onDone()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 w-full">
      {kind.cat === 'trading' && kind.key === 'setAgent' && (
        <>
          <Field label="AI agent pubkey">
            <Input value={agent} onChange={setAgent} placeholder="Solana pubkey (base58)" />
          </Field>
          <Field label="Max trade bps (1000 = 10%)">
            <Input value={maxTradeBps} onChange={setMaxTradeBps} inputMode="numeric" />
          </Field>
        </>
      )}
      {kind.cat === 'trading' && kind.key === 'yieldStrategy' && (
        <Field label="Strategy index (0=none, 1=Meteora, 2=Kamino)">
          <Input value={strategy} onChange={setStrategy} inputMode="numeric" />
        </Field>
      )}
      {kind.cat === 'trading' && kind.key === 'staking' && (
        <div className="rounded-xl border border-pot-border bg-pot-dark/50 p-3 text-xs text-pot-muted">
          🥩 Proposes staking vault SOL via a liquid staking protocol (mSOL / jitoSOL).
          Describe the amount and protocol below — execution is added in a later phase.
        </div>
      )}
      {kind.cat === 'trading' && kind.key === 'liquidity' && (
        <div className="rounded-xl border border-pot-border bg-pot-dark/50 p-3 text-xs text-pot-muted">
          💧 Proposes providing liquidity on Orca or Raydium. Describe the pair and amount
          below — execution is added in a later phase.
        </div>
      )}
      {kind.cat === 'treasury' && kind.key === 'withdraw' && (
        <>
          <Field label="Beneficiary pubkey">
            <Input value={wallet} onChange={setWallet} placeholder="Solana pubkey (base58)" />
          </Field>
          <Field label="Amount (SOL)">
            <Input value={amount} onChange={setAmount} inputMode="decimal" placeholder="0.00" />
          </Field>
        </>
      )}
      {kind.cat === 'governance' && kind.key === 'settings' && (
        <>
          <div className="rounded-xl border border-pot-border bg-pot-dark/50 p-3 text-xs text-pot-muted">
            ⚖️ Change governance rules — voting thresholds, quorum, or admin settings.
            Levels: 1 = Advisory · 2 = Majority · 3 = Supermajority · 4 = Consensus.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="New trade level (1-4)">
              <Input value={tradeLevel} onChange={setTradeLevel} inputMode="numeric" />
            </Field>
            <Field label="New withdraw level (1-4)">
              <Input value={withdrawLevel} onChange={setWithdrawLevel} inputMode="numeric" />
            </Field>
          </div>
        </>
      )}
      {kind.cat === 'governance' && kind.key === 'risk' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max trade size (bps)">
            <Input value={maxTradeSize} onChange={setMaxTradeSize} inputMode="numeric" />
          </Field>
          <Field label="Max members">
            <Input value={maxMembers} onChange={setMaxMembers} inputMode="numeric" />
          </Field>
        </div>
      )}
      {kind.cat === 'governance' && (kind.key === 'addMember' || kind.key === 'removeMember') && (
        <Field label="Member wallet">
          <Input value={wallet} onChange={setWallet} placeholder="Solana pubkey (base58)" />
        </Field>
      )}
      {kind.cat === 'shares' && kind.key === 'tokenize' && (
        <Field label="Ticker (2-12 chars, A-Z)">
          <Input value={ticker} onChange={(v) => setTicker(v.toUpperCase())} placeholder="POTTY" maxLength={12} />
        </Field>
      )}
      {kind.cat === 'custom' && kind.key === 'freeform' && (
        <Field label="Short purpose (≤64 chars, stored on-chain)">
          <Input value={purpose} onChange={setPurpose} maxLength={64} placeholder="signal-bullish" />
        </Field>
      )}

      <Field label="Proposal description (shown to voters)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-pot-dark border border-pot-border text-white rounded-xl px-3.5 py-2.5 text-sm font-inherit min-h-[84px] focus:outline-none focus:ring-2 focus:ring-pot-accent"
          placeholder={defaultDescription(kind)}
        />
      </Field>

      {err && (
        <div className="bg-pot-red/10 border border-pot-red/30 text-pot-red text-sm rounded-xl px-4 py-3">
          {err}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-3 bg-pot-accent hover:bg-pot-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition"
      >
        {busy ? 'Submitting…' : 'Create Proposal'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-pot-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}

function Input({
  value, onChange, placeholder, maxLength, inputMode,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  inputMode?: 'numeric' | 'decimal' | 'text'
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      className="w-full bg-pot-dark border border-pot-border text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pot-accent"
    />
  )
}

function defaultDescription(kind: { cat: Category; key: string }): string {
  const map: Record<string, string> = {
    'trading.setAgent': 'Authorize AI agent to trade within max bps',
    'trading.yieldStrategy': 'Change vault yield strategy',
    'treasury.withdraw': 'Withdraw SOL to beneficiary',
    'shares.tokenize': 'Tokenize POT shares as SPL token',
    'custom.freeform': 'Freeform proposal',
  }
  return map[`${kind.cat}.${kind.key}`] ?? 'Proposal'
}

/* ───────── Shared token list for the structured forms ───────── */
const TOKENS = ['SOL', 'USDC', 'mSOL', 'jitoSOL', 'BONK', 'WIF'] as const

/* ───────── Staking / Liquidity / DCA structured forms ───────── */

const STAKING_PROTOCOLS = [
  { id: 'Marinade', token: 'mSOL', apy: '~7%' },
  { id: 'Jito', token: 'jitoSOL', apy: '~8%' },
  { id: 'Sanctum', token: 'various', apy: '~6-9%' },
]

function Select({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-pot-dark border border-pot-border text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pot-accent"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function SmartTradingForm({
  kind, potPubkey, nextProposalId, vaultBalance, prefillAmount, createProposal, onDone,
}: {
  kind: 'staking' | 'liquidity' | 'dca'
  potPubkey: string
  nextProposalId: number
  vaultBalance: number
  prefillAmount?: number
  createProposal: ReturnType<typeof useCreateProposal>
  onDone: () => void
}) {
  const [amount, setAmount] = useState(prefillAmount ? String(prefillAmount) : '')
  // staking
  const [stakeProtocol, setStakeProtocol] = useState(STAKING_PROTOCOLS[0].id)
  // liquidity
  const [lpProtocol, setLpProtocol] = useState('Orca')
  const [tokenA, setTokenA] = useState('SOL')
  const [tokenB, setTokenB] = useState('USDC')
  // dca
  const [buyToken, setBuyToken] = useState('USDC')
  const [frequency, setFrequency] = useState('Daily')
  const [periods, setPeriods] = useState('7')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const amt = parseFloat(amount)
  const amtOk = Number.isFinite(amt) && amt > 0
  const pctOfVault = vaultBalance > 0 && amtOk ? (amt / vaultBalance) * 100 : 0

  function buildDescription(): string {
    if (kind === 'staking') {
      const p = STAKING_PROTOCOLS.find((x) => x.id === stakeProtocol)!
      return `Stake ${amt} SOL via ${p.id} → ${p.token}`
    }
    if (kind === 'liquidity') {
      return `Provide liquidity: ${amt} SOL in ${lpProtocol} ${tokenA}/${tokenB} pool`
    }
    // dca
    return `DCA: Buy ${buyToken} with ${amt} SOL ${frequency.toLowerCase()} for ${periods} periods`
  }

  async function submit() {
    setErr(null); setBusy(true)
    try {
      if (!amtOk) throw new Error('Amount must be greater than 0')
      // Signal-only proposal (not executed on-chain yet) — the structured
      // intent lives in the auto-generated description.
      await createProposal.mutateAsync({
        potAddress: potPubkey,
        nextProposalId,
        proposalType: { transferFunds: { to: new PublicKey(potPubkey), amount: 0, purpose: kind } },
        description: buildDescription(),
      })
      onDone()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 w-full">
      {kind === 'staking' && (
        <>
          <Field label="Asset to stake">
            <Select value="SOL" onChange={() => {}} options={['SOL']} />
          </Field>
          <Field label="Protocol">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STAKING_PROTOCOLS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setStakeProtocol(p.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    stakeProtocol === p.id
                      ? 'border-pot-green bg-pot-green/10 text-white'
                      : 'border-pot-border bg-pot-dark text-gray-400 hover:border-pot-muted'
                  }`}
                >
                  <div className="text-sm font-bold">{p.id}</div>
                  <div className="text-[11px] text-pot-muted">{p.token} · {p.apy} APY</div>
                </button>
              ))}
            </div>
          </Field>
        </>
      )}

      {kind === 'liquidity' && (
        <>
          <Field label="Protocol">
            <div className="grid grid-cols-2 gap-2">
              {['Orca', 'Raydium'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setLpProtocol(p)}
                  className={`rounded-xl border p-3 text-sm font-bold transition ${
                    lpProtocol === p
                      ? 'border-pot-green bg-pot-green/10 text-white'
                      : 'border-pot-border bg-pot-dark text-gray-400 hover:border-pot-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pool token A"><Select value={tokenA} onChange={setTokenA} options={TOKENS} /></Field>
            <Field label="Pool token B"><Select value={tokenB} onChange={setTokenB} options={TOKENS} /></Field>
          </div>
        </>
      )}

      {kind === 'dca' && (
        <>
          <Field label="Buy token"><Select value={buyToken} onChange={setBuyToken} options={TOKENS} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency"><Select value={frequency} onChange={setFrequency} options={['Daily', 'Weekly', 'Custom']} /></Field>
            <Field label="Duration (periods)"><Input value={periods} onChange={setPeriods} inputMode="numeric" /></Field>
          </div>
        </>
      )}

      <Field label={kind === 'dca' ? 'Total amount (SOL)' : 'Amount (SOL)'}>
        <Input value={amount} onChange={setAmount} inputMode="decimal" placeholder="0.00" />
      </Field>
      <div className="text-[11px] text-pot-muted -mt-2">
        Vault balance: {vaultBalance.toFixed(2)} SOL
        {amtOk && pctOfVault > 0 && <span> · {pctOfVault.toFixed(1)}% of vault</span>}
      </div>

      {/* Auto-generated description preview */}
      <div className="rounded-xl border border-pot-border bg-pot-dark/50 p-3">
        <div className="text-[10px] uppercase tracking-wider text-pot-muted mb-1">Proposal description (auto)</div>
        <div className="text-sm text-white">{amtOk ? buildDescription() : '— enter an amount —'}</div>
      </div>

      {err && (
        <div className="bg-pot-red/10 border border-pot-red/30 text-pot-red text-sm rounded-xl px-4 py-3">{err}</div>
      )}

      <button
        onClick={submit}
        disabled={busy || !amtOk}
        className="w-full py-3 bg-pot-accent hover:bg-pot-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition"
      >
        {busy ? 'Submitting…' : 'Create Proposal'}
      </button>
    </div>
  )
}

/* ───────── Governance structured form ───────── */

const GOV_SETTINGS = [
  { key: 'quorum', label: 'Quorum %', suffix: '%', kind: 'number' as const },
  { key: 'approval', label: 'Approval %', suffix: '%', kind: 'number' as const },
  { key: 'window', label: 'Voting window', suffix: 'h', kind: 'number' as const },
  { key: 'risk', label: 'Risk level', suffix: '', kind: 'risk' as const },
]

function GovernanceProposalForm({
  potPubkey, nextProposalId, createProposal, onDone,
}: {
  potPubkey: string
  nextProposalId: number
  createProposal: ReturnType<typeof useCreateProposal>
  onDone: () => void
}) {
  const [setting, setSetting] = useState('quorum')
  const [numValue, setNumValue] = useState('50')
  const [riskValue, setRiskValue] = useState('moderate')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const cfg = GOV_SETTINGS.find((s) => s.key === setting)!
  const displayValue = cfg.kind === 'risk' ? riskValue : `${numValue}${cfg.suffix}`

  function buildDescription(): string {
    return `Governance: change ${cfg.label} to ${displayValue}`
  }

  async function submit() {
    setErr(null); setBusy(true)
    try {
      await createProposal.mutateAsync({
        potAddress: potPubkey,
        nextProposalId,
        proposalType: { transferFunds: { to: new PublicKey(potPubkey), amount: 0, purpose: 'governance' } },
        description: buildDescription(),
      })
      onDone()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 w-full">
      <div className="rounded-xl border border-pot-border bg-pot-dark/50 p-3 text-xs text-pot-muted">
        ⚖️ Change governance rules — voting thresholds, quorum, or admin settings.
      </div>

      <Field label="What to change">
        <div className="grid grid-cols-2 gap-2">
          {GOV_SETTINGS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSetting(s.key)}
              className={`rounded-xl border p-2.5 text-sm font-semibold transition ${
                setting === s.key
                  ? 'border-pot-green bg-pot-green/10 text-white'
                  : 'border-pot-border bg-pot-dark text-gray-400 hover:border-pot-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="New value">
        {cfg.kind === 'risk' ? (
          <Select value={riskValue} onChange={setRiskValue} options={['conservative', 'moderate', 'aggressive']} />
        ) : (
          <Input value={numValue} onChange={setNumValue} inputMode="numeric" />
        )}
      </Field>

      <div className="rounded-xl border border-pot-border bg-pot-dark/50 p-3">
        <div className="text-[10px] uppercase tracking-wider text-pot-muted mb-1">Proposal description (auto)</div>
        <div className="text-sm text-white">{buildDescription()}</div>
      </div>

      {err && (
        <div className="bg-pot-red/10 border border-pot-red/30 text-pot-red text-sm rounded-xl px-4 py-3">{err}</div>
      )}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-3 bg-pot-accent hover:bg-pot-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition"
      >
        {busy ? 'Submitting…' : 'Create Proposal'}
      </button>
    </div>
  )
}
