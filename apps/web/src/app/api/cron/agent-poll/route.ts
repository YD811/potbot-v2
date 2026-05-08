import { NextRequest, NextResponse } from 'next/server'
import {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js'
import { AnchorProvider, Program, BN, type Idl } from '@coral-xyz/anchor'
import bs58 from 'bs58'

import { createServerSupabase } from '@/lib/supabase'
import { getRpcConnection } from '@/lib/rpc'
import {
  IDL,
  PROGRAM_ID,
  getMemberAddress,
  getProposalAddress,
  getVaultAddress,
} from '@potbot/sdk'

/**
 * GET /api/cron/agent-poll
 *
 * Vercel Cron job — evaluates every active off-chain agent and submits
 * a real on-chain `create_proposal` instruction for the first matching
 * rule per pot.
 *
 * Hard requirements:
 *   - CRON_SECRET — bearer token from Vercel cron header
 *   - AGENT_KEYPAIR — base58 secret key of the keypair that signs proposals
 *
 * Behaviour when AGENT_KEYPAIR is missing: returns `{ skipped: true }`
 * with reason — never throws so the cron logs stay clean.
 *
 * Each pot is wrapped in its own try/catch so one failure (member PDA
 * missing, RPC rate limit, etc.) does not block the rest of the loop.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SOL_MINT = 'So11111111111111111111111111111111111111112'

interface AgentRuleJson {
  id: string
  name: string
  enabled: boolean
  cooldownMinutes: number
  lastFiredAt?: number
  trigger: {
    type: string
    tokenMint?: string
    threshold?: number
  }
  action: {
    type: string
    fromMint?: string
    toMint?: string
    amountPct?: number
    label?: string
  }
}

interface AgentConfigRow {
  pot_pubkey: string
  config_json: {
    rules?: AgentRuleJson[]
    proposeOnly?: boolean
    globalMaxPriceImpactPct?: number
  } | null
  last_fired_at: string | null
  governance_mode: string
}

interface FiredEntry {
  pot: string
  rule: string
  txSig: string
}

interface SkippedEntry {
  pot: string
  reason: string
}

function loadAgentKeypair(): Keypair | null {
  const raw = process.env.AGENT_KEYPAIR
  if (!raw) return null
  try {
    return Keypair.fromSecretKey(bs58.decode(raw))
  } catch (err) {
    console.error('[agent-poll] AGENT_KEYPAIR decode failed:', err)
    return null
  }
}

async function fetchSolPriceUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://lite-api.jup.ag/price/v3?ids=${SOL_MINT}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, { usdPrice?: number }>
    return data?.[SOL_MINT]?.usdPrice ?? null
  } catch {
    return null
  }
}

function evaluateTrigger(
  rule: AgentRuleJson,
  prices: Record<string, number>,
): { triggered: boolean; reason: string } {
  const { trigger } = rule
  const price = trigger.tokenMint ? (prices[trigger.tokenMint] ?? 0) : 0
  const threshold = trigger.threshold ?? 0

  switch (trigger.type) {
    case 'price_above':
      return {
        triggered: price > 0 && price > threshold,
        reason: `price ${price.toFixed(4)} vs > ${threshold}`,
      }
    case 'price_below':
      return {
        triggered: price > 0 && price < threshold,
        reason: `price ${price.toFixed(4)} vs < ${threshold}`,
      }
    case 'time_interval':
      return { triggered: true, reason: `time interval (cooldown gates frequency)` }
    default:
      return { triggered: false, reason: `trigger.type=${trigger.type} not supported by cron` }
  }
}

function withinCooldown(lastIso: string | null, cooldownMinutes: number): boolean {
  if (!lastIso) return false
  const elapsedMin = (Date.now() - new Date(lastIso).getTime()) / 60_000
  return elapsedMin < cooldownMinutes
}

function buildSwapProposalType(action: AgentRuleJson['action'], amountIn: BN) {
  if (!action.fromMint || !action.toMint) {
    throw new Error('propose_swap rule missing fromMint/toMint')
  }
  return {
    swap: {
      fromMint: new PublicKey(action.fromMint),
      toMint: new PublicKey(action.toMint),
      amountIn,
      // 0 = best-effort routing; the executor sets a real slippage cap.
      minAmountOut: new BN(0),
    },
  }
}

export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  const agent = loadAgentKeypair()
  if (!agent) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'AGENT_KEYPAIR not set',
      checkedAt: new Date().toISOString(),
    })
  }

  // ── Inputs ───────────────────────────────────────────────────────────
  const db = createServerSupabase()
  const conn = getRpcConnection('confirmed')
  const provider = new AnchorProvider(
    conn,
    {
      publicKey: agent.publicKey,
      signTransaction: async <T extends Transaction>(tx: T) => {
        // Anchor only ever calls this with a legacy Transaction here —
        // the keypair signs in-place.
        ;(tx as Transaction).partialSign(agent)
        return tx
      },
      signAllTransactions: async <T extends Transaction>(txs: T[]) => {
        for (const tx of txs) (tx as Transaction).partialSign(agent)
        return txs
      },
    } as never,
    { commitment: 'confirmed' },
  )
  const program = new Program(IDL as Idl, provider)

  const prices: Record<string, number> = {}
  const solUsd = await fetchSolPriceUsd()
  if (solUsd !== null) prices[SOL_MINT] = solUsd

  // ── Load active agent configs ────────────────────────────────────────
  const { data: configs, error: cfgErr } = await db
    .from('agent_configs')
    .select('pot_pubkey, config_json, last_fired_at, governance_mode')
    .eq('is_active', true)

  if (cfgErr) {
    console.error('[agent-poll] failed to load agent_configs:', cfgErr)
    return NextResponse.json(
      { ok: false, error: cfgErr.message ?? 'agent_configs query failed' },
      { status: 500 },
    )
  }

  const fired: FiredEntry[] = []
  const skipped: SkippedEntry[] = []
  const rows = (configs ?? []) as AgentConfigRow[]

  // ── Per-pot loop ─────────────────────────────────────────────────────
  for (const row of rows) {
    try {
      const rules = row.config_json?.rules ?? []
      if (rules.length === 0) {
        skipped.push({ pot: row.pot_pubkey, reason: 'no rules' })
        continue
      }

      const potPk = new PublicKey(row.pot_pubkey)

      // Pull pot account through the Anchor decoder so the discriminator
      // is verified before we read any user-controlled bytes.
      const potAcc = await (
        program.account as Record<string, { fetch: (k: PublicKey) => Promise<Record<string, unknown>> }>
      ).potAccount.fetch(potPk)

      // The cron's keypair must already be a member of the pot for the
      // proposal ix to succeed. Skip with a reason rather than crashing.
      const [memberPda] = getMemberAddress(potPk, agent.publicKey)
      const memberInfo = await conn.getAccountInfo(memberPda)
      if (!memberInfo) {
        skipped.push({
          pot: row.pot_pubkey,
          reason: `agent ${agent.publicKey.toBase58()} is not a member of this pot`,
        })
        continue
      }

      // Find the first rule that fires AND is past its individual cooldown.
      let chosen: AgentRuleJson | null = null
      let chosenReason = ''
      for (const rule of rules) {
        if (!rule.enabled) continue
        if (rule.action.type !== 'propose_swap') continue
        if (withinCooldown(row.last_fired_at, rule.cooldownMinutes)) continue
        if (rule.lastFiredAt) {
          const elapsedMin = (Date.now() - rule.lastFiredAt) / 60_000
          if (elapsedMin < rule.cooldownMinutes) continue
        }
        const evald = evaluateTrigger(rule, prices)
        if (evald.triggered) {
          chosen = rule
          chosenReason = evald.reason
          break
        }
      }

      if (!chosen) {
        skipped.push({ pot: row.pot_pubkey, reason: 'no rule triggered' })
        continue
      }

      // Compute amountIn from vault SOL balance × amountPct.
      const [vaultPda] = getVaultAddress(potPk)
      const vaultLamports = await conn.getBalance(vaultPda, 'confirmed')
      const pct = Math.max(0, Math.min(100, chosen.action.amountPct ?? 10))
      const amountInLamports = Math.floor((vaultLamports * pct) / 100)
      if (amountInLamports <= 0) {
        skipped.push({ pot: row.pot_pubkey, reason: 'vault has no balance to swap' })
        continue
      }

      const nextProposalId = Number((potAcc.nextProposalId as BN | bigint))
      const [proposalPda] = getProposalAddress(potPk, nextProposalId)

      const proposalType = buildSwapProposalType(chosen.action, new BN(amountInLamports))
      const description = chosen.action.label
        ? `${chosen.action.label} — auto (${chosenReason})`
        : `auto: ${chosen.name}`

      const ix = await (program.methods as Record<string, (...args: unknown[]) => {
        accounts: (a: Record<string, PublicKey>) => { instruction: () => Promise<unknown> }
      }>)
        .createProposal({ proposalType, description })
        .accounts({
          pot: potPk,
          proposal: proposalPda,
          member: memberPda,
          vault: vaultPda,
          proposer: agent.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction()

      const tx = new Transaction().add(ix as never)
      const sig = await sendAndConfirmTransaction(conn, tx, [agent], {
        commitment: 'confirmed',
        skipPreflight: false,
      })

      // Persist the firing so the next tick respects the cooldown.
      await db
        .from('agent_configs')
        .update({
          last_fired_at: new Date().toISOString(),
          last_proposal_tx: sig,
        })
        .eq('pot_pubkey', row.pot_pubkey)

      fired.push({ pot: row.pot_pubkey, rule: chosen.name, txSig: sig })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[agent-poll] pot=${row.pot_pubkey} failed:`, msg)
      skipped.push({ pot: row.pot_pubkey, reason: `error: ${msg}` })
    }
  }

  // PROGRAM_ID is exported so we can include it in the response for
  // verification — handy when a deploy lands on a new program id.
  return NextResponse.json({
    ok: true,
    programId: PROGRAM_ID.toBase58(),
    agent: agent.publicKey.toBase58(),
    solUsd,
    configsLoaded: rows.length,
    fired,
    skipped,
    latencyMs: Date.now() - t0,
    checkedAt: new Date().toISOString(),
  })
}
