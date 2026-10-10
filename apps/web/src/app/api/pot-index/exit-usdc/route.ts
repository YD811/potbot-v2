import { NextResponse } from 'next/server'
import { AnchorProvider, Program, type Idl, type Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, type VersionedTransaction } from '@solana/web3.js'
import { createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token'
import idl from '@/lib/pot-index/idl.json'
import registry from '@/lib/pot-index/assets.devnet.json'
import { buildExitUsdcPair, fetchPot, fetchPotBalances, EXIT_FEE_BPS } from '@/lib/pot-index/client'
import { buildWithPythUpdates, fetchHermesPrices } from '@/lib/pot-index/pyth-post'

/**
 * POST /api/pot-index/exit-usdc  { wallet, mint, shares }
 *
 * Devnet market maker for "exit to USDC". Builds the whole bundle for the holder to sign:
 *   post Pyth prices → exit_usdc_open → holder sends each leg to the market maker → market maker
 *   pays USDC at the Hermes mid price → exit_usdc_close → close Pyth accounts.
 * The market maker is the test-USDC mint authority (POT_INDEX_FAUCET_KEYPAIR), so it pays by
 * minting; on mainnet the sale step becomes Jupiter swaps signed by the holder alone.
 * The program enforces the minimum (Pyth price − conf, minus slippage, minus 0.10% fee) on-chain,
 * so this server cannot short the holder even if it wanted to.
 */
export const runtime = 'nodejs'

const BPS = 10_000

function readOnlyWallet(publicKey: PublicKey): Wallet {
  return { publicKey, signTransaction: async <T,>(t: T) => t, signAllTransactions: async <T,>(t: T) => t } as unknown as Wallet
}

export async function POST(req: Request) {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet').toLowerCase()
  if (network.startsWith('mainnet')) return NextResponse.json({ error: 'devnet market maker only' }, { status: 403 })
  const secret = process.env.POT_INDEX_FAUCET_KEYPAIR
  if (!secret) return NextResponse.json({ error: 'market maker not configured' }, { status: 503 })

  let wallet: PublicKey
  let mint: PublicKey
  let shares: bigint
  try {
    const body = (await req.json()) as { wallet?: string; mint?: string; shares?: string | number }
    wallet = new PublicKey(body.wallet ?? '')
    mint = new PublicKey(body.mint ?? '')
    shares = BigInt(body.shares ?? 0)
    if (shares <= 0n) throw new Error('shares')
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }

  try {
    const mm = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed')
    const usdcMint = new PublicKey(registry.usdcMint)
    const treasury = new PublicKey(registry.treasury)
    const pot = await fetchPot(connection, mint)
    if (!pot) return NextResponse.json({ error: 'pot not found' }, { status: 404 })
    const bal = await fetchPotBalances(connection, pot)
    if (BigInt(bal.supply) < shares) return NextResponse.json({ error: 'shares exceed supply' }, { status: 400 })

    // What the holder will receive per leg (same integer math as the program) and its mid-price value.
    const feedIds = pot.legs.map((l) => l.feedId)
    const prices = await fetchHermesPrices(feedIds)
    const legOut = pot.legs.map((l, i) => {
      const gross = (BigInt(bal.legs[i]) * shares) / BigInt(bal.supply)
      return (gross * BigInt(BPS - EXIT_FEE_BPS)) / BigInt(BPS)
    })
    let payUsdc = 0n
    pot.legs.forEach((l, i) => {
      const p = prices[l.feedId]?.price ?? 0
      if (p <= 0) throw new Error(`no price for leg ${i}`)
      // base units × price → micro-USD
      payUsdc += BigInt(Math.floor((Number(legOut[i]) / 10 ** l.decimals) * p * 1e6))
    })

    const program = new Program(idl as Idl, new AnchorProvider(connection, readOnlyWallet(wallet), { commitment: 'confirmed' }))
    const txs = await buildWithPythUpdates(connection, readOnlyWallet(wallet), feedIds, async (priceUpdates) => {
      const { pre, open, close } = await buildExitUsdcPair(program, {
        pot,
        user: wallet,
        usdcMint,
        treasury,
        shares: Number(shares),
        minUsdcOut: 0,
        priceUpdates,
      })
      const userUsdc = getAssociatedTokenAddressSync(usdcMint, wallet)
      const sale = pot.legs.flatMap((l, i) => {
        if (legOut[i] === 0n) return []
        const mmAta = getAssociatedTokenAddressSync(l.mint, mm.publicKey)
        return [
          createAssociatedTokenAccountIdempotentInstruction(wallet, mmAta, mm.publicKey, l.mint),
          createTransferCheckedInstruction(getAssociatedTokenAddressSync(l.mint, wallet), l.mint, mmAta, wallet, legOut[i], l.decimals),
        ]
      })
      const pay = payUsdc > 0n ? [createMintToInstruction(usdcMint, userUsdc, mm.publicKey, payUsdc)] : []
      return [...pre, open, ...sale, ...pay, close]
    })

    // Partially sign with the market maker where it is a required signer; the holder signs the rest.
    const out = txs.map(({ tx, signers }) => {
      const v = tx as VersionedTransaction
      if (signers.length) v.sign(signers as never[])
      const needsMm = v.message.staticAccountKeys.some((k, i) => k.equals(mm.publicKey) && v.message.isAccountSigner(i))
      if (needsMm) v.sign([mm])
      return Buffer.from(v.serialize()).toString('base64')
    })
    return NextResponse.json({ ok: true, txs: out, payUsdc: payUsdc.toString(), legOut: legOut.map(String) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
