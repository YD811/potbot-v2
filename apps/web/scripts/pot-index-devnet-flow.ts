/**
 * CLI smoke test of the live devnet flow with a keypair wallet:
 *
 *   npm run pot-index:flow -- deposit 100 [indexMint] [--ref <pubkey>]
 *   npm run pot-index:flow -- exit all|<shares> [indexMint]
 *   npm run pot-index:flow -- mint-usdc <wallet> [amount]      (admin only: mint test USDC)
 *   npm run pot-index:flow -- status [indexMint]
 *
 * Wallet: $POT_INDEX_WALLET_KEYPAIR (default ~/.config/solana/id.json).
 * Hermes: $NEXT_PUBLIC_PYTH_HERMES_URL (point it at <preview>/api/pot-index/hermes when the
 * public Hermes host is unreachable from where you run this).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AnchorProvider, Program, Wallet, type Idl } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, type VersionedTransaction } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import idl from '../src/lib/pot-index/idl.json'
import registry from '../src/lib/pot-index/assets.devnet.json'
import { buildDeposit, buildExit, fetchPot, fetchPotBalances, navUsd } from '../src/lib/pot-index/client'
import { buildWithPythUpdates, fetchHermesPrices } from '../src/lib/pot-index/pyth-post'

const RPC = process.env.POT_INDEX_RPC ?? 'https://api.devnet.solana.com'
const KEYPAIR = process.env.POT_INDEX_WALLET_KEYPAIR ?? path.join(os.homedir(), '.config/solana/id.json')
const USDC = new PublicKey(registry.usdcMint)
const TREASURY = new PublicKey(registry.treasury)

const args = process.argv.slice(2)
const cmd = args[0]
const refIdx = args.indexOf('--ref')
const referrer = refIdx >= 0 ? new PublicKey(args[refIdx + 1]) : null
const positional = args.filter((a, i) => i > 0 && !a.startsWith('--') && (refIdx < 0 || i !== refIdx + 1))

function explorer(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`
}

async function main() {
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))
  const connection = new Connection(RPC, 'confirmed')
  const wallet = new Wallet(kp)
  const program = new Program(idl as Idl, new AnchorProvider(connection, wallet, { commitment: 'confirmed' }))

  if (cmd === 'mint-usdc') {
    const to = new PublicKey(positional[0])
    const amount = BigInt(Math.round(Number(positional[1] ?? '1000') * 1e6))
    const acc = await getOrCreateAssociatedTokenAccount(connection, kp, USDC, to)
    const sig = await mintTo(connection, kp, USDC, acc.address, kp, amount)
    console.log(`minted ${Number(amount) / 1e6} tUSDC to ${to.toBase58()}`, explorer(sig))
    return
  }

  const mintArg = cmd === 'status' ? positional[0] : positional[1]
  const indexMint = new PublicKey(mintArg ?? registry.flagship!)
  const pot = await fetchPot(connection, indexMint)
  if (!pot) throw new Error('pot not found')
  const feedIds = pot.legs.map((l) => l.feedId)

  const status = async () => {
    const bal = await fetchPotBalances(connection, pot)
    const hermes = await fetchHermesPrices(feedIds)
    const prices: Record<string, number> = {}
    pot.legs.forEach((l) => (prices[l.mint.toBase58()] = hermes[l.feedId]?.price ?? 0))
    const nav = navUsd(pot, bal, prices)
    const supply = bal.supply / 1e6
    const myAta = getAssociatedTokenAddressSync(indexMint, kp.publicKey)
    const mine = await connection.getTokenAccountBalance(myAta).then((r) => Number(r.value.uiAmount ?? 0)).catch(() => 0)
    console.log(`${pot.name} ($${pot.symbol})  NAV $${nav.toFixed(2)}  supply ${supply.toFixed(4)}  price $${supply > 0 ? (nav / supply).toFixed(4) : '—'}  cash ${(bal.cash / 1e6).toFixed(2)} USDC`)
    pot.legs.forEach((l, i) => console.log(`  leg ${i}: ${(bal.legs[i] / 10 ** l.decimals).toFixed(6)} @ $${prices[l.mint.toBase58()].toFixed(2)}`))
    console.log(`  my ${pot.symbol}: ${mine}`)
  }

  if (cmd === 'status') return status()

  if (cmd === 'deposit') {
    const amountUsdc = Number(positional[0] ?? '100')
    const txs = await buildWithPythUpdates(connection, wallet, feedIds, (priceUpdates) =>
      buildDeposit(program, { pot, user: kp.publicKey, usdcMint: USDC, treasury: TREASURY, amountUsdc, referrer, priceUpdates }),
    )
    for (const { tx, signers } of txs) {
      if (signers.length) tx.sign(signers as never[])
      const signed = (await wallet.signTransaction(tx as VersionedTransaction)) as VersionedTransaction
      const sig = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(sig, 'confirmed')
      console.log('tx', explorer(sig))
    }
    console.log(`deposited ${amountUsdc} USDC${referrer ? ` via referrer ${referrer.toBase58()}` : ''}`)
    return status()
  }

  if (cmd === 'exit') {
    const myAta = getAssociatedTokenAddressSync(indexMint, kp.publicKey)
    const have = BigInt((await connection.getTokenAccountBalance(myAta)).value.amount)
    const shares = positional[0] === 'all' || !positional[0] ? have : BigInt(Math.round(Number(positional[0]) * 1e6))
    const ixs = await buildExit(program, { pot, user: kp.publicKey, usdcMint: USDC, shares: Number(shares) })
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), [kp])
    console.log(`burned ${Number(shares) / 1e6} ${pot.symbol}`, explorer(sig))
    return status()
  }

  console.error('usage: deposit <usdc> [mint] [--ref <pubkey>] | exit all|<shares> [mint] | mint-usdc <wallet> [amount] | status [mint]')
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
