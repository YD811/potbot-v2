'use client'

import { useState, type ReactNode } from 'react'
import { PublicKey } from '@solana/web3.js'
import { JupiterSwapPanel } from '@/components/JupiterSwapPanel'
import { BudgetGrantPanel } from '@/components/BudgetGrantPanel'
import { useCreateProposal } from '@/hooks/usePots'

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
  { id: 'trading', emoji: '🔄', label: 'Trading', desc: 'Swap, AI agent, yield' },
  { id: 'treasury', emoji: '💰', label: 'Treasury', desc: 'Budget grants & withdraws' },
  { id: 'governance', emoji: '⚖️', label: 'Governance', desc: 'Levels, risk, members' },
  { id: 'shares', emoji: '🪙', label: 'Shares', desc: 'Tokenize POT to SPL' },
  { id: 'nft', emoji: '🎨', label: 'NFT & Domain', desc: 'Tamagotchi, SNS (Phase 3)' },
  { id: 'custom', emoji: '✍️', label: 'Custom', desc: 'Propose your own change' },
]

type Opt = { key: string; label: string; emoji: string; soon?: boolean }

const OPTIONS: Record<Category, Opt[]> = {
  trading: [
    { key: 'swap', label: 'Jupiter Swap', emoji: '🔁' },
    { key: 'setAgent', label: 'Set AI Agent', emoji: '🤖' },
    { key: 'yieldStrategy', label: 'Change Yield Strategy', emoji: '📈' },
    { key: 'limit', label: 'Limit Order', emoji: '🎯', soon: true },
    { key: 'dca', label: 'DCA Schedule', emoji: '🗓️', soon: true },
  ],
  treasury: [
    { key: 'grant', label: 'Budget Grant', emoji: '💸' },
    { key: 'withdraw', label: 'Beneficiary Withdraw', emoji: '🏦' },
  ],
  governance: [
    { key: 'settings', label: 'Trade / Withdraw Level', emoji: '🎛️' },
    { key: 'risk', label: 'Risk Config', emoji: '🛡️' },
    { key: 'addMember', label: 'Add Member', emoji: '➕' },
    { key: 'removeMember', label: 'Remove Member', emoji: '➖' },
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
}

export default function CreateProposalModal({
  open, onClose,
  potPubkey, nextProposalId, vaultBalance,
  potForBudgetGrant, currentUserPubkey,
}: Props) {
  const createProposal = useCreateProposal()
  const [category, setCategory] = useState<Category | null>(null)
  const [option, setOption] = useState<string | null>(null)

  function reset() { setCategory(null); setOption(null) }
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
              {!category && 'Create Proposal'}
              {category && !option && `Create Proposal — ${CATEGORIES.find((c) => c.id === category)?.label}`}
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

            {((category === 'trading' && (option === 'setAgent' || option === 'yieldStrategy'))
              || (category === 'treasury' && option === 'withdraw')
              || (category === 'governance')
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="New trade level (1-4)">
            <Input value={tradeLevel} onChange={setTradeLevel} inputMode="numeric" />
          </Field>
          <Field label="New withdraw level (1-4)">
            <Input value={withdrawLevel} onChange={setWithdrawLevel} inputMode="numeric" />
          </Field>
        </div>
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
    'governance.settings': 'Change trade / withdraw level',
    'governance.risk': 'Update risk config',
    'governance.addMember': 'Add member to vault',
    'governance.removeMember': 'Remove member from vault',
    'shares.tokenize': 'Tokenize POT shares as SPL token',
    'custom.freeform': 'Freeform proposal',
  }
  return map[`${kind.cat}.${kind.key}`] ?? 'Proposal'
}
