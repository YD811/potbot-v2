#!/usr/bin/env tsx
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { IDL } from '../packages/sdk/src/idl/pot_vault'

const DEVNET_RPC = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK')

function readKeypair(file: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as number[]
  return Keypair.fromSecretKey(new Uint8Array(raw))
}

function defaultSigner(): Keypair {
  const keyPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  if (!fs.existsSync(keyPath)) return Keypair.generate()
  return readKeypair(keyPath)
}

async function main() {
  const admin = defaultSigner()
  const nonAdmin = process.env.NON_ADMIN_KEYPAIR ? readKeypair(process.env.NON_ADMIN_KEYPAIR) : Keypair.generate()
  const potName = process.env.NEGATIVE_POT_NAME ?? 'existing-pot-name'

  const connection = new Connection(DEVNET_RPC, 'confirmed')
  const provider = new AnchorProvider(connection, new Wallet(nonAdmin), { commitment: 'confirmed' })
  let program: Program
  try {
    program = new Program(IDL as any, provider)
  } catch (e: any) {
    console.log(`FAIL: unable to bootstrap program from current IDL (${e?.message ?? String(e)})`)
    process.exit(1)
    return
  }

  const methods = (program.methods as any)
  if (typeof methods.markProposalPassed !== 'function') {
    console.log('FAIL: mark_proposal_passed is not available in current deployed/local IDL; cannot run StrategyNotAdmin negative test on this branch.')
    process.exit(1)
  }

  const pot = PublicKey.findProgramAddressSync([Buffer.from('pot'), admin.publicKey.toBuffer(), Buffer.from(potName)], PROGRAM_ID)[0]

  try {
    const tx = await methods
      .markProposalPassed()
      .accounts({
        pot,
        authority: nonAdmin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers(nonAdmin.publicKey.equals(provider.wallet.publicKey) ? [] : [nonAdmin])
      .rpc()

    console.log(`FAIL: tx unexpectedly succeeded ${tx}`)
    process.exit(1)
  } catch (err: any) {
    const msg = String(err?.message ?? err)
    const logs = String(err?.logs ?? '')
    const matched = /StrategyNotAdmin|Unauthorized|UnauthorizedAccess|custom program error/i.test(`${msg}\n${logs}`)
    if (matched) {
      console.log(`PASS: non-admin mark_proposal_passed failed as expected (${msg.split('\n')[0]})`)
      process.exit(0)
    }

    console.log(`FAIL: received an error, but not StrategyNotAdmin-equivalent.\n${msg}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Fatal negative test error:', e)
  process.exit(1)
})
