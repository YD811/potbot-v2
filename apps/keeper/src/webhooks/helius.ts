import crypto from 'node:crypto'
import type http from 'node:http'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const POT_VAULT_PROGRAM_ID =
  process.env.POT_VAULT_PROGRAM_ID ??
  process.env.POTBOT_PROGRAM_ID ??
  'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'

type NotificationKind = 'trade' | 'proposal' | 'member_added' | 'member_removed' | 'strategy_changed'

type HeliusInstruction = {
  programId?: string
  programName?: string
  data?: string
  name?: string
  parsed?: {
    type?: string
  }
}

type HeliusTx = {
  signature?: string
  accountData?: Array<{ account?: string; owner?: string }>
  instructions?: HeliusInstruction[]
  innerInstructions?: Array<{ instructions?: HeliusInstruction[] }>
  tokenTransfers?: Array<{ fromUserAccount?: string; toUserAccount?: string; mint?: string }>
  nativeTransfers?: Array<{ fromUserAccount?: string; toUserAccount?: string }>
  transactionError?: unknown
}

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (supabase) return supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set')
  supabase = createClient(url, key, { auth: { persistSession: false } })
  return supabase
}

function safeEqual(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)
  if (expectedBuffer.length !== actualBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

function verifySignature(rawBody: string, headerSignature: string | undefined): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET
  if (!secret || !headerSignature) return false

  const provided = headerSignature.replace(/^sha256=/i, '').trim()
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeEqual(computed, provided)
}

function flattenInstructions(tx: HeliusTx): HeliusInstruction[] {
  const direct = tx.instructions ?? []
  const inner = (tx.innerInstructions ?? []).flatMap((entry) => entry.instructions ?? [])
  return [...direct, ...inner]
}

function inferPotPubkey(tx: HeliusTx): string | null {
  for (const row of tx.accountData ?? []) {
    if (row.owner === POT_VAULT_PROGRAM_ID && row.account) return row.account
    if (row.account === POT_VAULT_PROGRAM_ID && row.owner) return row.owner
  }

  const fallback = (tx.tokenTransfers ?? [])
    .flatMap((t) => [t.fromUserAccount, t.toUserAccount, t.mint])
    .concat((tx.nativeTransfers ?? []).flatMap((t) => [t.fromUserAccount, t.toUserAccount]))
    .find(Boolean)

  return fallback ?? null
}

function classifyKind(tx: HeliusTx): NotificationKind {
  const names = flattenInstructions(tx)
    .map((ix) => (ix.name ?? ix.parsed?.type ?? '').toLowerCase())
    .filter(Boolean)

  if (names.some((name) => name.includes('proposal'))) return 'proposal'
  if (names.some((name) => name.includes('add_member') || name.includes('member_add') || name.includes('join'))) {
    return 'member_added'
  }
  if (names.some((name) => name.includes('remove_member') || name.includes('member_remove') || name.includes('leave'))) {
    return 'member_removed'
  }
  if (names.some((name) => name.includes('strategy') || name.includes('risk') || name.includes('governance'))) {
    return 'strategy_changed'
  }
  return 'trade'
}

async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

export async function handleHeliusWebhook(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  try {
    const rawBody = await readRequestBody(req)
    const signatureHeader = req.headers['x-helius-signature']
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader

    if (!verifySignature(rawBody, signature)) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    const payload = JSON.parse(rawBody) as HeliusTx[]
    if (!Array.isArray(payload)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Expected an array payload' }))
      return
    }

    const rows = payload
      .map((tx) => {
        const potPubkey = inferPotPubkey(tx)
        const txSignature = tx.signature
        if (!potPubkey || !txSignature || tx.transactionError) return null
        return {
          pot_pubkey: potPubkey,
          kind: classifyKind(tx),
          signature: txSignature,
          payload: tx,
        }
      })
      .filter((row): row is { pot_pubkey: string; kind: NotificationKind; signature: string; payload: HeliusTx } => Boolean(row))

    if (rows.length > 0) {
      const { error } = await getSupabase().from('pot_notifications').insert(rows)
      if (error) throw new Error(error.message)
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ inserted: rows.length }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: message }))
  }
}
