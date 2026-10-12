import { NextResponse } from 'next/server'
import { PACKET_DATA_SIZE, PublicKey, TransactionMessage, VersionedTransaction, type TransactionInstruction } from '@solana/web3.js'
import { createBurnCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token'
import registry from '@/lib/pot-index/assets.devnet.json'
import { buildDeposit, buildExit, buildExitUsdcPair, fetchPot, fetchPotBalances, EXIT_FEE_BPS } from '@/lib/pot-index/client'
import {
  assertDevnet,
  buildHolderTx,
  issueToken,
  missingAtaCreations,
  mmPayInstruction,
  newTicket,
  operatorConnection,
  operatorKeypair,
  potProgram,
  quoteExitUsdc,
  refreshPrices,
  txSize,
} from '@/lib/pot-index/operator.server'

/**
 * POST /api/pot-index/tx/prepare
 *   { kind: 'deposit', wallet, mint, amountUsdc, referrer? }
 *   { kind: 'exit', wallet, mint, shares }          in kind
 *   { kind: 'exit-usdc', wallet, mint, shares }     sold to the devnet market maker
 * Returns ONE transaction for the holder to sign (recent blockhash: about a minute to sign) and a token
 * for /tx/submit. See operator.server.ts for the why.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

type Body = { kind?: string; wallet?: string; mint?: string; amountUsdc?: number; shares?: string | number; referrer?: string | null }

export async function POST(req: Request) {
  try {
    assertDevnet()
    const op = operatorKeypair()
    const b = (await req.json()) as Body
    const kind = String(b.kind)
    const wallet = new PublicKey(b.wallet ?? '')
    const mint = new PublicKey(b.mint ?? '')
    const connection = operatorConnection()
    const usdcMint = new PublicKey(registry.usdcMint)
    const treasury = new PublicKey(registry.treasury)
    const pot = await fetchPot(connection, mint)
    if (!pot) return NextResponse.json({ error: 'pot not found' }, { status: 404 })
    const program = potProgram(connection, wallet)
    const feedIds = pot.legs.map((l) => l.feedId)

    let ixs: TransactionInstruction[]
    let summary: Record<string, string> = {}
    let needsPrices = true
    if (kind === 'deposit') {
      const amountUsdc = Number(b.amountUsdc)
      if (!(amountUsdc >= 1)) return NextResponse.json({ error: 'amount' }, { status: 400 })
      const referrer = b.referrer ? new PublicKey(b.referrer) : null
      // Fresh prices now so the wallet's own simulation passes; refreshed again right before submit.
      const priceUpdates = await refreshPrices(connection, op, feedIds)
      ixs = await buildDeposit(program, { pot, user: wallet, usdcMint, treasury, amountUsdc, minSharesOut: 0, referrer: referrer && !referrer.equals(wallet) ? referrer : null, priceUpdates })
    } else if (kind === 'exit') {
      const shares = Number(b.shares)
      if (!(shares > 0)) return NextResponse.json({ error: 'shares' }, { status: 400 })
      ixs = await buildExit(program, { pot, user: wallet, usdcMint, shares })
      needsPrices = false
    } else if (kind === 'exit-usdc') {
      const shares = BigInt(b.shares ?? 0)
      if (shares <= 0n) return NextResponse.json({ error: 'shares' }, { status: 400 })
      const bal = await fetchPotBalances(connection, pot)
      if (BigInt(bal.supply) < shares) return NextResponse.json({ error: 'shares exceed supply' }, { status: 400 })
      const { legOut, payUsdc } = await quoteExitUsdc(pot, bal, shares, EXIT_FEE_BPS)
      const priceUpdates = await refreshPrices(connection, op, feedIds)
      const { pre, open, close } = await buildExitUsdcPair(program, { pot, user: wallet, usdcMint, treasury, shares: Number(shares), minUsdcOut: 0, priceUpdates })
      // Devnet "sale": the legs are test tokens the market maker mints, so selling them to it is
      // burning them (saves the market maker's three receiving accounts so the transaction fits in
      // one packet). Mainnet: Jupiter swaps here.
      const sale: TransactionInstruction[] = []
      pot.legs.forEach((l, i) => {
        if (legOut[i] === 0n) return
        sale.push(createBurnCheckedInstruction(getAssociatedTokenAddressSync(l.mint, wallet), l.mint, wallet, legOut[i], l.decimals))
      })
      ixs = [...pre, open, ...sale, ...mmPayInstruction(op, wallet, usdcMint, payUsdc), close]
      summary = { payUsdc: payUsdc.toString() }
    } else return NextResponse.json({ error: 'kind' }, { status: 400 })

    // The holder pays the rent of its new token accounts (security.md, O1). The creations ride in
    // the holder's transaction when it fits in one packet; otherwise they go first, in a setup
    // transaction the holder signs in the same wallet prompt.
    const { creations, rest } = await missingAtaCreations(connection, wallet, ixs)
    const built = await buildHolderTx(connection, op, wallet, [...creations, ...rest])
    const { blockhash, lastValidBlockHeight } = built
    let tx = built.tx
    let setup: VersionedTransaction | null = null
    if (creations.length && txSize(tx) > PACKET_DATA_SIZE) {
      const v0 = (list: TransactionInstruction[]) =>
        new VersionedTransaction(new TransactionMessage({ payerKey: wallet, recentBlockhash: blockhash, instructions: list }).compileToV0Message())
      setup = v0(creations)
      tx = v0(rest)
    }
    const token = issueToken(op, newTicket(kind, wallet, mint, needsPrices ? feedIds : [], tx, { blockhash, lastValidBlockHeight }, setup))
    const b64 = (v: VersionedTransaction) => Buffer.from(v.serialize()).toString('base64')
    return NextResponse.json({ ok: true, tx: b64(tx), ...(setup ? { setup: b64(setup) } : {}), token, ...summary })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

