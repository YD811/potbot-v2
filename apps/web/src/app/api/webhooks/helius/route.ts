import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

import { createServerSupabase } from '@/lib/supabase'
import { PROGRAM_ID } from '@potbot/sdk'

/**
 * POST /api/webhooks/helius
 *
 * Receives real-time on-chain events from Helius and writes the
 * relevant rows into the off-chain index (`swap_executions` for now).
 *
 * Security model:
 *   - HELIUS_WEBHOOK_SECRET is required in production. Without it the
 *     route returns 401 — we never silently accept unsigned payloads.
 *   - The HMAC comparison is constant-time (timingSafeEqual).
 *   - Log strings on confirmed transactions are signed-by-block but
 *     still pass through Supabase's parameterised query builder, never
 *     string-concatenated SQL.
 *
 * What we DO NOT trust:
 *   - The Helius `accountData` slice. It's a denormalised view that
 *     can include accounts unrelated to the program. We always cross-
 *     check the program id of the inner instructions before we pull
 *     a pot pubkey out.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PROGRAM_ID_STR = PROGRAM_ID.toBase58()

interface HeliusInstruction {
  accounts?: string[]
  data?: string
  programId?: string
  innerInstructions?: unknown[]
}

interface HeliusEvent {
  signature?: string
  slot?: number
  timestamp?: number
  logs?: string[]
  instructions?: HeliusInstruction[]
  transactionError?: unknown
  type?: string
}

interface SwapInsertRow {
  pot_pubkey: string
  proposal_pubkey: string | null
  input_mint: string
  output_mint: string
  input_amount: string
  output_amount: string | null
  tx_signature: string
  slot: number | null
}

interface ProcessSummary {
  inserts: number
  swap_log_skipped: number
  unrelated: number
  errors: Array<{ signature?: string; reason: string }>
}

function verifyHeliusSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET
  if (!secret) return false
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function findPotPubkey(event: HeliusEvent): string | null {
  const ixs = event.instructions ?? []
  // Only trust an inner instruction whose programId matches our deployed
  // program — Helius forwards the full tx graph including system/SPL ixs.
  const programIx = ixs.find((ix) => ix.programId === PROGRAM_ID_STR)
  if (!programIx?.accounts?.length) return null
  // The pot PDA is always the first account in every pot_vault ix.
  return programIx.accounts[0] ?? null
}

function extractProposalPubkey(event: HeliusEvent): string | null {
  const ixs = event.instructions ?? []
  const programIx = ixs.find((ix) => ix.programId === PROGRAM_ID_STR)
  if (!programIx?.accounts || programIx.accounts.length < 2) return null
  // For execute_proposal / vote ixs the proposal PDA is at index 1.
  // This is best-effort; the row's proposal_pubkey is nullable so a
  // mismatch just leaves the link blank.
  return programIx.accounts[1] ?? null
}

function parseSwapAuthorisedLog(line: string): {
  amountIn: string
  fromMint: string
  toMint: string
  minAmountOut: string
} | null {
  // Format emitted by handle_execute_swap:
  //   "Swap authorised: <amount> lamports <from> -> <to> (min out: <n>). Jupiter CPI: ..."
  const match = line.match(
    /Swap authorised: (\d+) lamports ([1-9A-HJ-NP-Za-km-z]+) -> ([1-9A-HJ-NP-Za-km-z]+) \(min out: (\d+)\)/,
  )
  if (!match) return null
  return {
    amountIn: match[1],
    fromMint: match[2],
    toMint: match[3],
    minAmountOut: match[4],
  }
}

async function processEvents(
  events: HeliusEvent[],
): Promise<ProcessSummary> {
  const summary: ProcessSummary = {
    inserts: 0,
    swap_log_skipped: 0,
    unrelated: 0,
    errors: [],
  }

  if (events.length === 0) return summary

  const db = createServerSupabase()
  const swapRows: SwapInsertRow[] = []

  for (const event of events) {
    if (event.transactionError) continue

    try {
      const logs = event.logs ?? []
      const swapLog = logs.find((l) => l.includes('Swap authorised:'))
      if (!swapLog) {
        summary.unrelated++
        continue
      }

      const parsed = parseSwapAuthorisedLog(swapLog)
      if (!parsed || !event.signature) {
        summary.swap_log_skipped++
        continue
      }

      const pot = findPotPubkey(event)
      if (!pot) {
        summary.swap_log_skipped++
        continue
      }

      swapRows.push({
        pot_pubkey:      pot,
        proposal_pubkey: extractProposalPubkey(event),
        input_mint:      parsed.fromMint,
        output_mint:     parsed.toMint,
        input_amount:    parsed.amountIn,
        output_amount:   null, // filled by a follow-up indexer when settlement lands
        tx_signature:    event.signature,
        slot:            event.slot ?? null,
      })
    } catch (err) {
      summary.errors.push({
        signature: event.signature,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (swapRows.length > 0) {
    // tx_signature is UNIQUE — onConflict makes the insert idempotent
    // when Helius retries (which it does on any non-2xx response).
    const { error } = await db
      .from('swap_executions')
      .upsert(swapRows, { onConflict: 'tx_signature' })

    if (error) {
      summary.errors.push({ reason: `swap_executions upsert: ${error.message}` })
    } else {
      summary.inserts = swapRows.length
    }
  }

  return summary
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: 'webhooks/helius',
    programId: PROGRAM_ID_STR,
    secretConfigured: !!process.env.HELIUS_WEBHOOK_SECRET,
  })
}

export async function POST(req: NextRequest) {
  // Helius sends the HMAC in the `Authorization` header (newer setup) or
  // `helius-signature` (older). Accept either.
  const signature =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    req.headers.get('helius-signature') ??
    ''

  const rawBody = await req.text()

  if (!verifyHeliusSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: 'Invalid or missing Helius webhook signature' },
      { status: 401 },
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const events: HeliusEvent[] = Array.isArray(payload)
    ? (payload as HeliusEvent[])
    : [payload as HeliusEvent]

  try {
    const summary = await processEvents(events)
    return NextResponse.json({ ok: true, received: events.length, ...summary })
  } catch (err) {
    console.error('[helius webhook] fatal:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'webhook processing failed' },
      { status: 500 },
    )
  }
}
