#!/usr/bin/env tsx
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { IDL as SDK_IDL } from '../packages/sdk/src/idl/pot_vault'

const DEVNET_RPC = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const SOL_MINT  = new PublicKey('So11111111111111111111111111111111111111112')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const EXPLORER  = 'https://explorer.solana.com/tx'

function loadKeypair(): Keypair {
  const p = process.env.KEYPAIR_PATH ?? path.join(os.homedir(), '.config', 'solana', 'id.json')
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as number[]
  return Keypair.fromSecretKey(new Uint8Array(raw))
}

function loadIdl(): any {
  const target = path.join(process.cwd(), 'packages', 'program', 'target', 'idl', 'pot_vault.json')
  if (fs.existsSync(target)) return JSON.parse(fs.readFileSync(target, 'utf8'))
  return SDK_IDL
}

async function main() {
  const potPubkey = new PublicKey(process.argv[2] ?? (() => { throw new Error('pot pubkey required') })())

  const connection = new Connection(DEVNET_RPC, 'confirmed')
  const payer = loadKeypair()
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: 'confirmed' })
  const program = new Program(loadIdl(), provider)

  console.log(`Pot:       ${potPubkey.toBase58()}`)
  console.log(`Authority: ${payer.publicKey.toBase58()}`)

  const sigAllowedMints = await (program.methods as any)
    .setAllowedMints({
      mints: [SOL_MINT, USDC_MINT],
      agentAuthority: payer.publicKey,
    })
    .accounts({ pot: potPubkey, authority: payer.publicKey })
    .rpc()
  console.log(`set_allowed_mints: ${EXPLORER}/${sigAllowedMints}?cluster=devnet`)

  const sigPolicy = await (program.methods as any)
    .setSpendingPolicy({
      singleSwapCapBps: 2000,
      dailyBudgetLamports: new BN(1 * 1_000_000_000),
    })
    .accounts({ pot: potPubkey, authority: payer.publicKey })
    .rpc()
  console.log(`set_spending_policy: ${EXPLORER}/${sigPolicy}?cluster=devnet`)

  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
