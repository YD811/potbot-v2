#!/usr/bin/env node
/**
 * One-shot devnet seed: creates a single test PotAccount so E2E demos
 * (list_vaults, get_vault_analytics, get_proposals) have real data.
 * Re-running with the same NAME is a no-op (tx will fail because the PDA
 * already exists).
 *
 * Usage:  POT_NAME="MCP Demo Pot" node scripts/seed-test-pot.mjs
 */
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
} from '@solana/web3.js'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'

const PROGRAM_ID = new PublicKey('GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK')
const conn = new Connection('https://api.devnet.solana.com', 'confirmed')

const userKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.HOME + '/.config/solana/id.json'))))

const POT_NAME = process.env.POT_NAME ?? 'MCP Demo Pot'
const POT_EMOJI = process.env.POT_EMOJI ?? '🤖'

console.log('Creator:', userKp.publicKey.toBase58())
console.log('Pot name:', POT_NAME)

function disc(name) { return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8) }
function encStr(s) { const b = Buffer.from(s, 'utf-8'); const l = Buffer.alloc(4); l.writeUInt32LE(b.length, 0); return Buffer.concat([l, b]) }
function u8(n) { return Buffer.from([n]) }
function u16le(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b }
function u64le(n) { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n), 0); return b }
function i64le(n) { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n), 0); return b }

const [potPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('pot'), userKp.publicKey.toBuffer(), Buffer.from(POT_NAME, 'utf-8')],
  PROGRAM_ID,
)
const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('vault'), potPda.toBuffer()],
  PROGRAM_ID,
)
console.log('Pot PDA:', potPda.toBase58())
console.log('Vault PDA:', vaultPda.toBase58())

// CreatePotParams Borsh layout (from create_pot.rs):
const params = Buffer.concat([
  encStr(POT_NAME),       // name
  encStr(POT_EMOJI),      // emoji
  u8(1),                  // is_public = true
  u64le(10_000_000),      // min_deposit = 0.01 SOL
  i64le(0),               // lockup_seconds
  u8(0),                  // yield_strategy = None
  u16le(5000),            // max_yield_allocation_bps = 50%
  u16le(2000),            // max_trade_size_bps = 20%
  u16le(50),              // max_members
  u8(2), u8(2), u8(2), u8(3), u8(2), // levels: trade/withdraw/member/settings/yield (Majority/Supermajority)
  i64le(86400),           // vote_timeout_seconds = 1 day
  u16le(2000),            // quorum_bps = 20%
  i64le(0),               // timelock_seconds = 0
  u16le(50),              // protocol_fee_bps = 0.5%
])

const data = Buffer.concat([disc('create_pot'), params])

const ix = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: potPda, isSigner: false, isWritable: true },
    { pubkey: vaultPda, isSigner: false, isWritable: false },
    { pubkey: userKp.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data,
})

const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed')
const tx = new Transaction()
tx.feePayer = userKp.publicKey
tx.recentBlockhash = blockhash
tx.add(ix)
tx.sign(userKp)

console.log('Sending...')
const sig = await conn.sendRawTransaction(tx.serialize())
await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
console.log('Tx:', sig)
console.log('Explorer:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`)
console.log('Pot:', `https://explorer.solana.com/address/${potPda.toBase58()}?cluster=devnet`)
