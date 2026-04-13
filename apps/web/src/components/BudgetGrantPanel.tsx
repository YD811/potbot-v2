'use client'

import { useState, useMemo } from 'react'
import { withTxToast } from '@/components/TxToast'
import { useCreateProposal, useProposals, useMembers } from '@/hooks/usePots'

/* ── Types ── */

interface BudgetGrant {
  recipientAddress: string
  recipientLabel: string
  amountSol: number
  durationDays: number
  purpose: string
}

const DURATION_OPTIONS = [1, 3, 7, 14, 30]

const BUDGET_TEMPLATES = [
  {
    icon: '📊',
    name: 'Active Trading Budget',
    desc: 'Allow a member to trade freely within an allocated SOL budget for a set period.',
    purpose: 'Active trading allocation — member can swap within budget window',
    amountPct: 10,
    duration: 7,
  },
  {
    icon: '🔬',
    name: 'Research & Yield',
    desc: 'Allocate funds for a member to explore DeFi yield strategies on behalf of the vault.',
    purpose: 'DeFi yield exploration — Kamino/Drift/MarginFi strategies',
    amountPct: 15,
    duration: 14,
  },
  {
    icon: '⚡',
    name: 'Degen Play',
    desc: 'High-risk/high-reward allocation for speculation. Small % of vault.',
    purpose: 'High-risk speculative trading — small allocation for asymmetric upside',
    amountPct: 5,
    duration: 3,
  },
  {
    icon: '💧',
    name: 'Liquidity Provision',
    desc: 'Allocate to provide liquidity on Raydium, Orca, or Meteora.',
    purpose: 'LP provision — earn trading fees for the pot',
    amountPct: 20,
    duration: 30,
  },
]

/* ── Wallet address shortener ── */
function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

/* ── Main component ── */

interface Props {
  potPubkey: string
  pot: any
  currentUserPubkey?: string
  maxBudgetGrantPct?: number  // from gov settings
}

export function BudgetGrantPanel({ potPubkey, pot, currentUserPubkey, maxBudgetGrantPct = 20 }: Props) {
  const createProposal = useCreateProposal()
  const { data: proposals = [] } = useProposals(potPubkey)
  const { data: members = [] } = useMembers(potPubkey)

  const vaultBalanceSol = pot?.balance ?? 0
  const maxGrantSol = (maxBudgetGrantPct / 100) * vaultBalanceSol

  const [step, setStep] = useState<'template' | 'configure' | 'confirm'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof BUDGET_TEMPLATES[0] | null>(null)
  const [grant, setGrant] = useState<BudgetGrant>({
    recipientAddress: currentUserPubkey ?? '',
    recipientLabel: 'Me',
    amountSol: 0,
    durationDays: 7,
    purpose: '',
  })

  function pickTemplate(t: typeof BUDGET_TEMPLATES[0]) {
    const amount = Math.min((t.amountPct / 100) * vaultBalanceSol, maxGrantSol)
    setSelectedTemplate(t)
    setGrant({
      ...grant,
      amountSol: parseFloat(amount.toFixed(3)),
      durationDays: t.duration,
      purpose: t.purpose,
    })
    setStep('configure')
  }

  function selectMember(address: string) {
    const m = members.find((m: any) => m.pubkey === address)
    setGrant({
      ...grant,
      recipientAddress: address,
      recipientLabel: m ? shortAddr(m.pubkey) : shortAddr(address),
    })
  }

  async function submitGrant() {
    if (!grant.recipientAddress || grant.amountSol <= 0) return

    await withTxToast(
      async () => {
        // In production: creates a new proposal type "budget_grant" on-chain
        // For now, we create a standard proposal with budget grant metadata in description
        await createProposal.mutateAsync({
          potAddress: potPubkey,
          nextProposalId: pot?.nextProposalId ?? 0,
          proposalType: {
            swap: {
              // Budget grant: allocate SOL to a sub-account / escrow
              // In production this would be a distinct proposal type
              fromMint: 'So11111111111111111111111111111111111111112',
              toMint: 'So11111111111111111111111111111111111111112',
              amountIn: grant.amountSol,
              minAmountOut: grant.amountSol,
            },
          },
          description: `[BUDGET GRANT] ${grant.amountSol} SOL → ${grant.recipientLabel} for ${grant.durationDays}d · ${grant.purpose}`,
        })
      },
      'Creating budget grant proposal…',
      `Budget grant proposal created! Members can now vote.`,
    )
    setStep('template')
  }

  // Active budget grants from proposal history
  const activeGrants = useMemo(() => {
    return proposals.filter(
      (p: any) => p.description?.startsWith('[BUDGET GRANT]') && p.status === 'active'
    )
  }, [proposals])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">💰</div>
          <div>
            <h2 className="text-lg font-bold text-white">Budget Grant Proposals</h2>
            <p className="text-xs text-pot-muted">
              Allocate a portion of the vault to a member for active trading
            </p>
          </div>
        </div>

        {/* Vault budget context */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-pot-dark rounded-xl p-3">
            <div className="text-[10px] text-pot-muted mb-1">Vault Balance</div>
            <div className="text-lg font-bold text-white">{vaultBalanceSol.toFixed(2)} SOL</div>
          </div>
          <div className="bg-pot-dark rounded-xl p-3">
            <div className="text-[10px] text-pot-muted mb-1">Max Grant Size</div>
            <div className="text-lg font-bold text-amber-400">{maxGrantSol.toFixed(2)} SOL</div>
            <div className="text-[10px] text-pot-muted">{maxBudgetGrantPct}% of vault</div>
          </div>
          <div className="bg-pot-dark rounded-xl p-3">
            <div className="text-[10px] text-pot-muted mb-1">Active Grants</div>
            <div className="text-lg font-bold text-white">{activeGrants.length}</div>
          </div>
        </div>
      </div>

      {/* Active grants list */}
      {activeGrants.length > 0 && (
        <div className="bg-pot-card border border-amber-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold text-amber-400 mb-3">⏳ Pending Grant Proposals</div>
          <div className="space-y-2">
            {activeGrants.map((g: any) => (
              <div key={g.pubkey} className="flex items-center justify-between text-xs bg-pot-dark rounded-xl px-3 py-2.5">
                <span className="text-white truncate flex-1">{g.description?.replace('[BUDGET GRANT] ', '')}</span>
                <span className="text-amber-400 ml-3 shrink-0">Voting…</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step: pick template */}
      {step === 'template' && (
        <div className="space-y-3">
          <div className="text-xs text-pot-muted px-1">Choose a budget grant template:</div>
          {BUDGET_TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => pickTemplate(t)}
              className="w-full flex items-start gap-3 p-4 bg-pot-card border border-pot-border hover:border-pot-accent/40 rounded-2xl text-left transition"
            >
              <span className="text-2xl mt-0.5">{t.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-pot-muted mt-0.5">{t.desc}</div>
                <div className="flex gap-3 mt-2 text-[10px] text-pot-muted">
                  <span className="text-amber-400">{t.amountPct}% of vault</span>
                  <span>· {t.duration} days</span>
                </div>
              </div>
              <span className="text-pot-muted text-sm mt-1">→</span>
            </button>
          ))}

          {/* Custom grant */}
          <button
            onClick={() => { setSelectedTemplate(null); setStep('configure') }}
            className="w-full flex items-center gap-3 p-4 bg-pot-dark border border-dashed border-pot-border hover:border-pot-accent/40 rounded-2xl text-left transition"
          >
            <span className="text-2xl">✏️</span>
            <div>
              <div className="text-sm font-semibold text-white">Custom Grant</div>
              <div className="text-xs text-pot-muted">Set your own amount, recipient and purpose</div>
            </div>
          </button>
        </div>
      )}

      {/* Step: configure */}
      {step === 'configure' && (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {selectedTemplate ? `${selectedTemplate.icon} ${selectedTemplate.name}` : '✏️ Custom Grant'}
            </h3>
            <button onClick={() => setStep('template')} className="text-xs text-pot-muted hover:text-white">
              ← Back
            </button>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-xs text-pot-muted mb-2">Recipient</label>
            {members.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {members.slice(0, 6).map((m: any) => (
                  <button
                    key={m.pubkey}
                    onClick={() => selectMember(m.pubkey)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                      grant.recipientAddress === m.pubkey
                        ? 'border-pot-accent bg-pot-accent/10'
                        : 'border-pot-border bg-pot-dark hover:border-pot-border/60'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {shortAddr(m.pubkey).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">
                        {m.pubkey === currentUserPubkey ? 'Me' : shortAddr(m.pubkey)}
                      </div>
                      <div className="text-[10px] text-pot-muted">
                        {((m.shares / Math.max(1, m.totalShares ?? 1)) * 100).toFixed(1)}% shares
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={grant.recipientAddress}
                onChange={(e) => setGrant({ ...grant, recipientAddress: e.target.value })}
                placeholder="Wallet address..."
                className="w-full bg-pot-dark border border-pot-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-pot-muted outline-none focus:border-pot-accent"
              />
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs text-pot-muted">Grant Amount (SOL)</label>
              <span className="text-xs text-amber-400">{grant.amountSol} SOL · max {maxGrantSol.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.01} max={maxGrantSol} step={0.01} value={grant.amountSol}
              onChange={(e) => setGrant({ ...grant, amountSol: +e.target.value })}
              className="w-full accent-amber-500"
            />
            <div className="grid grid-cols-4 gap-1 mt-1.5">
              {[0.1, 0.25, 0.5, 1].map((frac) => {
                const amt = parseFloat((frac * maxGrantSol).toFixed(3))
                return (
                  <button
                    key={frac}
                    onClick={() => setGrant({ ...grant, amountSol: Math.min(amt, maxGrantSol) })}
                    className="text-[10px] py-1 rounded border border-pot-border text-pot-muted hover:text-white hover:border-pot-accent/50 transition"
                  >
                    {Math.round(frac * 100)}%
                  </button>
                )
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs text-pot-muted mb-2">Duration</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setGrant({ ...grant, durationDays: d })}
                  className={`flex-1 py-2 text-xs rounded-xl border transition ${
                    grant.durationDays === d
                      ? 'border-pot-accent bg-pot-accent/10 text-white'
                      : 'border-pot-border text-pot-muted hover:border-pot-border/60'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-xs text-pot-muted mb-1.5">Purpose / Description</label>
            <textarea
              value={grant.purpose}
              onChange={(e) => setGrant({ ...grant, purpose: e.target.value })}
              rows={2}
              placeholder="What will the member do with this budget?"
              className="w-full bg-pot-dark border border-pot-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-pot-muted outline-none focus:border-pot-accent resize-none"
            />
          </div>

          <button
            onClick={() => setStep('confirm')}
            disabled={!grant.recipientAddress || grant.amountSol <= 0}
            className="w-full py-3 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-semibold text-sm transition disabled:opacity-40"
          >
            Preview Proposal →
          </button>
        </div>
      )}

      {/* Step: confirm */}
      {step === 'confirm' && (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Confirm Budget Grant</h3>
            <button onClick={() => setStep('configure')} className="text-xs text-pot-muted hover:text-white">
              ← Edit
            </button>
          </div>

          {/* Preview card */}
          <div className="bg-pot-dark border border-amber-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                BUDGET GRANT PROPOSAL
              </span>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Recipient', value: shortAddr(grant.recipientAddress) },
                { label: 'Amount', value: `${grant.amountSol} SOL` },
                { label: 'Duration', value: `${grant.durationDays} days` },
                { label: 'Purpose', value: grant.purpose || 'Active trading' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-pot-muted">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-pot-border pt-2 text-[10px] text-pot-muted space-y-1">
              <div>• Members will vote YES/NO on this allocation</div>
              <div>• Recipient can swap within budget once approved</div>
              <div>• Unused SOL returns to vault after duration</div>
            </div>
          </div>

          <button
            onClick={submitGrant}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition"
          >
            🗳 Submit for Vote
          </button>
        </div>
      )}
    </div>
  )
}