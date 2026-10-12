import { NextResponse } from 'next/server'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import { fetchPot } from '@/lib/pot-index/client'
import { allocateAsKeeper, assertDevnet, operatorConnection, operatorKeypair, refreshPrices, sendAndConfirm, verifyToken } from '@/lib/pot-index/operator.server'

/**
 * POST /api/pot-index/tx/submit  { tx: base64 (signed by the holder), token }
 * The operator refreshes the Pyth prices the transaction reads, adds its own signature when the
 * transaction needs it (devnet market maker), sends, confirms. For a deposit it then deploys the cash into
 * the basket as keeper. The token proves the operator built exactly these message bytes, so it
 * never co-signs anything else.
 */
export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  try {
    assertDevnet()
    const op = operatorKeypair()
    const b = (await req.json()) as { tx?: string; token?: string; timing?: unknown }
    if (b.timing) console.log('[potfolio submit] timing', JSON.stringify(b.timing))
    const tx = VersionedTransaction.deserialize(Buffer.from(b.tx ?? '', 'base64'))
    const t = verifyToken(op, tx, b.token ?? '')
    const keysDbg = tx.message.staticAccountKeys.map((k) => k.toBase58().slice(0, 6))
    console.log('[potfolio submit] tx', JSON.stringify({ kind: t.kind, sameBlockhash: tx.message.recentBlockhash === t.blockhash, nIx: tx.message.compiledInstructions.length, programs: tx.message.compiledInstructions.map((ci) => tx.message.staticAccountKeys[ci.programIdIndex].toBase58().slice(0, 8)), sigs: tx.signatures.length, keys: keysDbg.length, alt: tx.message.addressTableLookups.length }))
    const keys = tx.message.staticAccountKeys
    const holder = new PublicKey(t.wallet)
    const hi = keys.findIndex((k) => k.equals(holder))
    if (hi < 0 || tx.signatures[hi].every((x) => x === 0)) return NextResponse.json({ error: 'not signed by the holder' }, { status: 400 })
    const connection = operatorConnection()
    if (t.feedIds.length) await refreshPrices(connection, op, t.feedIds)
    const opIndex = keys.findIndex((k) => k.equals(op.publicKey))
    if (opIndex >= 0 && tx.message.isAccountSigner(opIndex)) tx.sign([op])
    const sig = await sendAndConfirm(connection, tx, { blockhash: t.blockhash, lastValidBlockHeight: t.lastValidBlockHeight })
    let allocated: string[] = []
    if (t.kind === 'deposit') {
      try {
        const pot = await fetchPot(connection, new PublicKey(t.mint))
        if (pot) allocated = await allocateAsKeeper(connection, op, pot, await refreshPrices(connection, op, pot.legs.map((l) => l.feedId)))
      } catch {
        /* keepers finish later */
      }
    }
    return NextResponse.json({ ok: true, sig, allocated })
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    console.error('[potfolio submit] failed', m.slice(0, 600))
    const low = m.toLowerCase()
    if (low.includes('blockhash not found') || low.includes('block height exceeded') || low.includes('expired'))
      return NextResponse.json({ error: 'That signature took longer than the network allows (about a minute). Nothing changed. Confirm again.', expired: true }, { status: 409 })
    return NextResponse.json({ error: m }, { status: 500 })
  }
}
