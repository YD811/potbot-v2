import { NextResponse } from 'next/server'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import registry from '@/lib/pot-index/assets.devnet.json'

/**
 * POST /api/pot-index/faucet  { wallet }
 * Devnet only: mints 1,000 test USDC to the wallet. Signer comes from POT_INDEX_FAUCET_KEYPAIR
 * (JSON array secret key) — the mint authority of the test USDC mint.
 */
export const runtime = 'nodejs'

const AMOUNT = 1_000n * 1_000_000n
const recent = new Map<string, number>()

export async function POST(req: Request) {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet').toLowerCase()
  if (network.startsWith('mainnet')) return NextResponse.json({ error: 'faucet is devnet-only' }, { status: 403 })
  const secret = process.env.POT_INDEX_FAUCET_KEYPAIR
  if (!secret) return NextResponse.json({ error: 'faucet not configured' }, { status: 503 })

  let wallet: PublicKey
  try {
    const body = (await req.json()) as { wallet?: string }
    wallet = new PublicKey(body.wallet ?? '')
  } catch {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 })
  }
  const last = recent.get(wallet.toBase58()) ?? 0
  if (Date.now() - last < 60_000) return NextResponse.json({ error: 'try again in a minute' }, { status: 429 })

  try {
    const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed')
    const mint = new PublicKey(registry.usdcMint)
    const acc = await getOrCreateAssociatedTokenAccount(connection, payer, mint, wallet)
    const sig = await mintTo(connection, payer, mint, acc.address, payer, AMOUNT)
    recent.set(wallet.toBase58(), Date.now())
    return NextResponse.json({ ok: true, sig })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
