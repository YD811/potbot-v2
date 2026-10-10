import { NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { fetchPot } from '@/lib/pot-index/client'
import { assetByMint } from '@/lib/pot-index/registry'

/** Metaplex-style metadata JSON for a Pot's index token, generated from chain state. */
export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params
  let key: PublicKey
  try {
    key = new PublicKey(mint)
  } catch {
    return NextResponse.json({ error: 'bad mint' }, { status: 400 })
  }
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed')
  const pot = await fetchPot(connection, key)
  if (!pot) return NextResponse.json({ error: 'pot not found' }, { status: 404 })
  const origin = new URL(req.url).origin
  const comp = pot.legs.map((l) => `${assetByMint(l.mint.toBase58())?.symbol ?? l.mint.toBase58().slice(0, 4)} ${l.weightBps / 100}%`).join(' / ')
  return NextResponse.json(
    {
      name: pot.name,
      symbol: pot.symbol,
      description: `PotBot POTfolio index token: ${comp}. Mint at NAV, exit in kind.`,
      image: `${origin}/token-meta/potbot-512.png`,
      external_url: `${origin}/portfolios/${mint}`,
    },
    { headers: { 'cache-control': 'public, max-age=300' } },
  )
}
