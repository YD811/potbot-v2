import { NextRequest, NextResponse } from 'next/server'
import { getSweepAddress } from '@/lib/sweep-wallet'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { potPubkey: string } }
) {
  const { potPubkey } = params

  if (!potPubkey || potPubkey.length < 32) {
    return NextResponse.json({ error: 'Invalid potPubkey' }, { status: 400 })
  }

  const address = getSweepAddress(potPubkey)
  const network = process.env.NEXT_PUBLIC_NETWORK ?? 'devnet'
  const explorerUrl = `https://explorer.solana.com/address/${address}${
    network === 'devnet' ? '?cluster=devnet' : ''
  }`

  return NextResponse.json({
    address,
    potPubkey,
    network,
    explorerUrl,
  })
}
