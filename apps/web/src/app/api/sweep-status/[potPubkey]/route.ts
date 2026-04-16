import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getSweepAddress } from '@/lib/sweep-wallet'

export const runtime = 'nodejs'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com'

export async function GET(
  _req: NextRequest,
  { params }: { params: { potPubkey: string } }
) {
  const { potPubkey } = params

  try {
    const connection = new Connection(RPC_URL, 'confirmed')
    const sweepAddress = getSweepAddress(potPubkey)
    const pubkey = new PublicKey(sweepAddress)

    const balance = await connection.getBalance(pubkey)
    const balanceSol = balance / LAMPORTS_PER_SOL

    // Get recent signatures for this address
    const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 5 })

    return NextResponse.json({
      address: sweepAddress,
      balanceSol,
      hasBalance: balanceSol > 0.001,
      recentTxCount: sigs.length,
      lastTx: sigs[0]?.signature ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
