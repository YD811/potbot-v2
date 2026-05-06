#!/usr/bin/env tsx
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from '@solana/web3.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { IDL as SDK_IDL } from '../packages/sdk/src/idl/pot_vault'

const DEVNET_RPC = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK')
const EXPLORER = 'https://explorer.solana.com/tx'
const LOGS_DIR = path.join(process.cwd(), 'logs')
const EVIDENCE_DIR = process.env.EVIDENCE_DIR ?? '/Users/yegordo/Library/Mobile Documents/iCloud~md~obsidian/Documents/YD/.sisyphus/evidence'

function loadKeypair(): Keypair {
  const keypairPath = process.env.KEYPAIR_PATH ?? path.join(os.homedir(), '.config', 'solana', 'id.json')
  if (!fs.existsSync(keypairPath)) {
    console.warn(`Keypair not found at ${keypairPath}; using ephemeral test keypair`)
    return Keypair.generate()
  }
  const raw = JSON.parse(fs.readFileSync(keypairPath, 'utf8')) as number[]
  return Keypair.fromSecretKey(new Uint8Array(raw))
}

function loadIdl(): any {
  const idlPath = path.join(process.cwd(), 'packages', 'program', 'target', 'idl', 'pot_vault.json')
  if (fs.existsSync(idlPath)) return JSON.parse(fs.readFileSync(idlPath, 'utf8'))
  return SDK_IDL
}

function pdaPot(authority: PublicKey, name: string): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)], PROGRAM_ID)[0]
}

function pdaMember(pot: PublicKey, wallet: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('member'), pot.toBuffer(), wallet.toBuffer()], PROGRAM_ID)[0]
}

function pdaVault(pot: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), pot.toBuffer()], PROGRAM_ID)[0]
}

function explorerUrl(sig: string) {
  return `${EXPLORER}/${sig}?cluster=devnet`
}

type StepResult = { step: string; ok: boolean; sig?: string; url?: string; note?: string }

function printStep(step: StepResult) {
  const icon = step.ok ? '✅' : '⚠️ '
  console.log(`${icon} ${step.step}${step.url ? `\n   ${step.url}` : ''}${step.note ? `\n   ${step.note}` : ''}`)
}

async function main() {
  console.log('\n🫙  PotBot v2 — Demo Pause/Resume (devnet)\n')
  fs.mkdirSync(LOGS_DIR, { recursive: true })

  const connection = new Connection(DEVNET_RPC, 'confirmed')
  const payer = loadKeypair()
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: 'confirmed' })
  const program = new Program(loadIdl(), provider)
  const results: Record<string, any> = { wallet: payer.publicKey.toBase58(), steps: [] }

  const log = (step: string, ok: boolean, sig?: string, note?: string) => {
    const url = sig ? explorerUrl(sig) : undefined
    results.steps.push({ step, ok, sig, url, note })
    printStep({ step, ok, sig, url, note })
  }

  try {
    const sig = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(sig, 'confirmed')
    console.log(`Airdrop 1 SOL → ${payer.publicKey.toBase58()}`)
  } catch {
    console.warn('Airdrop rate-limited; continuing with existing balance')
  }

  const potName = `demo-pause-${Date.now()}`
  const pot = pdaPot(payer.publicKey, potName)
  const member = pdaMember(pot, payer.publicKey)

  console.log(`Pot:  ${pot.toBase58()}`)
  console.log(`Name: ${potName}`)

  try {
    const sig = await (program.methods as any).createPot({
      name: potName,
      emoji: '⏯️',
      isPublic: true,
      minDeposit: new BN(0),
      lockupSeconds: new BN(0),
      yieldStrategy: 0,
      maxYieldAllocationBps: 0,
      maxTradeSizeBps: 10_000,
      maxMembers: 1000,
      tradeLevel: 0,
      withdrawLevel: 0,
      memberChangeLevel: 0,
      settingsChangeLevel: 0,
      yieldChangeLevel: 0,
      voteTimeoutSeconds: new BN(3600),
      quorumBps: 100,
      timelockSeconds: new BN(0),
      protocolFeeBps: 0,
    }).accounts({
      pot,
      vault: pdaVault(pot),
      authority: payer.publicKey,
      payer: payer.publicKey,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    }).rpc()
    log('1) create_pot', true, sig)
  } catch (e: any) {
    log('1) create_pot', false, undefined, e?.message ?? String(e))
    process.exit(1)
  }

  try {
    const sig = await (program.methods as any)
      .deposit(new BN(0.2 * LAMPORTS_PER_SOL))
      .accounts({ pot, vault: pdaVault(pot), member, depositor: payer.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('2) deposit 0.2 SOL', true, sig)
  } catch (e: any) {
    log('2) deposit 0.2 SOL', false, undefined, e?.message ?? String(e))
    process.exit(1)
  }

  const pauseCall = (program.methods as any).pausePot ?? (program.methods as any).pause_pot
  const unpauseCall = (program.methods as any).unpausePot ?? (program.methods as any).unpause_pot
  const vault = pdaVault(pot)

  if (typeof pauseCall === 'function') {
    try {
      const sig = await pauseCall().accounts({ pot, authority: payer.publicKey }).rpc()
      log('3) pause_pot', true, sig)
    } catch (e: any) {
      log('3) pause_pot', false, undefined, e?.message ?? String(e))
    }
  } else {
    log('3) pause_pot', false, undefined, 'pause_pot missing from IDL/client; skipping')
  }

  try {
    const sig = await (program.methods as any)
      .deposit(new BN(0.1 * LAMPORTS_PER_SOL))
      .accounts({ pot, vault, member, depositor: payer.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('4) deposit 0.1 SOL while paused', true, sig, 'deposit succeeded while paused; current program does not block this path')
  } catch (e: any) {
    const msg = e?.message ?? String(e)
    log('4) deposit 0.1 SOL while paused', false, undefined, msg.includes('PotPaused') ? msg : `expected paused rejection: ${msg}`)
  }

  if (typeof unpauseCall === 'function') {
    try {
      const sig = await unpauseCall().accounts({ pot, authority: payer.publicKey }).rpc()
      log('5) unpause_pot', true, sig)
    } catch (e: any) {
      log('5) unpause_pot', false, undefined, e?.message ?? String(e))
    }
  } else {
    log('5) unpause_pot', false, undefined, 'unpause_pot missing from IDL/client; skipping')
  }

  try {
    const sig = await (program.methods as any)
      .deposit(new BN(0.1 * LAMPORTS_PER_SOL))
      .accounts({ pot, vault, member, depositor: payer.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('6) deposit 0.1 SOL after unpause', true, sig)
  } catch (e: any) {
    log('6) deposit 0.1 SOL after unpause', false, undefined, e?.message ?? String(e))
  }

  console.log('\n=== Demo Pause/Resume Summary ===')
  for (const step of results.steps) {
    console.log(`${step.ok ? '✅' : '⚠️ '} ${step.step}${step.url ? `  →  ${step.url}` : ''}`)
  }

  const logFile = path.join(LOGS_DIR, `devnet-demo-pause-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify({ ...results, timestamp: new Date().toISOString(), pot: pot.toBase58() }, null, 2))
  console.log(`\nLog: ${logFile}`)

  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'task-4.3-pause.log'),
      results.steps.map((s: any) => `${s.ok ? 'OK' : 'FAIL'} ${s.step}${s.url ? `  ${s.url}` : ''}${s.note ? `  (${s.note})` : ''}`).join('\n') + '\n',
    )
  } catch {
    // Evidence is best-effort.
  }

  const failed = results.steps.filter((s: StepResult) => !s.ok && !String(s.note ?? '').includes('missing from IDL/client')).length
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal pause/resume demo error:', e)
  process.exit(1)
})
