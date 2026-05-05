import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { renderEmail, renderEmailPlainText } from '@/lib/email-template'

/**
 * Admin-triggered bulk-email endpoint.
 *
 * Auth:  Authorization: Bearer <ADMIN_SECRET>
 *
 * Body:
 *   {
 *     "subject":    "PotBot devnet is live",
 *     "preheader":  "Founding members, your early access has landed.",
 *     "headline":   "Devnet is live",
 *     "body":       "<p>You asked to be first…</p>",
 *     "ctaLabel":   "Open PotBot",
 *     "ctaUrl":     "https://potbot.fun",
 *
 *     // Optional filters / dry-run
 *     "sourceFilter":  "signup",        // only email rows with this source
 *     "emailOverride": "me@example.com", // send only to this email (for testing)
 *     "dryRun":        true              // render + fetch recipients, don't send
 *   }
 *
 * Requires these env vars in production:
 *   ADMIN_SECRET             — shared secret that gates this endpoint
 *   RESEND_API_KEY           — from https://resend.com/api-keys
 *   RESEND_FROM              — e.g. "PotBot <hello@potbot.fun>"  (must be verified in Resend)
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

export const runtime = 'nodejs' // force node runtime (we use fetch to Resend, big batches)

// Resend per-batch limit is 100 recipients per call. Tune if you change providers.
const BATCH_SIZE = 50
const RESEND_BATCH_ENDPOINT = 'https://api.resend.com/emails/batch'

interface SendBody {
  subject: string
  preheader?: string
  headline: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  sourceFilter?: string
  emailOverride?: string
  dryRun?: boolean
}

function unauthorized(msg = 'Unauthorized') {
  return NextResponse.json({ error: msg }, { status: 401 })
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

function requireAdmin(req: NextRequest): string | null {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return 'ADMIN_SECRET not set on the server'
  const auth = req.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (provided !== secret) return 'Invalid ADMIN_SECRET'
  return null
}

async function fetchRecipients(opts: {
  sourceFilter?: string
  emailOverride?: string
}): Promise<string[]> {
  if (opts.emailOverride) return [opts.emailOverride.trim().toLowerCase()]

  if (!isSupabaseConfigured) {
    console.warn('[send-email] Supabase not configured — no recipients to send to.')
    return []
  }

  const db = createServerSupabase()
  let query = db.from('waitlist').select('email').not('email', 'is', null)
  if (opts.sourceFilter) query = query.eq('source', opts.sourceFilter)

  const { data, error } = await query
  if (error) {
    console.error('[send-email] failed to load recipients:', error)
    throw new Error('Failed to load recipients from Supabase')
  }
  // Dedup + sanitise
  return Array.from(
    new Set((data ?? []).map((r) => (r.email ?? '').trim().toLowerCase()).filter(Boolean)),
  )
}

interface BatchResult {
  sent: number
  failed: number
  errors: Array<{ batch: number; error: string }>
}

async function sendBatches(
  recipients: string[],
  payload: SendBody,
): Promise<BatchResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'PotBot <onboarding@resend.dev>'

  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set. Create one at https://resend.com/api-keys and add to .env.local',
    )
  }

  const html = renderEmail({
    subject: payload.subject,
    preheader: payload.preheader,
    headline: payload.headline,
    body: payload.body,
    ctaLabel: payload.ctaLabel,
    ctaUrl: payload.ctaUrl,
  })
  const text = renderEmailPlainText({
    subject: payload.subject,
    preheader: payload.preheader,
    headline: payload.headline,
    body: payload.body,
    ctaLabel: payload.ctaLabel,
    ctaUrl: payload.ctaUrl,
  })

  const result: BatchResult = { sent: 0, failed: 0, errors: [] }

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE)
    // Resend's batch endpoint: each element is a full email payload.
    const batchIdx = Math.floor(i / BATCH_SIZE) + 1
    const items = chunk.map((to) => ({
      from,
      to,
      subject: payload.subject,
      html,
      text,
    }))

    try {
      const res = await fetch(RESEND_BATCH_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
      })
      if (!res.ok) {
        const errText = await res.text()
        console.error(`[send-email] batch ${batchIdx} failed:`, res.status, errText)
        result.failed += chunk.length
        result.errors.push({ batch: batchIdx, error: `${res.status}: ${errText.slice(0, 300)}` })
      } else {
        result.sent += chunk.length
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[send-email] batch ${batchIdx} threw:`, msg)
      result.failed += chunk.length
      result.errors.push({ batch: batchIdx, error: msg })
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req)
  if (authErr) return unauthorized(authErr)

  let body: SendBody
  try {
    body = (await req.json()) as SendBody
  } catch {
    return bad('Invalid JSON body')
  }

  if (!body?.subject?.trim()) return bad('subject is required')
  if (!body?.headline?.trim()) return bad('headline is required')
  if (!body?.body?.trim()) return bad('body is required')

  let recipients: string[]
  try {
    recipients = await fetchRecipients({
      sourceFilter: body.sourceFilter,
      emailOverride: body.emailOverride,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load recipients' },
      { status: 500 },
    )
  }

  if (recipients.length === 0) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      recipientsPreviewCount: 0,
      note: 'No recipients matched the filter.',
    })
  }

  // Dry run — return what we'd send without calling Resend.
  if (body.dryRun) {
    return NextResponse.json({
      dryRun: true,
      recipientsPreviewCount: recipients.length,
      samplePreview: recipients.slice(0, 5),
      renderedHtmlLength: renderEmail({
        subject: body.subject,
        preheader: body.preheader,
        headline: body.headline,
        body: body.body,
        ctaLabel: body.ctaLabel,
        ctaUrl: body.ctaUrl,
      }).length,
    })
  }

  try {
    const result = await sendBatches(recipients, body)
    return NextResponse.json({
      ...result,
      recipientsTotal: recipients.length,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Send failed' },
      { status: 500 },
    )
  }
}

export async function GET() {
  // Simple health-check: tells you whether the required env vars are present.
  return NextResponse.json({
    adminSecretConfigured: !!process.env.ADMIN_SECRET,
    resendKeyConfigured: !!process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM ?? null,
    supabaseConfigured: isSupabaseConfigured,
  })
}
