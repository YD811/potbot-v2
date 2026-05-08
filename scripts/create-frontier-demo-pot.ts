#!/usr/bin/env tsx
//
// scripts/create-frontier-demo-pot.ts
//
// Create THE hackathon demo Pot on devnet.
//
// Idempotent: if a pot with the same authority+name already exists on-chain,
// the script reports its pubkey and exits without re-creating. Run it once,
// then copy the printed `NEXT_PUBLIC_ONE_POT_PUBKEY=` line into the Vercel
// dashboard env settings for the production project.
//
// Usage:
//   cd ~/potbot-v2
//   tsx scripts/create-frontier-demo-pot.ts
//
// Optional env:
//   RPC_URL          (default: https://api.devnet.solana.com — public, slow)
//   KEYPAIR_PATH     (default: ~/.config/solana/id.json)
//   POT_NAME         (default: "Frontier Demo Vault")
//   POT_EMOJI        (default: "🌱")
//   DEPOSIT_SOL      (default: "0.5" — initial seed deposit by authority)
//   GOV_LEVEL        (default: "2" — 0=autocracy, 1=advisory, 2=majority>50%)

/* eslint-disable no-console */

import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { IDL as SDK_IDL } from '../packages/sdk/src/idl/pot_vault'

// ── Constants ─────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey('GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK')
const TREASURY   = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')
const RPC_URL    = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const POT_NAME   = process.env.POT_NAME  ?? 'Frontier Demo Vault'
const POT_EMOJI  = process.env.POT_EMOJI ?? '🌱'
const DEPOSIT_LAMPORTS = Math.round(parseFloat(process.env.DEPOSIT_SOL ?? '0.5') * LAMPORTS_PER_SOL)
const GOV_LEVEL  = parseInt(process.env.GOV_LEVEL ?? '2', 10)
const POT_CREATION_FEE_LAMPORTS = 10_000_000 // 0.01 SOL — TREASURY fee
const EXPLORER_PREFIX = 'https://explorer.solana.com'
const OUTPUT_FILE = path.join(__dirname, '.demo-pot.json')

// ── Helpers ───────────────────────────────────────────────────────────────

function loadKeypair(): Keypair {
  const p = process.env.KEYPAIR_PATH ?? path.join(os.homedir(), '.config', 'solana', 'id.json')
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as number[]
  return Keypair.fromSecretKey(new Uint8Array(raw))
}

function loadIdl(): any {
  // Prefer freshly-built IDL if anchor build has run; fall back to the SDK copy.
  const target = path.join(__dirname, '..', 'packages', 'program', 'target', 'idl', 'pot_vault.json')
  if (fs.existsSync(target)) return JSON.parse(fs.readFileSync(target, 'utf8'))
  return SDK_IDL
}

function pdaPot(authority: PublicKey, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)],
    PROGRAM_ID,
  )[0]
}

function pdaVault(pot: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), pot.toBuffer()],
    PROGRAM_ID,
  )[0]
}

function pdaMember(pot: PublicKey, wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('member'), pot.toBuffer(), wallet.toBuffer()],
    PROGRAM_ID,
  )[0]
}

function explorerTx(sig: string) {
  return `${EXPLORER_PREFIX}/tx/${sig}?cluster=devnet`
}

function explorerAddr(addr: string) {
  return `${EXPLORER_PREFIX}/address/${addr}?cluster=devnet`
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed')
  const authority  = loadKeypair()
  const provider   = new AnchorProvider(connection, new Wallet(authority), { commitment: 'confirmed' })
  const program    = new Program(loadIdl(), provider)

  const pot       = pdaPot(authority.publicKey, POT_NAME)
  const vault     = pdaVault(pot)
  const memberPda = pdaMember(pot, authority.publicKey)

  console.log('─── Frontier Demo Vault ───────────────────────────────────────')
  console.log(`Authority: ${authority.publicKey.toBase58()}`)
  console.log(`Pot name:  "${POT_NAME}" ${POT_EMOJI}`)
  console.log(`Pot pda:   ${pot.toBase58()}`)
  console.log(`Vault pda: ${vault.toBase58()}`)
  console.log(`RPC:       ${RPC_URL}`)
  console.log('────────────────────────────────────────────────────────────────')

  // Pre-flight: balance check.
  const balance = await connection.getBalance(authority.publicKey)
  const needed  = POT_CREATION_FEE_LAMPORTS + DEPOSIT_LAMPORTS + 5_000_000 // + ~0.005 SOL slack
  if (balance < needed) {
    console.error(`✗ Insufficient SOL: have ${(balance / LAMPORTS_PER_SOL).toFixed(4)}, need ~${(needed / LAMPORTS_PER_SOL).toFixed(4)}.`)
    console.error('  Run: solana airdrop 2 --url devnet')
    process.exit(1)
  }

  // Idempotency: if pot already exists, skip create_pot and report.
  const existing = await connection.getAccountInfo(pot)
  let createdNew = false
  if (existing) {
    console.log(`✓ Pot already exists (created previously). Skipping create_pot.`)
  } else {
    console.log('› Creating pot on-chain (charges 0.01 SOL protocol fee to treasury)...')
    try {
      const sig = await (program.methods as any)
        .createPot({
          name: POT_NAME,
          emoji: POT_EMOJI,
          isPublic: true,
          minDeposit: new BN(0),
          lockupSeconds: new BN(0),
          yieldStrategy: 0,
          maxYieldAllocationBps: 0,
          maxTradeSizeBps: 5_000, // 50% per swap — generous for demo
          maxMembers: 100,
          tradeLevel: GOV_LEVEL,
          withdrawLevel: GOV_LEVEL,
          memberChangeLevel: GOV_LEVEL,
          settingsChangeLevel: GOV_LEVEL,
          yieldChangeLevel: GOV_LEVEL,
          voteTimeoutSeconds: new BN(600), // 10 min — comfortable video pacing
          quorumBps: 5_100, // 51%
          timelockSeconds: new BN(0),
          protocolFeeBps: 30, // 0.30% on swaps
        })
        .accounts({
          pot,
          vault,
          treasury: TREASURY,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      createdNew = true
      console.log(`✓ create_pot tx: ${explorerTx(sig)}`)
    } catch (e: any) {
      console.error(`✗ create_pot failed: ${e?.message ?? String(e)}`)
      console.error('  Hint: if the error mentions "AccountAlreadyInitialized" the pot already exists; rerun and the idempotency check will catch it.')
      process.exit(1)
    }
  }

  // Seed deposit: only on first creation, or if vault is empty.
  const vaultBalance = await connection.getBalance(vault)
  if (createdNew || vaultBalance === 0) {
    console.log(`› Seeding vault with ${(DEPOSIT_LAMPORTS / LAMPORTS_PER_SOL).toFixed(2)} SOL...`)
    try {
      const sig = await (program.methods as any)
        .deposit(new BN(DEPOSIT_LAMPORTS))
        .accounts({
          pot,
          vault,
          member: memberPda,
          depositor: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      console.log(`✓ deposit tx: ${explorerTx(sig)}`)
    } catch (e: any) {
      console.error(`⚠ deposit failed (pot is created, but unfunded): ${e?.message ?? String(e)}`)
      console.error('  You can deposit manually later from the UI.')
    }
  } else {
    console.log(`✓ Vault already funded with ${(vaultBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL — skipping seed deposit.`)
  }

  // Persist demo-pot metadata.
  const meta = {
    name: POT_NAME,
    emoji: POT_EMOJI,
    pot: pot.toBase58(),
    vault: vault.toBase58(),
    authority: authority.publicKey.toBase58(),
    programId: PROGRAM_ID.toBase58(),
    cluster: 'devnet',
    createdAt: new Date().toISOString(),
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(meta, null, 2) + '\n')

  console.log('\n─── Done ───────────────────────────────────────────────────────')
  console.log(`Saved metadata: ${OUTPUT_FILE}`)
  console.log(`Pot Explorer:   ${explorerAddr(pot.toBase58())}`)
  console.log(`Vault Explorer: ${explorerAddr(vault.toBase58())}`)
  console.log('')
  console.log('Vercel env to set on production project (potbot-v2):')
  console.log(`  NEXT_PUBLIC_ONE_POT_PUBKEY=${pot.toBase58()}`)
  console.log('')
}

main().catch(e => { console.error(e); process.exit(1) })
