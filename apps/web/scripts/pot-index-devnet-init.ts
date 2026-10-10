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

const RPC = process.env.POT_INDEX_RPC ?? 'https://api.devnet.solana.com'
const KEYPAIR = process.env.POT_INDEX_ADMIN_KEYPAIR ?? path.join(os.homedir(), '.config/solana/id.json')
const OUT = path.join(__dirname, '../src/lib/pot-index/assets.devnet.json')

const FEEDS = {
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  // JUP (0x0a0408…) is not entitled on the free Pyth key tier — kept out of the flagship.
}

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
  const sol = await mk('SOL', 9)
  const eth = await mk('ETH', 8)
  const btc = await mk('BTC', 8)

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
  for (const [sym, mint] of [
    ['SOL', sol],
    ['ETH', eth],
    ['BTC', btc],
  ] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = await (program.account as any).assetConfig.fetchNullable(assetPda(mint))
    if (a) continue
    await program.methods
      .registerAsset(feedIdToBytes(FEEDS[sym]))
      .accounts({ admin: admin.publicKey, config: configPda(), mint, asset: assetPda(mint), systemProgram: SystemProgram.programId })
      .rpc()
    console.log('registered', sym)
  }

  // 4. Faucet stock for the admin: 1,000,000 tUSDC + market-maker inventory for the keeper.
  for (const [mint, amt] of [
    [usdc, 1_000_000n * 1_000_000n],
    [sol, 10_000n * 1_000_000_000n],
    [eth, 1_000n * 100_000_000n],
    [btc, 100n * 100_000_000n],
  ] as const) {
    const acc = await getOrCreateAssociatedTokenAccount(connection, admin, mint, admin.publicKey)
    if (acc.amount === 0n) await mintTo(connection, admin, mint, acc.address, admin, amt)
  }

  // 5. Flagship Pot.
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

  // Flagship v2 (SOL/BTC/ETH). Re-create if the stored one still has the old JUP leg.
  let flagship = existing?.flagship as string | undefined
  if (flagship && existing?.assets?.JUP) flagship = undefined
  if (!flagship) {
    const { indexMint, instructions } = await buildCreatePot(program, admin.publicKey, usdc, {
      name: 'Solana Blue Chips',
      symbol: 'SBC',
      legs: [
        { mint: sol, weightBps: 5000 },
        { mint: btc, weightBps: 3000 },
        { mint: eth, weightBps: 2000 },
      ],
      depositCapUsd: 0,
      slippageBps: 100,
      maxTradeBps: 2500,
    })
    const tx = new Transaction().add(...instructions)
    const sig = await sendAndConfirmTransaction(connection, tx, [admin, indexMint])
    flagship = indexMint.publicKey.toBase58()
    console.log('flagship pot index mint', flagship, sig)
  }

  const out = {
    cluster: 'devnet',
    programId: program.programId.toBase58(),
    usdcMint: usdc.toBase58(),
    treasury: admin.publicKey.toBase58(),
    flagship,
    assets: {
      SOL: { symbol: 'SOL', name: 'Solana (test)', mint: sol.toBase58(), decimals: 9, feedId: FEEDS.SOL },
      BTC: { symbol: 'BTC', name: 'Bitcoin (test)', mint: btc.toBase58(), decimals: 8, feedId: FEEDS.BTC },
      ETH: { symbol: 'ETH', name: 'Ethereum (test)', mint: eth.toBase58(), decimals: 8, feedId: FEEDS.ETH },
    },
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log('wrote', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
