import { NextResponse } from 'next/server'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import registry from '@/lib/pot-index/assets.devnet.json'

/**
 * POST /api/pot-index/faucet  { wallet }
 * Devnet only: mints 1,000 test USDC to the wallet and, when the wallet holds less than
 * SOL_MIN, tops it up with SOL_TOPUP so a fresh (email / embedded) wallet can pay fees and the
 * refundable rent of posted Pyth accounts. Signer comes from POT_INDEX_FAUCET_KEYPAIR (JSON array
 * secret key) — the mint authority of the test USDC mint.
 */
export const runtime = 'nodejs'

const AMOUNT = 1_000n * 1_000_000n
const SOL_MIN = 0.05 * LAMPORTS_PER_SOL
const SOL_TOPUP = 0.1 * LAMPORTS_PER_SOL
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
    let solSig: string | null = null
    try {
      const lamports = await connection.getBalance(wallet)
      const payerLamports = await connection.getBalance(payer.publicKey)
      if (lamports < SOL_MIN && payerLamports > SOL_TOPUP * 5) {
        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: wallet, lamports: SOL_TOPUP }))
        solSig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'confirmed' })
      }
    } catch {
      // USDC already landed; a failed SOL top-up is reported as null and the UI points to the airdrop button.
    }
    return NextResponse.json({ ok: true, sig, solSig, sol: solSig ? SOL_TOPUP / LAMPORTS_PER_SOL : 0 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
