import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: { pubkey: string } },
) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('swap_proposal_meta')
    .select('*')
    .eq('proposal_pubkey', params.pubkey)
    .single()

  if (error || !data) return NextResponse.json(null, { status: 404 })

  return NextResponse.json({
    inputMint:      data.input_mint,
    outputMint:     data.output_mint,
    amountLamports: data.amount_lamports,
    inputSymbol:    data.input_symbol,
    outputSymbol:   data.output_symbol,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { pubkey: string } },
) {
  const body = await req.json()
  const supabase = createServerSupabase()

  const { error } = await supabase.from('swap_proposal_meta').upsert({
    proposal_pubkey: params.pubkey,
    input_mint:      body.inputMint,
    output_mint:     body.outputMint,
    amount_lamports: body.amountLamports,
    input_symbol:    body.inputSymbol ?? null,
    output_symbol:   body.outputSymbol ?? null,
    created_at:      new Date().toISOString(),
  }, { onConflict: 'proposal_pubkey' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { pubkey: string } },
) {
  const supabase = createServerSupabase()
  await supabase
    .from('swap_proposal_meta')
    .delete()
    .eq('proposal_pubkey', params.pubkey)

  return NextResponse.json({ ok: true })
}
