import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'

const JUP_QUOTE = 'https://quote-api.jup.ag/v6/quote'
const JUP_SWAP  = 'https://quote-api.jup.ag/v6/swap'

/**
 * POST /api/proposals/[pubkey]/execute
 * Body: { inputMint, outputMint, amountLamports, slippageBps?, signerPublicKey }
 *
 * Returns: { swapTransaction, route, inAmount, outAmount }
 * The client signs and sends the transaction.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { pubkey: string } },
) {
  try {
    const { inputMint, outputMint, amountLamports, slippageBps = 50, signerPublicKey } = await req.json()

    if (!inputMint || !outputMint || !amountLamports || !signerPublicKey) {
      return NextResponse.json(
        { error: 'inputMint, outputMint, amountLamports, signerPublicKey required' },
        { status: 400 },
      )
    }

    // 1. Validate proposal is in passed state (if Supabase configured)
    if (isSupabaseConfigured) {
      const db = createServerSupabase()
      const { data: proposal } = await db
        .from('proposals')
        .select('status')
        .eq('pubkey', params.pubkey)
        .single()

      if (proposal && proposal.status !== 'passed') {
        return NextResponse.json(
          { error: `Proposal status is "${proposal.status}", must be "passed"` },
          { status: 400 },
        )
      }
    }

    // 2. Get Jupiter quote
    const quoteParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount: String(Math.floor(amountLamports)),
      slippageBps: String(slippageBps),
      dynamicSlippage: 'true',
    })

    const quoteRes = await fetch(`${JUP_QUOTE}?${quoteParams}`)
    if (!quoteRes.ok) {
      const err = await quoteRes.text()
      return NextResponse.json({ error: `Jupiter quote failed: ${err}` }, { status: 502 })
    }
    const quote = await quoteRes.json()

    // 3. Build swap transaction
    const swapRes = await fetch(JUP_SWAP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: signerPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    })

    if (!swapRes.ok) {
      const err = await swapRes.text()
      return NextResponse.json({ error: `Jupiter swap build failed: ${err}` }, { status: 502 })
    }

    const swapData = await swapRes.json()

    // 4. Mark proposal as pending_execution in DB.
    // We do NOT mark as 'executed' here — the client hasn't signed yet.
    // A Helius webhook (or /api/proposals/[pubkey]/confirm) should update
    // status to 'executed' once the tx lands on-chain.
    if (isSupabaseConfigured) {
      const db = createServerSupabase()
      await db
        .from('proposals')
        .update({ status: 'pending_execution' })
        .eq('pubkey', params.pubkey)
        .eq('status', 'passed') // idempotent: only move forward if still passed
    }

    // Extract route description
    const route = (quote.routePlan ?? [])
      .map((r: any) => r.swapInfo?.label)
      .filter(Boolean)
      .join(' → ') || 'Jupiter'

    return NextResponse.json({
      ok: true,
      swapTransaction: swapData.swapTransaction,
      route,
      inAmount:  String(quote.inAmount ?? amountLamports),
      outAmount: String(quote.outAmount ?? '0'),
      priceImpactPct: String(quote.priceImpactPct ?? '0'),
    })
  } catch (e) {
    console.error('Execute proposal error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
