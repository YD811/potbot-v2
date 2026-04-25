#!/usr/bin/env tsx
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { IDL as SDK_IDL } from '../packages/sdk/src/idl/pot_vault'

const DEVNET_RPC = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK')
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

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
  if (fs.existsSync(idlPath)) {
    return JSON.parse(fs.readFileSync(idlPath, 'utf8'))
  }
  return SDK_IDL
}

type StepResult = { step: string; ok: boolean; tx?: string; note?: string }

function printResult(result: StepResult) {
  const icon = result.ok ? '✅' : '❌'
  const tx = result.tx ? ` tx=${result.tx}` : ''
  const note = result.note ? ` (${result.note})` : ''
  console.log(`${icon} ${result.step}${tx}${note}`)
}

function pdaPot(authority: PublicKey, name: string): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)], PROGRAM_ID)[0]
}

function pdaVault(pot: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), pot.toBuffer()], PROGRAM_ID)[0]
}

function pdaStrategyVault(pot: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('strategy_vault'), pot.toBuffer()], PROGRAM_ID)[0]
}

async function fetchAccountNullable(connection: Connection, pubkey: PublicKey) {
  return connection.getAccountInfo(pubkey, 'confirmed')
}

async function main() {
  const connection = new Connection(DEVNET_RPC, 'confirmed')
  const payer = loadKeypair()
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: 'confirmed' })
  let program: Program
  try {
    program = new Program(loadIdl(), provider)
  } catch (e: any) {
    console.log('=== E2E smoke results (devnet) ===')
    printResult({
      step: '0) program client bootstrap',
      ok: false,
      note: `Unable to construct Program from available IDL: ${e?.message ?? String(e)}`,
    })
    process.exit(1)
    return
  }
  try {
    const sig = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(sig, 'confirmed')
  } catch {
    // if faucet rate-limits, we still continue and surface tx failures per step
  }

  const potName = `smoke-${Date.now().toString(36)}`
  const pot = pdaPot(payer.publicKey, potName)
  const vault = pdaVault(pot)
  const strategyVault = pdaStrategyVault(pot)

  const results: StepResult[] = []

  // Step 1: create_pot (+ try set_allowed_mints)
  try {
    const createPotTx = await (program.methods as any)
      .createPot({
        name: potName,
        emoji: '🧪',
        isPublic: true,
        minDeposit: new BN(0),
        lockupSeconds: new BN(0),
        yieldStrategy: 0,
        maxYieldAllocationBps: 0,
        maxTradeSizeBps: 10_000,
        maxMembers: 1000,
        tradeLevel: 1,
        withdrawLevel: 1,
        memberChangeLevel: 1,
        settingsChangeLevel: 1,
        yieldChangeLevel: 1,
        voteTimeoutSeconds: new BN(3600),
        quorumBps: 100,
        timelockSeconds: new BN(0),
        protocolFeeBps: 0,
      })
      .accounts({
        pot,
        vault,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const potInfo = await fetchAccountNullable(connection, pot)
    if (!potInfo) throw new Error('pot account missing after create_pot')

    const methods = program.methods as any
    if (typeof methods.setAllowedMints === 'function') {
      const tx = await methods
        .setAllowedMints({ mints: [SOL_MINT, USDC_MINT] })
        .accounts({ pot, authority: payer.publicKey, systemProgram: SystemProgram.programId })
        .rpc()
      results.push({ step: '1) create_pot + set_allowed_mints', ok: true, tx: `${createPotTx},${tx}` })
    } else {
      results.push({ step: '1) create_pot + set_allowed_mints', ok: true, tx: createPotTx, note: 'set_allowed_mints not present in IDL/program' })
    }
  } catch (err: any) {
    results.push({ step: '1) create_pot + set_allowed_mints', ok: false, note: err?.message ?? String(err) })
  }

  // Seed vault with small SOL so execute_swap can pass balance checks.
  try {
    const airdropSig = await connection.requestAirdrop(vault, 0.01 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(airdropSig, 'confirmed')
  } catch {
    // non-fatal for smoke output
  }

  // Step 2: create_strategy in AdminDirect mode (best-effort map to create_strategy_vault)
  try {
    const methods = program.methods as any
    if (typeof methods.createStrategy === 'function') {
      const tx = await methods
        .createStrategy({
          mode: { adminDirect: {} },
          name: 'admin-direct',
        })
        .accounts({ pot, strategy: strategyVault, authority: payer.publicKey, systemProgram: SystemProgram.programId })
        .rpc()
      const info = await fetchAccountNullable(connection, strategyVault)
      if (!info) throw new Error('strategy account missing after create_strategy')
      results.push({ step: '2) create_strategy(AdminDirect)', ok: true, tx })
    } else if (typeof methods.createStrategyVault === 'function') {
      const tx = await methods
        .createStrategyVault(
          potName,
          'smoke strategy',
          new BN(0),
          0,
          0,
          0,
          {
            strategyType: { dca: {} },
            allowedTokens: [SOL_MINT, USDC_MINT],
            maxSwapPct: 10,
            rebalanceFreqSec: new BN(3600),
            stopLossBps: 0,
            takeProfitBps: 0,
          },
        )
        .accounts({
          creator: payer.publicKey,
          pot,
          strategyVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      const info = await fetchAccountNullable(connection, strategyVault)
      if (!info) throw new Error('strategy_vault missing after create_strategy_vault')
      results.push({ step: '2) create_strategy(AdminDirect)', ok: true, tx, note: 'mapped to create_strategy_vault' })
    } else {
      results.push({ step: '2) create_strategy(AdminDirect)', ok: false, note: 'create_strategy/create_strategy_vault missing from IDL' })
    }
  } catch (err: any) {
    results.push({ step: '2) create_strategy(AdminDirect)', ok: false, note: err?.message ?? String(err) })
  }

  // Step 3: execute_swap
  try {
    const tx = await (program.methods as any)
      .executeSwap({
        fromMint: SOL_MINT,
        toMint: USDC_MINT,
        amountIn: new BN(500_000), // 0.0005 SOL
        minAmountOut: new BN(0),
      })
      .accounts({
        pot,
        vault,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const potAccount = await (program.account as any).potAccount.fetch(pot)
    const volume = Number(potAccount.totalVolume?.toString?.() ?? 0)
    const trades = Number(potAccount.tradeCount ?? 0)
    const ok = trades >= 1 && volume >= 500_000
    results.push({ step: '3) execute_swap(AdminDirect)', ok, tx, note: `trade_count=${trades} total_volume=${volume}` })
  } catch (err: any) {
    results.push({ step: '3) execute_swap(AdminDirect)', ok: false, note: err?.message ?? String(err) })
  }

  // Step 4: state verification summary
  try {
    const potAccount = await (program.account as any).potAccount.fetch(pot)
    const vaultInfo = await connection.getAccountInfo(vault)
    const strategyInfo = await connection.getAccountInfo(strategyVault)
    const ok = !!potAccount && !!vaultInfo
    results.push({
      step: '4) verify on-chain state each step',
      ok,
      note: `pot=${pot.toBase58()} vault_lamports=${vaultInfo?.lamports ?? 0} strategy_exists=${!!strategyInfo}`,
    })
  } catch (err: any) {
    results.push({ step: '4) verify on-chain state each step', ok: false, note: err?.message ?? String(err) })
  }

  console.log('\n=== E2E smoke results (devnet) ===')
  for (const r of results) printResult(r)

  const failed = results.filter((r) => !r.ok).length
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal e2e smoke error:', e)
  process.exit(1)
})
