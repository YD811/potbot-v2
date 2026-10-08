/**
 * Devnet keeper for pot_index — one rebalance step with a mock market maker.
 *
 *   npx tsx scripts/pot-index-devnet-keeper.ts [indexMint] [--loop SECONDS] [--dry]
 *
 * Reads the Pot, prices every leg from Hermes, picks the most overweight leg (cash counts as
 * overweight whenever it is non-zero) and the most underweight leg, and submits ONE transaction:
 *
 *   post Pyth updates → rebalance_open → mock swap → rebalance_close → close Pyth accounts
 *
 * The mock swap is an SPL transfer from the keeper's own inventory (minted by the init script)
 * into the Pot's in-vault at the Hermes mid price. On mainnet this instruction becomes a Jupiter
 * swap; the program does not care who fills, only that `close` sees at least `min_in`.
 *
 * Keeper keypair: $POT_INDEX_KEEPER_KEYPAIR (default ~/.config/solana/id.json, i.e. the admin).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AnchorProvider, Program, Wallet, type Idl } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, type VersionedTransaction } from '@solana/web3.js'
import { createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token'
import idl from '../src/lib/pot-index/idl.json'
import registry from '../src/lib/pot-index/assets.devnet.json'
import { CASH_LEG, buildRebalancePair, fetchPot, fetchPotBalances } from '../src/lib/pot-index/client'
import { buildWithPythUpdates, fetchHermesPrices } from '../src/lib/pot-index/pyth-post'

const RPC = process.env.POT_INDEX_RPC ?? 'https://api.devnet.solana.com'
const KEYPAIR = process.env.POT_INDEX_KEEPER_KEYPAIR ?? path.join(os.homedir(), '.config/solana/id.json')
const BPS = 10_000
const DEADBAND_BPS = 50 // mirrors REBALANCE_DEADBAND_BPS on-chain

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const loopIdx = args.indexOf('--loop')
const loopSecs = loopIdx >= 0 ? Number(args[loopIdx + 1]) : 0
const mintArg = args.find((a) => !a.startsWith('--') && a !== String(loopSecs))
const mintStr = mintArg ?? registry.flagship
if (!mintStr) {
  console.error('no Pot given and assets.devnet.json has no flagship yet — run pot-index-devnet-init.ts first or pass an index mint')
  process.exit(1)
}
const INDEX_MINT = new PublicKey(mintStr)

async function step(connection: Connection, program: Program, keeper: Keypair): Promise<string> {
  const pot = await fetchPot(connection, INDEX_MINT)
  if (!pot) throw new Error(`pot not found for index mint ${INDEX_MINT.toBase58()}`)
  const bal = await fetchPotBalances(connection, pot)
  const feedIds = pot.legs.map((l) => l.feedId)
  const hermes = await fetchHermesPrices(feedIds)
  const price = pot.legs.map((l) => hermes[l.feedId]?.price ?? 0)
  if (price.some((p) => p <= 0)) throw new Error('missing Hermes price')

  // Value of each leg in USD and the current vs target weights.
  const legUsd = pot.legs.map((l, i) => (bal.legs[i] / 10 ** l.decimals) * price[i])
  const cashUsd = bal.cash / 1e6
  const nav = cashUsd + legUsd.reduce((s, v) => s + v, 0)
  if (nav <= 0) return 'empty pot — nothing to do'
  const curBps = legUsd.map((v) => Math.round((v / nav) * BPS))
  const tgtBps = pot.legs.map((l) => l.weightBps)

  const line = pot.legs.map((l, i) => `${l.mint.toBase58().slice(0, 4)} ${(curBps[i] / 100).toFixed(1)}%/${tgtBps[i] / 100}%`).join('  ')
  console.log(`${pot.symbol} NAV $${nav.toFixed(2)}  cash $${cashUsd.toFixed(2)}  ${line}`)

  // Underweight leg: biggest gap below target.
  let legIn = -1
  let gapIn = 0
  tgtBps.forEach((t, i) => {
    const gap = t - curBps[i]
    if (gap > gapIn) {
      gapIn = gap
      legIn = i
    }
  })
  if (legIn < 0 || gapIn <= DEADBAND_BPS) return 'within deadband — nothing to do'

  // Overweight leg: cash first (its target is always 0), else the biggest gap above target.
  let legOut = CASH_LEG
  let outUsdAvail = cashUsd
  if (bal.cash === 0) {
    let gapOut = 0
    tgtBps.forEach((t, i) => {
      const gap = curBps[i] - t
      if (gap > gapOut) {
        gapOut = gap
        legOut = i
      }
    })
    if (legOut === CASH_LEG || gapOut <= DEADBAND_BPS) return 'no overweight leg — nothing to do'
    outUsdAvail = (gapOut / BPS) * nav
  }

  // Trade size: fill the underweight gap, bounded by what the out leg can give and max_trade_bps.
  const wantUsd = (gapIn / BPS) * nav
  const maxUsd = (pot.maxTradeBps / BPS) * nav
  const tradeUsd = Math.min(wantUsd, outUsdAvail, maxUsd) * 0.98 // 2% margin so neither side overshoots
  if (tradeUsd < 0.5) return 'trade too small — nothing to do'

  const outDecimals = legOut === CASH_LEG ? 6 : pot.legs[legOut].decimals
  const outPrice = legOut === CASH_LEG ? 1 : price[legOut]
  const amountOut = Math.floor((tradeUsd / outPrice) * 10 ** outDecimals)
  const inLeg = pot.legs[legIn]
  const amountIn = Math.floor((tradeUsd / price[legIn]) * 10 ** inLeg.decimals)
  const outMint = legOut === CASH_LEG ? new PublicKey(registry.usdcMint) : pot.legs[legOut].mint

  console.log(
    `→ sell ${amountOut / 10 ** outDecimals} of ${legOut === CASH_LEG ? 'USDC' : outMint.toBase58().slice(0, 4)} ` +
      `for ${amountIn / 10 ** inLeg.decimals} of ${inLeg.mint.toBase58().slice(0, 4)} (~$${tradeUsd.toFixed(2)})`,
  )
  if (dry) return 'dry run'

  const keeperInAta = getAssociatedTokenAddressSync(inLeg.mint, keeper.publicKey)
  const inv = await connection.getTokenAccountBalance(keeperInAta).catch(() => null)
  if (!inv || BigInt(inv.value.amount) < BigInt(amountIn)) {
    throw new Error(`keeper inventory too low for ${inLeg.mint.toBase58()} — run the init script as admin to mint inventory`)
  }

  const wallet = new Wallet(keeper)
  const txs = await buildWithPythUpdates(connection, wallet, feedIds, async (priceUpdates) => {
    const { open, close } = await buildRebalancePair(program, {
      pot,
      keeper: keeper.publicKey,
      usdcMint: new PublicKey(registry.usdcMint),
      legOut,
      legIn,
      amountOut,
      priceUpdates,
    })
    // Mock market maker fills the in-leg from the keeper's inventory.
    const fill = createTransferCheckedInstruction(keeperInAta, inLeg.mint, inLeg.vault, keeper.publicKey, BigInt(amountIn), inLeg.decimals)
    return [open, fill, close]
  })

  let last = ''
  for (const { tx, signers } of txs) {
    if (signers.length) tx.sign(signers as never[])
    const signed = (await wallet.signTransaction(tx as VersionedTransaction)) as VersionedTransaction
    last = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
    await connection.confirmTransaction(last, 'confirmed')
    console.log('tx', last)
  }
  return `rebalanced: ${last}`
}

async function main() {
  const keeper = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))
  const connection = new Connection(RPC, 'confirmed')
  const provider = new AnchorProvider(connection, new Wallet(keeper), { commitment: 'confirmed' })
  const program = new Program(idl as Idl, provider)
  console.log('keeper', keeper.publicKey.toBase58(), 'pot index mint', INDEX_MINT.toBase58())

  for (;;) {
    try {
      console.log(await step(connection, program, keeper))
    } catch (e) {
      console.error('step failed:', e instanceof Error ? e.message : e)
    }
    if (!loopSecs) break
    await new Promise((r) => setTimeout(r, loopSecs * 1000))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
