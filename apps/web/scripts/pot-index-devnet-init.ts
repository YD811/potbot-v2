/**
 * One-shot devnet bootstrap for pot_index.
 *
 *   npx tsx scripts/pot-index-devnet-init.ts
 *
 * Needs: deployed program (anchor deploy), a funded keypair at $POT_INDEX_ADMIN_KEYPAIR
 * (default ~/.config/solana/id.json). Creates test mints (tUSDC, tSOL, tETH, tBTC), initializes
 * the config, registers assets with real Pyth feed ids, creates the flagship Pot, and writes
 * src/lib/pot-index/assets.devnet.json for the web app.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AnchorProvider, Program, Wallet, type Idl } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import idl from '../src/lib/pot-index/idl.json'
import { assetPda, buildCreatePot, configPda, feedIdToBytes, potPda } from '../src/lib/pot-index/client'
import { grindKeypair, INDEX_MINT_PREFIX } from '../src/lib/pot-index/vanity'

const RPC = process.env.POT_INDEX_RPC ?? 'https://api.devnet.solana.com'
const KEYPAIR = process.env.POT_INDEX_ADMIN_KEYPAIR ?? path.join(os.homedir(), '.config/solana/id.json')
const OUT = path.join(__dirname, '../src/lib/pot-index/assets.devnet.json')
// Pre-ground vanity mints (solana-keygen grind --starts-with Pot:N) in $POT_INDEX_VANITY_DIR; consumed one per Pot.
const VANITY_DIR = process.env.POT_INDEX_VANITY_DIR
function takeVanityKeypair(): Keypair | null {
  if (!VANITY_DIR || !fs.existsSync(VANITY_DIR)) return null
  const f = fs.readdirSync(VANITY_DIR).find((n) => n.startsWith('Pot') && n.endsWith('.json'))
  if (!f) return null
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.join(VANITY_DIR, f), 'utf8'))))
  fs.renameSync(path.join(VANITY_DIR, f), path.join(VANITY_DIR, f + '.used'))
  return kp
}

// Devnet asset table: test mints with REAL Pyth feed ids. Only feeds entitled on the free Pyth tier
// (checked Oct 10: majors, SOL/JitoSOL/PYTH, DOGE, TSLA, QQQ). Others (JUP, BONK, WIF, NVDA…) need the paid tier.
type Cat = 'crypto' | 'solana' | 'stock' | 'meme'
const ASSETS: Array<{ sym: string; name: string; decimals: number; feed: string; cat: Cat; logo?: string }> = [
  { sym: 'SOL', name: 'Solana', decimals: 9, feed: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', cat: 'solana' },
  { sym: 'BTC', name: 'Bitcoin', decimals: 8, feed: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', cat: 'crypto' },
  { sym: 'ETH', name: 'Ethereum', decimals: 8, feed: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', cat: 'crypto' },
  { sym: 'BNB', name: 'BNB', decimals: 8, feed: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f', cat: 'crypto' },
  { sym: 'XRP', name: 'XRP', decimals: 6, feed: '0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8', cat: 'crypto' },
  { sym: 'JITOSOL', name: 'Jito Staked SOL', decimals: 9, feed: '0x67be9f519b95cf24338801051f9a808eff0a578ccb388db73b7f6fe1de019ffb', cat: 'solana' },
  { sym: 'PYTH', name: 'Pyth Network', decimals: 6, feed: '0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff', cat: 'solana' },
  { sym: 'DOGE', name: 'Dogecoin', decimals: 8, feed: '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c', cat: 'meme' },
  { sym: 'TSLAX', name: 'Tesla (xStock)', decimals: 8, feed: '0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1', cat: 'stock' },
  { sym: 'QQQX', name: 'Nasdaq-100 (xStock)', decimals: 8, feed: '0x9695e2b96ea7b3859da9ed25b7a46a920a776e2fdae19a7bcfdf2b219230452d', cat: 'stock' },
]

// Showcase Pots (created by the admin, idempotent by symbol).
const POTS: Array<{ name: string; symbol: string; legs: Array<[string, number]>; maxTradeBps?: number }> = [
  { name: 'Solana Blue Chips', symbol: 'SBC', legs: [['SOL', 5000], ['BTC', 3000], ['ETH', 2000]], maxTradeBps: 2500 },
  { name: 'Solana Native', symbol: 'SOLN', legs: [['SOL', 5000], ['JITOSOL', 3000], ['PYTH', 2000]], maxTradeBps: 2500 },
  { name: 'Majors 5', symbol: 'MJR5', legs: [['BTC', 3500], ['ETH', 2500], ['SOL', 2000], ['BNB', 1000], ['XRP', 1000]], maxTradeBps: 2500 },
  { name: 'Wall St on Solana', symbol: 'WSTS', legs: [['TSLAX', 4000], ['QQQX', 4000], ['SOL', 2000]], maxTradeBps: 2500 },
  { name: 'Doge & Sol', symbol: 'DGSL', legs: [['DOGE', 6000], ['SOL', 4000]], maxTradeBps: 2500 },
]

async function main() {
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))
  const connection = new Connection(RPC, 'confirmed')
  const wallet = new Wallet(admin)
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const program = new Program(idl as Idl, provider)
  console.log('admin', admin.publicKey.toBase58(), 'program', program.programId.toBase58())

  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null

  // 1. Mints (reuse if the file already has them).
  const mk = async (sym: string, decimals: number) => {
    if (existing?.assets?.[sym]?.mint) return new PublicKey(existing.assets[sym].mint)
    if (sym === 'USDC' && existing?.usdcMint && existing.usdcMint !== SystemProgram.programId.toBase58()) {
      return new PublicKey(existing.usdcMint)
    }
    const m = await createMint(connection, admin, admin.publicKey, null, decimals)
    console.log('mint', sym, m.toBase58())
    return m
  }
  const usdc = await mk('USDC', 6)
  const mints: Record<string, PublicKey> = {}
  for (const a of ASSETS) mints[a.sym] = await mk(a.sym, a.decimals)

  // 2. Config.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = await (program.account as any).config.fetchNullable(configPda())
  if (!cfg) {
    await program.methods
      .initConfig(admin.publicKey, new (await import('@coral-xyz/anchor')).BN(300))
      .accounts({ admin: admin.publicKey, config: configPda(), usdcMint: usdc, systemProgram: SystemProgram.programId })
      .rpc()
    console.log('config initialized')
  } else {
    console.log('config exists')
  }

  // 3. Assets.
  for (const a of ASSETS) {
    const mint = mints[a.sym]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acc = await (program.account as any).assetConfig.fetchNullable(assetPda(mint))
    if (acc) continue
    await program.methods
      .registerAsset(feedIdToBytes(a.feed))
      .accounts({ admin: admin.publicKey, config: configPda(), mint, asset: assetPda(mint), systemProgram: SystemProgram.programId })
      .rpc()
    console.log('registered', a.sym)
  }

  // 4. Faucet stock for the admin (1,000,000 tUSDC) + market-maker inventory per asset (~$2M notional each).
  const inventory: Array<[PublicKey, bigint]> = [[usdc, 1_000_000n * 1_000_000n]]
  for (const a of ASSETS) {
    const units = a.sym === 'BTC' ? 25n : a.sym === 'ETH' ? 1_000n : a.sym === 'TSLAX' || a.sym === 'QQQX' ? 5_000n : a.sym === 'BNB' ? 3_000n : a.sym === 'XRP' || a.sym === 'DOGE' ? 10_000_000n : 20_000n
    inventory.push([mints[a.sym], units * 10n ** BigInt(a.decimals)])
  }
  for (const [mint, amt] of inventory) {
    const acc = await getOrCreateAssociatedTokenAccount(connection, admin, mint, admin.publicKey)
    if (acc.amount === 0n) await mintTo(connection, admin, mint, acc.address, admin, amt)
  }

  // Retire the v1 flagship (JUP leg, not priceable on the free Pyth tier): disable the asset, pause the Pot.
  if (existing?.assets?.JUP?.mint) {
    const jupMint = new PublicKey(existing.assets.JUP.mint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = await (program.account as any).assetConfig.fetchNullable(assetPda(jupMint))
    if (a?.enabled) {
      await program.methods.setAssetEnabled(false).accounts({ admin: admin.publicKey, config: configPda(), asset: assetPda(jupMint) }).rpc()
      console.log('disabled asset JUP')
    }
    if (existing.flagship) {
      const oldMint = new PublicKey(existing.flagship)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldPot = await (program.account as any).pot.fetchNullable(potPda(oldMint))
      if (oldPot && !oldPot.paused) {
        await program.methods.setPotParams({ paused: true, depositCapUsd: null }).accounts({ creator: admin.publicKey, pot: potPda(oldMint) }).rpc()
        console.log('paused old flagship', existing.flagship)
      }
    }
  }

  // 5. Showcase Pots (idempotent by symbol; the first one is the flagship).
  const pots: Record<string, string> = { ...(existing?.pots ?? {}) }
  if (existing?.flagship && !existing?.assets?.JUP && !pots.SBC) pots.SBC = existing.flagship
  // Recreate any showcase Pot whose mint does not carry the POT… vanity prefix (retire the old one).
  for (const [sym, m] of Object.entries(pots)) {
    if (m.startsWith(INDEX_MINT_PREFIX)) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const old = await (program.account as any).pot.fetchNullable(potPda(new PublicKey(m)))
    if (old && !old.paused) {
      await program.methods.setPotParams({ paused: true, depositCapUsd: null }).accounts({ creator: admin.publicKey, pot: potPda(new PublicKey(m)) }).rpc()
      console.log('paused non-vanity pot', sym, m)
    }
    delete pots[sym]
  }
  for (const p of POTS) {
    if (pots[p.symbol]) continue
    const vanity = takeVanityKeypair() ?? (await grindKeypair(INDEX_MINT_PREFIX))
    const { indexMint, instructions } = await buildCreatePot(program, admin.publicKey, usdc, {
      name: p.name,
      symbol: p.symbol,
      legs: p.legs.map(([sym, weightBps]) => ({ mint: mints[sym], weightBps })),
      depositCapUsd: 0,
      slippageBps: 100,
      maxTradeBps: p.maxTradeBps ?? 2500,
    }, { indexMint: vanity })
    // ≤3 legs fits one tx; otherwise split (create+2 legs, rest+finalize).
    if (p.legs.length <= 3) {
      await sendAndConfirmTransaction(connection, new Transaction().add(...instructions), [admin, indexMint])
    } else {
      const [create, ...rest] = instructions
      const finalize = rest.pop()!
      await sendAndConfirmTransaction(connection, new Transaction().add(create, ...rest.slice(0, 2)), [admin, indexMint])
      await sendAndConfirmTransaction(connection, new Transaction().add(...rest.slice(2), finalize), [admin])
    }
    pots[p.symbol] = indexMint.publicKey.toBase58()
    console.log('pot', p.symbol, pots[p.symbol])
  }
  const flagship = pots.SBC

  const out = {
    cluster: 'devnet',
    programId: program.programId.toBase58(),
    usdcMint: usdc.toBase58(),
    treasury: admin.publicKey.toBase58(),
    flagship,
    pots,
    assets: Object.fromEntries(
      ASSETS.map((a) => [a.sym, { symbol: a.sym, name: `${a.name} (test)`, mint: mints[a.sym].toBase58(), decimals: a.decimals, feedId: a.feed, category: a.cat }]),
    ),
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log('wrote', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
