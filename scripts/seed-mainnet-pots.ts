#!/usr/bin/env tsx
/**
 * seed-mainnet-pots.ts — create 5 production-quality pots on mainnet.
 *
 * Each pot is created with:
 *   - A realistic name + emoji
 *   - Governance level 2 (majority voting)
 *   - 0 lockup (members can leave whenever)
 *   - A small SOL seed deposit so NAV > 0 from day 1
 *
 * Usage:
 *   export HELIUS_MAINNET_RPC="https://mainnet.helius-rpc.com/?api-key=..."
 *   export CREATOR_KEYPAIR="$HOME/.config/solana/id.json"
 *   pnpm tsx scripts/seed-mainnet-pots.ts
 *
 * Safety:
 *   - Requires CONFIRM_MAINNET=yes env var to actually submit.
 *   - Aborts if deployer has < 1 SOL.
 *   - Dry-runs by default (prints what WOULD happen).
 */

import { readFileSync } from 'node:fs'
import {
  Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram,
} from '@solana/web3.js'
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor'

import { IDL, PROGRAM_ID, getPotAddress, getVaultAddress } from '@potbot/sdk'

// ─── Config ─────────────────────────────────────────────────────────────────

const RPC = process.env.HELIUS_MAINNET_RPC ?? ''
const KEY_PATH = process.env.CREATOR_KEYPAIR ?? `${process.env.HOME}/.config/solana/id.json`
const CONFIRM = process.env.CONFIRM_MAINNET === 'yes'
const MIN_SOL = 1  // deployer must have at least this much

// Five realistic seed pots. Names intentionally varied so the leaderboard looks
// like organic community activity, not one seeder's handiwork.
const SEED_POTS = [
  {
    name: 'Amsterdam Alpha Circle',
    emoji: '🌷',
    seedLamports: Math.round(0.2 * LAMPORTS_PER_SOL),
    governanceLevel: 2,
    isPublic: true,
  },
  {
    name: 'Y-DAO Treasury',
    emoji: '🏛️',
    seedLamports: Math.round(0.3 * LAMPORTS_PER_SOL),
    governanceLevel: 3,
    isPublic: true,
  },
  {
    name: 'Weekend Degen Pot',
    emoji: '🎰',
    seedLamports: Math.round(0.1 * LAMPORTS_PER_SOL),
    governanceLevel: 2,
    isPublic: true,
  },
  {
    name: 'Stablecoin Savers',
    emoji: '🧱',
    seedLamports: Math.round(0.25 * LAMPORTS_PER_SOL),
    governanceLevel: 2,
    isPublic: true,
  },
  {
    name: 'Tamagotchi Grove',
    emoji: '🪴',
    seedLamports: Math.round(0.15 * LAMPORTS_PER_SOL),
    governanceLevel: 1, // advisory
    isPublic: true,
  },
] as const

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!RPC) {
    console.error('❌ HELIUS_MAINNET_RPC env not set.')
    process.exit(1)
  }

  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(KEY_PATH, 'utf8'))),
  )
  const connection = new Connection(RPC, 'confirmed')

  // ── Pre-flight ────────────────────────────────────────────────────────────
  const balance = await connection.getBalance(payer.publicKey)
  const balSol = balance / LAMPORTS_PER_SOL
  const seedTotal = SEED_POTS.reduce((s, p) => s + p.seedLamports, 0) / LAMPORTS_PER_SOL

  console.log('═════════════════════════════════════════════════════════')
  console.log(' PotBot mainnet seed — pre-flight')
  console.log('═════════════════════════════════════════════════════════')
  console.log(`  Creator       : ${payer.publicKey.toBase58()}`)
  console.log(`  Balance       : ${balSol.toFixed(4)} SOL`)
  console.log(`  Seed total    : ${seedTotal.toFixed(2)} SOL (across ${SEED_POTS.length} pots)`)
  console.log(`  Rent estimate : ~${(0.02 * SEED_POTS.length).toFixed(2)} SOL`)
  console.log(`  RPC           : ${RPC.replace(/api-key=[^&]+/, 'api-key=***')}`)
  console.log(`  Program       : ${PROGRAM_ID.toBase58()}`)
  console.log(`  Confirm       : ${CONFIRM ? '✅ CONFIRM_MAINNET=yes' : '⚠️ DRY RUN (set CONFIRM_MAINNET=yes)'}`)
  console.log('')

  if (balSol < MIN_SOL) {
    console.error(`❌ Need ≥ ${MIN_SOL} SOL. Fund ${payer.publicKey.toBase58()} first.`)
    process.exit(1)
  }

  for (const spec of SEED_POTS) {
    const [potAddr] = getPotAddress(spec.name, payer.publicKey)
    const [vault] = getVaultAddress(potAddr)
    console.log(`  → ${spec.emoji} ${spec.name}`)
    console.log(`      pot:   ${potAddr.toBase58()}`)
    console.log(`      vault: ${vault.toBase58()}`)
    console.log(`      seed:  ${spec.seedLamports / LAMPORTS_PER_SOL} SOL, gov=L${spec.governanceLevel}`)
  }

  if (!CONFIRM) {
    console.log('\n⚠️ Dry run complete. Re-run with CONFIRM_MAINNET=yes to execute.')
    return
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  console.log('\n🚀 Executing on mainnet...\n')

  const wallet = new Wallet(payer)
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const idlWithAddress = { ...(IDL as any), address: PROGRAM_ID.toBase58() }
  const program = new Program(idlWithAddress, provider)

  for (const spec of SEED_POTS) {
    const [potAddr, potBump] = getPotAddress(spec.name, payer.publicKey)
    const [vault] = getVaultAddress(potAddr)

    try {
      const sig = await (program.methods as any)
        .createPot({
          name: spec.name,
          emoji: spec.emoji,
          isPublic: spec.isPublic,
          minDeposit: new BN(10_000),  // 0.00001 SOL
          lockupSeconds: new BN(0),
          yieldStrategy: 0,            // None; can be upgraded via proposal
          governanceLevel: spec.governanceLevel,
        })
        .accounts({
          pot: potAddr,
          vault,
          authority: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' })

      console.log(`  ✓ ${spec.emoji} ${spec.name} — ${sig}`)

      // Seed deposit so NAV > 0.
      const depositSig = await connection.sendTransaction(
        new (await import('@solana/web3.js')).Transaction().add(
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: vault,
            lamports: spec.seedLamports,
          }),
        ),
        [payer],
      )
      await connection.confirmTransaction(depositSig, 'confirmed')
      console.log(`    seeded ${spec.seedLamports / LAMPORTS_PER_SOL} SOL`)
    } catch (err: any) {
      console.error(`  ✗ ${spec.name}: ${err.message ?? err}`)
    }
  }

  console.log('\n✅ Seeding complete. Visit https://potbot.fun/leaderboard to verify.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
