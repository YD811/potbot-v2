/**
 * Drive the web app's server routes with a keypair wallet, exactly as the browser does:
 *
 *   npx tsx scripts/pot-index-route-flow.ts allocate  <mint> [--base <url>]
 *   npx tsx scripts/pot-index-route-flow.ts exit-usdc <mint> <shares> [--base <url>]
 *   npx tsx scripts/pot-index-route-flow.ts faucet [--base <url>]
 *
 * Wallet: $POT_INDEX_WALLET_KEYPAIR (default ~/.config/solana/id.json).
 * Base: $POT_INDEX_BASE_URL or --base (default http://localhost:3000).
 * Useful for a "judge run": a fresh wallet funded only by the faucet, every step through the
 * same routes the UI calls, nothing admin-signed locally.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js'

const RPC = process.env.POT_INDEX_RPC ?? 'https://api.devnet.solana.com'
const KEYPAIR = process.env.POT_INDEX_WALLET_KEYPAIR ?? path.join(os.homedir(), '.config/solana/id.json')
const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.POT_INDEX_BASE_URL ?? 'http://localhost:3000')
const pos = args.filter((a, i) => !a.startsWith('--') && (baseIdx < 0 || i !== baseIdx + 1))
const cmd = pos[0]

async function post(route: string, body: unknown) {
  const r = await fetch(`${BASE}/api/pot-index/${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const j = (await r.json()) as Record<string, unknown>
  if (!r.ok) throw new Error(`${route}: ${j.error ?? r.status}`)
  return j
}

async function main() {
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))
  const connection = new Connection(RPC, 'confirmed')
  const wallet = kp.publicKey.toBase58()
  console.log('wallet', wallet, 'base', BASE)

  if (cmd === 'faucet') {
    console.log(await post('faucet', { wallet }))
    return
  }

  const mint = pos[1]
  if (!mint) throw new Error('mint required')
  const body = cmd === 'allocate' ? { wallet, mint } : cmd === 'exit-usdc' ? { wallet, mint, shares: pos[2] } : null
  if (!body) throw new Error('unknown command')
  const res = await post(cmd, body)
  const txs = (res.txs as string[]).map((b) => VersionedTransaction.deserialize(Buffer.from(b, 'base64')))
  console.log(`${cmd}: ${txs.length} txs`, res.plan ?? '', res.payUsdc ? `pay ${Number(res.payUsdc) / 1e6} USDC` : '')
  for (const tx of txs) {
    tx.sign([kp])
    const sig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 5 })
    await connection.confirmTransaction(sig, 'confirmed')
    console.log('tx', `https://explorer.solana.com/tx/${sig}?cluster=devnet`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
