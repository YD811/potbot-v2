'use client'

/* ──────────────────────────────────────────────────────────────
   ProposalCard — the single most important UI in the product.

   Every card answers, at a glance:
     1. Action        — what the proposal does (structured, from type)
     2. Rationale     — the proposer's description
     3. Price impact  — proposal amount as % of treasury (when parseable)
     4. Risk check    — amount vs the pot's maxSwap cap (✓ / ⚠️)
     5. Live tally    — YES/NO share-weighted bars + thin quorum bar
     6. Time left     — countdown from createdAt + vote timeout
     7. 1-click vote  — YES (primary) / NO (danger), disabled-with-reason
     8. Status chip   — Active (pulse) / Passed / Rejected / Executed /
                        Expired / Cancelled

   Works identically against the Zustand mock store and on-chain data
   (both shapes flow through useProposals → loosely-typed ProposalLike).
   ────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from 'react'
import { useVote, useExecuteProposal, useActivePubkey } from '@/hooks/usePots'
import SwapExecuteButton from '@/components/SwapExecuteButton'

/* ── Loose proposal shape — superset of mock-store MockProposal and the
      on-chain mapping in useProposals. Everything optional except the
      essentials so neither source needs adapting. ── */
export interface ProposalLike {
  pubkey: string
  proposalId?: number
  proposer?: string
  type?: string
  description: string
  status: string
  yesShares?: number
  noShares?: number
  yesPercent?: number
  noPercent?: number
  totalSharesSnapshot?: number
  createdAt: Date | string | number
  voters?: string[]
  resolvedAt?: Date | null
}

export interface ProposalGovernance {
  /** % of total shares that must vote for the proposal to be decisive. */
  quorumPct?: number
  /** Max % of treasury a single proposal may move (risk cap). */
  maxSwapPct?: number
  /** Voting window in hours from createdAt. */
  voteTimeoutHours?: number
}

interface ProposalCardProps {
  proposal: ProposalLike
  potAddress: string
  /** Treasury value in SOL (liquid + LP) — drives impact + risk math. */
  potBalance?: number
  canVote: boolean
  canExecute: boolean
  governance?: ProposalGovernance
}

/* ── Defaults mirror on-chain createPot (7d window, >50% quorum) and
      GovernanceSettings DEFAULT_SETTINGS (maxSwapPct 30). ── */
const DEFAULT_QUORUM_PCT = 50
const DEFAULT_MAX_SWAP_PCT = 30
const DEFAULT_VOTE_TIMEOUT_HOURS = 7 * 24

/* ── Proposal type → structured action meta ── */
const TYPE_META: Record<string, { emoji: string; label: string }> = {
  swap:              { emoji: '🔁', label: 'Jupiter Swap' },
  limitOrder:        { emoji: '🎯', label: 'Limit Order' },
  dca:               { emoji: '🗓️', label: 'DCA Schedule' },
  tokenizePot:       { emoji: '🪙', label: 'Tokenize Shares' },
  depositToYield:    { emoji: '📈', label: 'Deposit to Yield' },
  withdrawFromYield: { emoji: '📉', label: 'Withdraw from Yield' },
  withdraw:          { emoji: '🏦', label: 'Treasury Withdraw' },
  transferFunds:     { emoji: '✍️', label: 'Signal Proposal' },
  setAgent:          { emoji: '🤖', label: 'Set AI Agent' },
  changeYield:       { emoji: '📈', label: 'Change Yield Strategy' },
  changeSettings:    { emoji: '⚖️', label: 'Governance Change' },
  updateRiskConfig:  { emoji: '🛡️', label: 'Risk Config' },
  addMember:         { emoji: '➕', label: 'Add Member' },
  removeMember:      { emoji: '➖', label: 'Remove Member' },
}

/* Types that actually move treasury funds — only these get the price-
   impact + risk-limit rows. */
const FUND_MOVING_TYPES = new Set([
  'swap', 'limitOrder', 'dca', 'depositToYield', 'withdrawFromYield',
  'withdraw', 'transferFunds',
])

/* ── Status chip meta ── */
const STATUS_META: Record<string, { label: string; cls: string; pulse?: boolean }> = {
  active:    { label: 'Active',    cls: 'bg-pot-green/10 text-pot-green border-pot-green/30', pulse: true },
  passed:    { label: 'Passed',    cls: 'bg-pot-accent/10 text-pot-accent border-pot-accent/30' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  executed:  { label: 'Executed',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  expired:   { label: 'Expired',   cls: 'bg-pot-muted/10 text-pot-muted border-pot-muted/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-pot-muted/10 text-pot-muted border-pot-muted/30' },
  pending:   { label: 'Pending',   cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
}

/* ── Helpers ── */

/** Best-effort SOL amount extraction from a proposal description.
 *  Mock descriptions encode the amount in a handful of stable shapes:
 *    "Swap 5 SOL → USDC"  ·  "(spend 0.84 SOL)"  ·  "(total 14 SOL)"
 *    "Stake 5 SOL via Marinade"  ·  "Deposit 50 SOL into …"           */
function parseAmountSol(description: string): number | null {
  const patterns = [
    /spend\s+([\d,]*\.?\d+)\s*SOL/i,
    /total\s+([\d,]*\.?\d+)\s*SOL/i,
    /([\d,]*\.?\d+)\s*SOL\s*(?:→|->)/,
    /(?:swap|stake|deposit|withdraw|grant|with)\s+([\d,]*\.?\d+)\s*SOL/i,
    /([\d,]*\.?\d+)\s*SOL/i,
  ]
  for (const re of patterns) {
    const m = description.match(re)
    if (m) {
      const v = parseFloat(m[1].replace(/,/g, ''))
      if (Number.isFinite(v) && v > 0) return v
    }
  }
  return null
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Expired'
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${d}d ${h}h left`
  if (h > 0) return `${h}h ${m}m left`
  return `${Math.max(m, 1)}m left`
}

function toMs(v: Date | string | number): number {
  const t = new Date(v as any).getTime()
  return Number.isFinite(t) ? t : Date.now()
}

function formatPct(v: number): string {
  return v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, '')
}

/* ════════════════════════════════════════════════════════════
   Main card
   ════════════════════════════════════════════════════════════ */

export function ProposalCard({
  proposal,
  potAddress,
  potBalance = 0,
  canVote,
  canExecute,
  governance,
}: ProposalCardProps) {
  const vote = useVote()
  const execute = useExecuteProposal()
  const userPubkey = useActivePubkey()
  const [expanded, setExpanded] = useState(false)

  const quorumPct      = governance?.quorumPct ?? DEFAULT_QUORUM_PCT
  const maxSwapPct     = governance?.maxSwapPct ?? DEFAULT_MAX_SWAP_PCT
  const timeoutHours   = governance?.voteTimeoutHours ?? DEFAULT_VOTE_TIMEOUT_HOURS

  /* ── Countdown — re-render every 30s while voting is open ── */
  const createdMs = toMs(proposal.createdAt)
  const deadlineMs = createdMs + timeoutHours * 3_600_000
  const [now, setNow] = useState(() => Date.now())
  const isStoredActive = proposal.status === 'active'
  useEffect(() => {
    if (!isStoredActive) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [isStoredActive])
  const timeLeftMs = deadlineMs - now

  /* Mock store never flips active → expired, so derive it client-side. */
  const isExpired = isStoredActive && timeLeftMs <= 0
  const status = isExpired ? 'expired' : proposal.status
  const isActive = status === 'active'
  const statusMeta = STATUS_META[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    cls: 'bg-pot-muted/10 text-pot-muted border-pot-muted/30',
  }

  /* ── Action / impact / risk ── */
  const typeMeta = TYPE_META[proposal.type ?? ''] ?? { emoji: '🗳️', label: 'Proposal' }
  const movesFunds = FUND_MOVING_TYPES.has(proposal.type ?? '')
  const amountSol = useMemo(
    () => (movesFunds ? parseAmountSol(proposal.description) : null),
    [movesFunds, proposal.description],
  )
  const impactPct = amountSol != null && potBalance > 0
    ? (amountSol / potBalance) * 100
    : null
  const withinRisk = impactPct != null ? impactPct <= maxSwapPct : null

  /* ── Tally + quorum ── */
  const snapshot = proposal.totalSharesSnapshot ?? 0
  const yesShares = proposal.yesShares ?? 0
  const noShares = proposal.noShares ?? 0
  const yesPct = proposal.yesPercent ?? (snapshot > 0 ? Math.round((yesShares / snapshot) * 100) : 0)
  const noPct = proposal.noPercent ?? (snapshot > 0 ? Math.round((noShares / snapshot) * 100) : 0)
  const participationPct = snapshot > 0 ? ((yesShares + noShares) / snapshot) * 100 : 0
  const quorumMet = participationPct >= quorumPct
  const quorumFillPct = Math.min(100, quorumPct > 0 ? (participationPct / quorumPct) * 100 : 0)

  /* ── Voting eligibility + disabled reason ── */
  const userStr = userPubkey?.toBase58() ?? null
  const alreadyVoted = !!userStr && (proposal.voters ?? []).includes(userStr)
  let voteDisabledReason: string | null = null
  if (!userStr) voteDisabledReason = 'Connect a wallet to vote'
  else if (!canVote) voteDisabledReason = 'Only members can vote — deposit to join'
  else if (alreadyVoted) voteDisabledReason = 'You already voted on this proposal'
  const voteEnabled = isActive && !voteDisabledReason && !vote.isPending

  const castVote = (approve: boolean) =>
    vote.mutate({ potAddress, proposalAddress: proposal.pubkey, approve })

  return (
    <div
      className="bg-pot-card border border-pot-border hover:border-pot-accent/30 rounded-2xl p-4 sm:p-5 space-y-3.5 w-full transition cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
      role="button"
      aria-expanded={expanded}
    >
      {/* ── Header: type chip + id/date · status chip ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pot-dark border border-pot-border text-[10px] font-bold text-pot-muted uppercase tracking-wide">
              {typeMeta.emoji} {typeMeta.label}
            </span>
            <span className="text-[10px] text-pot-muted">
              #{proposal.proposalId ?? '?'} · {new Date(createdMs).toLocaleDateString()}
            </span>
          </div>
          {/* Rationale — the proposer's description, the human "why" */}
          <p className="text-white font-semibold text-sm leading-snug break-words">
            {proposal.description}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.cls}`}
        >
          {statusMeta.pulse && (
            <span className="w-1.5 h-1.5 rounded-full bg-pot-green animate-pulse" aria-hidden />
          )}
          {statusMeta.label}
        </span>
      </div>

      {/* ── Structured action + impact + risk ── */}
      <div className="rounded-xl bg-pot-dark/60 border border-pot-border/60 p-3 space-y-1.5 text-xs">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-pot-muted shrink-0 w-14">Action</span>
          <span className="text-white font-medium break-words min-w-0">
            {typeMeta.label}
            {amountSol != null && <> · moves {amountSol} SOL</>}
          </span>
        </div>
        {impactPct != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-pot-muted shrink-0 w-14">Impact</span>
            <span className="text-white font-medium">
              uses {formatPct(impactPct)}% of treasury
            </span>
          </div>
        )}
        {withinRisk != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-pot-muted shrink-0 w-14">Risk</span>
            {withinRisk ? (
              <span className="text-pot-green font-medium">
                ✓ Within risk limits ({formatPct(impactPct!)}% &lt; {maxSwapPct}% cap)
              </span>
            ) : (
              <span className="text-yellow-400 font-medium">
                ⚠️ Exceeds maxSwap cap ({formatPct(impactPct!)}% &gt; {maxSwapPct}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Live tally ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-pot-muted w-8 shrink-0">YES</span>
          <div className="flex-1 h-2 bg-pot-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-pot-green rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, yesPct)}%` }}
            />
          </div>
          <span className="text-xs text-pot-green font-mono w-10 text-right shrink-0">{yesPct}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-pot-muted w-8 shrink-0">NO</span>
          <div className="flex-1 h-2 bg-pot-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, noPct)}%` }}
            />
          </div>
          <span className="text-xs text-red-400 font-mono w-10 text-right shrink-0">{noPct}%</span>
        </div>

        {/* Quorum — thin progress bar against the participation threshold */}
        <div className="pt-0.5">
          <div className="h-1 bg-pot-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${quorumMet ? 'bg-pot-green' : 'bg-pot-accent'}`}
              style={{ width: `${quorumFillPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-pot-muted">
            <span>
              Quorum: {formatPct(participationPct)}% of {quorumPct}% needed
              {quorumMet && <span className="text-pot-green ml-1">✓</span>}
            </span>
            <span className="flex items-center gap-2">
              {(proposal.voters?.length ?? 0) > 0 && (
                <span>{proposal.voters!.length} voter{proposal.voters!.length === 1 ? '' : 's'}</span>
              )}
              {isActive && (
                <span className={timeLeftMs < 6 * 3_600_000 ? 'text-yellow-400' : ''}>
                  ⏱ {formatTimeLeft(timeLeftMs)}
                </span>
              )}
              {isExpired && <span>⏱ Expired</span>}
            </span>
          </div>
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="border-t border-pot-border/50 pt-3 text-xs text-pot-muted space-y-1">
          <div>
            <span>Pubkey:</span>{' '}
            <span className="font-mono text-pot-green break-all">{proposal.pubkey}</span>
          </div>
          {proposal.proposer && (
            <div>
              <span>Proposer:</span>{' '}
              <span className="font-mono text-white break-all">{proposal.proposer}</span>
            </div>
          )}
          {proposal.totalSharesSnapshot != null && (
            <div>
              <span>Total shares snapshot:</span>{' '}
              <span className="text-white">{proposal.totalSharesSnapshot.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 1-click vote ── */}
      {isActive && (
        <div className="pt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-3">
            <button
              onClick={() => castVote(true)}
              disabled={!voteEnabled}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-pot-green text-pot-dark hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              {vote.isPending ? 'Voting…' : '👍 Vote YES'}
            </button>
            <button
              onClick={() => castVote(false)}
              disabled={!voteEnabled}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500/10"
            >
              {vote.isPending ? 'Voting…' : '👎 Vote NO'}
            </button>
          </div>
          {voteDisabledReason && (
            <p className="text-[11px] text-pot-muted text-center">{voteDisabledReason}</p>
          )}
          {vote.isError && (
            <p className="text-[11px] text-red-400 text-center">
              Vote failed — {(vote.error as Error)?.message ?? 'try again'}
            </p>
          )}
        </div>
      )}

      {/* ── Execute — owner / authority only. Swaps route through Jupiter
            via SwapExecuteButton; everything else is generic execute. ── */}
      {canExecute && status === 'passed' && (
        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
          {proposal.type === 'swap' ? (
            <SwapExecuteButton proposalPubkey={proposal.pubkey} potAddress={potAddress} />
          ) : (
            <button
              onClick={() => execute.mutate({ potAddress, proposalAddress: proposal.pubkey })}
              disabled={execute.isPending}
              className="btn-primary w-full disabled:opacity-50"
            >
              {execute.isPending ? 'Executing…' : '✓ Execute'}
            </button>
          )}
          {execute.isError && (
            <p className="text-[11px] text-red-400 text-center mt-2">
              Execute failed — {(execute.error as Error)?.message ?? 'try again'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   List-level states — skeleton / empty / error
   ════════════════════════════════════════════════════════════ */

export function ProposalCardSkeleton() {
  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl p-4 sm:p-5 space-y-3.5 w-full animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 bg-pot-dark rounded-md" />
          <div className="h-4 w-3/4 bg-pot-dark rounded-md" />
        </div>
        <div className="h-6 w-20 bg-pot-dark rounded-full shrink-0" />
      </div>
      <div className="h-16 bg-pot-dark/60 rounded-xl" />
      <div className="space-y-2">
        <div className="h-2 bg-pot-dark rounded-full" />
        <div className="h-2 bg-pot-dark rounded-full" />
        <div className="h-1 w-2/3 bg-pot-dark rounded-full" />
      </div>
      <div className="flex gap-3 pt-1">
        <div className="h-10 flex-1 bg-pot-dark rounded-xl" />
        <div className="h-10 flex-1 bg-pot-dark rounded-xl" />
      </div>
    </div>
  )
}

export function ProposalsEmptyState({
  canCreate,
  onCreate,
}: {
  canCreate: boolean
  onCreate?: () => void
}) {
  return (
    <div className="text-center py-12 px-4 bg-pot-card border border-pot-border rounded-2xl">
      <div className="text-4xl mb-3">🗳️</div>
      <p className="text-white font-semibold mb-1">No proposals yet</p>
      <p className="text-pot-muted text-xs mb-4">
        {canCreate
          ? 'Draft the first trade idea — members vote, the vault executes.'
          : 'Join the vault to create proposals.'}
      </p>
      {canCreate && onCreate && (
        <button type="button" onClick={onCreate} className="btn-primary text-sm">
          + Create the first proposal
        </button>
      )}
    </div>
  )
}

export function ProposalsErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="text-center py-10 px-4 bg-pot-card border border-red-500/20 rounded-2xl">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-white font-semibold mb-1">Couldn&apos;t load proposals</p>
      <p className="text-pot-muted text-xs mb-4">
        The network request failed. Your funds are safe — this is a read-only view.
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary text-sm">
          Retry
        </button>
      )}
    </div>
  )
}

export default ProposalCard
