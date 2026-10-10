import { NextResponse } from 'next/server'
import { AnchorProvider, Program, type Idl, type Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token'
import idl from '@/lib/pot-index/idl.json'
import registry from '@/lib/pot-index/assets.devnet.json'
import { buildRebalancePair, CASH_LEG, fetchPot, fetchPotBalances } from '@/lib/pot-index/client'
import { buildPythSession, fetchHermesPrices } from '@/lib/pot-index/pyth-post'

/**
 * POST /api/pot-index/allocate  { wallet, mint, depositNetUsdc? }
 *
 * "Deposit and allocate": right after a deposit lands as USDC cash, buy the basket in the same
 * wallet prompt. The holder acts as the keeper: for every underweight leg, one transaction
 *   rebalance_open(cash → leg) → holder pays the devnet market maker → market maker fills the vault → rebalance_close
 * all sharing one posted set of Pyth prices. The program enforces every bound on-chain (toward
 * target only, max 25% of NAV per trade, inside the Pyth band); this server only plans amounts.
 * `depositNetUsdc` (base units) lets the plan include a deposit that is sent just before.
 * Devnet market maker = test-token mint authority (POT_INDEX_FAUCET_KEYPAIR); on mainnet the
 * fill becomes a Jupiter swap signed by the holder.
 */
export const runtime = 'nodejs'

const BPS = 10_000
const DEADBAND_BPS = 50
const MARGIN = 0.98

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
  let depositNet = 0
  try {
    const body = (await req.json()) as { wallet?: string; mint?: string; depositNetUsdc?: string | number }
    wallet = new PublicKey(body.wallet ?? '')
    mint = new PublicKey(body.mint ?? '')
    depositNet = Math.max(0, Number(body.depositNetUsdc ?? 0))
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }

  try {
    const mm = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed')
    const usdcMint = new PublicKey(registry.usdcMint)
    const pot = await fetchPot(connection, mint)
    if (!pot) return NextResponse.json({ error: 'pot not found' }, { status: 404 })
    const bal = await fetchPotBalances(connection, pot)
    const feedIds = pot.legs.map((l) => l.feedId)
    const prices = await fetchHermesPrices(feedIds)
    const price = pot.legs.map((l) => prices[l.feedId]?.price ?? 0)
    if (price.some((p) => p <= 0)) return NextResponse.json({ error: 'missing price' }, { status: 503 })

    // Plan in USD (micro): deploy cash leg by leg toward target, inside the on-chain bounds.
    const legUsd = pot.legs.map((l, i) => (bal.legs[i] / 10 ** l.decimals) * price[i] * 1e6)
    let cash = bal.cash + depositNet
    const nav = cash + legUsd.reduce((s, v) => s + v, 0)
    if (nav <= 0) return NextResponse.json({ ok: true, txs: [], plan: [] })
    const maxTrade = (nav * pot.maxTradeBps) / BPS
    const deadband = (nav * DEADBAND_BPS) / BPS
    const plan: { leg: number; amountOut: number; amountIn: number }[] = []
    // Several passes: each trade is capped at max_trade_bps of NAV, so a large deposit needs more
    // than one trade per leg. Biggest gap first, so a small deposit goes where it matters most.
    for (let pass = 0; pass < 4 && cash >= deadband; pass++) {
      const order = pot.legs
        .map((l, i) => ({ i, gap: (nav * l.weightBps) / BPS - legUsd[i] }))
        .filter((g) => g.gap > 0)
        .sort((a, b) => b.gap - a.gap)
      let moved = false
      for (const { i, gap } of order) {
        if (cash < deadband) break
        const tradeUsd = Math.floor(Math.min(gap, cash, maxTrade) * MARGIN)
        if (tradeUsd < 500_000) continue // < $0.50
        const amountIn = Math.floor((tradeUsd / 1e6 / price[i]) * 10 ** pot.legs[i].decimals)
        if (amountIn <= 0) continue
        plan.push({ leg: i, amountOut: tradeUsd, amountIn })
        cash -= tradeUsd
        legUsd[i] += tradeUsd
        moved = true
      }
      if (!moved) break
    }
    if (plan.length === 0) return NextResponse.json({ ok: true, txs: [], plan: [] })

    const program = new Program(idl as Idl, new AnchorProvider(connection, readOnlyWallet(wallet), { commitment: 'confirmed' }))
    const session = await buildPythSession(connection, readOnlyWallet(wallet), feedIds)
    const { blockhash } = await connection.getLatestBlockhash('finalized')
    const userUsdc = getAssociatedTokenAddressSync(usdcMint, wallet)
    const mmUsdc = getAssociatedTokenAddressSync(usdcMint, mm.publicKey)

    const middle: VersionedTransaction[] = []
    for (const p of plan) {
      const leg = pot.legs[p.leg]
      const { open, close } = await buildRebalancePair(program, {
        pot,
        keeper: wallet,
        usdcMint,
        legOut: CASH_LEG,
        legIn: p.leg,
        amountOut: p.amountOut,
        priceUpdates: session.priceUpdates,
      })
      const ixs = [
        createAssociatedTokenAccountIdempotentInstruction(wallet, mmUsdc, mm.publicKey, usdcMint),
        open,
        // holder pays the market maker the cash the Pot just handed them...
        createTransferCheckedInstruction(userUsdc, usdcMint, mmUsdc, wallet, BigInt(p.amountOut), 6),
        // ...and the market maker fills the Pot's vault with the asset (devnet: minted).
        createMintToInstruction(leg.mint, leg.vault, mm.publicKey, BigInt(p.amountIn)),
        close,
      ]
      const msg = new TransactionMessage({ payerKey: wallet, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message()
      const v = new VersionedTransaction(msg)
      v.sign([mm])
      middle.push(v)
    }

    const ser = (v: VersionedTransaction) => Buffer.from(v.serialize()).toString('base64')
    const sign = ({ tx, signers }: { tx: VersionedTransaction; signers: { publicKey: PublicKey; secretKey: Uint8Array }[] }) => {
      if (signers.length) tx.sign(signers as never[])
      return tx
    }
    const txs = [...session.postTxs.map((t) => ser(sign(t))), ...middle.map(ser), ...session.closeTxs.map((t) => ser(sign(t)))]
    return NextResponse.json({ ok: true, txs, plan })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
