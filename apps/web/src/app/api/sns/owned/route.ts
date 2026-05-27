import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { listOwned } from '@/lib/sns-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ownerRaw = req.nextUrl.searchParams.get('owner') ?? ''
  let owner: PublicKey
  try { owner = new PublicKey(ownerRaw) } catch { return NextResponse.json({ error: 'invalid_owner' }, { status: 400 }) }
  try {
    const names = await listOwned(owner)
    return NextResponse.json({ owner: owner.toBase58(), names }, { headers: { 'cache-control': 'no-store' } })
  } catch (err) {
    console.error('[sns/owned]', err)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }
}
