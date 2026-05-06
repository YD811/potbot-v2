#!/usr/bin/env tsx
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import {
  Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY,
  Transaction, TransactionInstruction, LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT,
} from '@solana/spl-token'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { IDL as SDK_IDL } from '../packages/sdk/src/idl/pot_vault'

const DEVNET_RPC  = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID  = new PublicKey('GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK')
const JUPITER_V6  = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4')
const SOL_MINT    = NATIVE_MINT
const USDC_MINT   = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const EXPLORER    = 'https://explorer.solana.com/tx'
const JUP_API     = 'https://quote-api.jup.ag/v6'
const LOGS_DIR    = path.join(process.cwd(), 'logs')
const EVIDENCE_DIR = process.env.EVIDENCE_DIR ?? '/Users/yegordo/Library/Mobile Documents/iCloud~md~obsidian/Documents/YD/.sisyphus/evidence'

function loadKeypair(): Keypair {
  const p = process.env.KEYPAIR_PATH ?? path.join(os.homedir(), '.config', 'solana', 'id.json')
  if (!fs.existsSync(p)) {
    console.warn(`Keypair not found at ${p}; using ephemeral`)
    return Keypair.generate()
  }
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(p, 'utf8')) as number[]))
}

function loadIdl(): any {
  const target = path.join(process.cwd(), 'packages', 'program', 'target', 'idl', 'pot_vault.json')
  if (fs.existsSync(target)) return JSON.parse(fs.readFileSync(target, 'utf8'))
  return SDK_IDL
}

function pdaPot(authority: PublicKey, name: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)], PROGRAM_ID
  )[0]
}
function pdaVault(pot: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), pot.toBuffer()], PROGRAM_ID)[0]
}
function pdaStrategy(pot: PublicKey, slotId: number): PublicKey {
  const slotBuf = Buffer.alloc(2)
  slotBuf.writeUInt16LE(slotId, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('strategy'), pot.toBuffer(), slotBuf], PROGRAM_ID
  )[0]
}

function explorerUrl(sig: string) { return `${EXPLORER}/${sig}?cluster=devnet` }

async function jupiterQuote(amountLamports: number, userPk: PublicKey) {
  const resp = await fetch(`${JUP_API}/quote?` + new URLSearchParams({
    inputMint: SOL_MINT.toBase58(),
    outputMint: USDC_MINT.toBase58(),
    amount: amountLamports.toString(),
    slippageBps: '500',
    onlyDirectRoutes: 'false',
  }))
  if (!resp.ok) throw new Error(`Jupiter /quote: ${await resp.text()}`)
  const quote = await resp.json() as any

  const ixResp = await fetch(`${JUP_API}/swap-instructions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey: userPk.toBase58(), wrapAndUnwrapSol: true }),
  })
  if (!ixResp.ok) throw new Error(`Jupiter /swap-instructions: ${await ixResp.text()}`)
  const ixData = await ixResp.json() as any
  const ix = ixData.swapInstruction
  return {
    outAmount: Number(quote.outAmount),
    jupAccounts: (ix.accounts as any[]).map((a: any) => ({
      pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable,
    })),
    jupData: Buffer.from(ix.data, 'base64'),
  }
}

async function main() {
  console.log('\n🫙  PotBot v2 — Demo Swap (devnet)\n')
  fs.mkdirSync(LOGS_DIR, { recursive: true })

  const connection = new Connection(DEVNET_RPC, 'confirmed')
  const payer = loadKeypair()
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: 'confirmed' })
  const program = new Program(loadIdl(), provider)

  const results: Record<string, any> = { wallet: payer.publicKey.toBase58(), steps: [] }
  const log = (step: string, ok: boolean, sig?: string, note?: string) => {
    const url = sig ? explorerUrl(sig) : undefined
    const icon = ok ? '✅' : '⚠️ '
    console.log(`${icon} ${step}${url ? `\n   ${url}` : ''}${note ? `\n   ${note}` : ''}`)
    results.steps.push({ step, ok, sig, url, note })
  }

  try {
    const sig = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL)
    await connection.confirmTransaction(sig, 'confirmed')
    console.log(`Airdrop 1 SOL → ${payer.publicKey.toBase58()}`)
  } catch { console.warn('Airdrop rate-limited; continuing with existing balance') }

  const potName = `demo-swap-${Date.now()}`
  const pot = pdaPot(payer.publicKey, potName)
  const vault = pdaVault(pot)
  const strategyPda = pdaStrategy(pot, 0)
  const vaultSolAta = getAssociatedTokenAddressSync(SOL_MINT, vault, true)
  const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, vault, true)

  console.log(`Pot:     ${pot.toBase58()}`)
  console.log(`Vault:   ${vault.toBase58()}`)
  console.log(`Name:    ${potName}`)

  try {
    const sig = await (program.methods as any).createPot({
      name: potName, emoji: '🔄', isPublic: true,
      minDeposit: new BN(0), lockupSeconds: new BN(0),
      yieldStrategy: 0, maxYieldAllocationBps: 0, maxTradeSizeBps: 10_000,
      maxMembers: 1000, tradeLevel: 1, withdrawLevel: 1, memberChangeLevel: 1,
      settingsChangeLevel: 1, yieldChangeLevel: 1, voteTimeoutSeconds: new BN(3600),
      quorumBps: 100, timelockSeconds: new BN(0), protocolFeeBps: 0,
    }).accounts({
      pot, vault, authority: payer.publicKey, payer: payer.publicKey,
      systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
    }).rpc()
    log('1) create_pot', true, sig)
  } catch (e: any) { log('1) create_pot', false, undefined, e?.message); process.exit(1) }

  try {
    const memberPda = PublicKey.findProgramAddressSync(
      [Buffer.from('member'), pot.toBuffer(), payer.publicKey.toBuffer()], PROGRAM_ID
    )[0]
    const sig = await (program.methods as any)
      .deposit(new BN(0.5 * LAMPORTS_PER_SOL))
      .accounts({ pot, vault, member: memberPda, depositor: payer.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('2) deposit 0.5 SOL', true, sig)
  } catch (e: any) { log('2) deposit 0.5 SOL', false, undefined, e?.message) }

  try {
    const sig = await (program.methods as any)
      .setAllowedMints({ mints: [SOL_MINT, USDC_MINT], agentAuthority: payer.publicKey })
      .accounts({ pot, authority: payer.publicKey })
      .rpc()
    log('3) set_allowed_mints', true, sig)
  } catch (e: any) { log('3) set_allowed_mints', false, undefined, e?.message) }

  try {
    const sig = await (program.methods as any)
      .setSpendingPolicy({ singleSwapCapBps: 5000, dailyBudgetLamports: new BN(0.5 * LAMPORTS_PER_SOL) })
      .accounts({ pot, authority: payer.publicKey })
      .rpc()
    log('4) set_spending_policy', true, sig)
  } catch (e: any) { log('4) set_spending_policy', false, undefined, e?.message) }

  try {
    const stratInfo = await connection.getAccountInfo(strategyPda)
    if (stratInfo) {
      log('5) create_strategy', true, undefined, 'already exists — skipped')
    } else {
      const sig = await (program.methods as any).createStrategy({
        slotId: 0,
        source: { adminDirect: { admin: payer.publicKey } },
        inputMint: SOL_MINT, outputMint: USDC_MINT,
        pythPriceFeed: null, stopLossBps: null, takeProfitBps: null,
        trailingStopBps: null, yieldTarget: { none: {} },
      }).accounts({
        pot, strategy: strategyPda, payer: payer.publicKey,
        authority: payer.publicKey, systemProgram: SystemProgram.programId,
      }).rpc()
      log('5) create_strategy', true, sig)
    }
  } catch (e: any) { log('5) create_strategy', false, undefined, e?.message) }

  try {
    const ataIx = createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey, vaultSolAta, vault, SOL_MINT
    )
    const usdcAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey, vaultUsdcAta, vault, USDC_MINT
    )
    const ataTx = new Transaction().add(ataIx, usdcAtaIx)
    await provider.sendAndConfirm(ataTx, [], { skipPreflight: true })

    const ENTRY_LAMPORTS = 0.1 * LAMPORTS_PER_SOL
    const fundTx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: vaultSolAta, lamports: ENTRY_LAMPORTS }),
      new TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys: [{ pubkey: vaultSolAta, isSigner: false, isWritable: true }], data: Buffer.from([17]) })
    )
    await provider.sendAndConfirm(fundTx, [], { skipPreflight: true })

    console.log('  Fetching Jupiter quote (0.1 SOL → USDC)...')
    const { outAmount, jupAccounts, jupData } = await jupiterQuote(ENTRY_LAMPORTS, vault)
    const minOut = Math.floor(outAmount * 0.95)
    console.log(`  Jupiter quote: ${(outAmount / 1e6).toFixed(4)} USDC`)

    const sig = await (program.methods as any).executeSwap({
      mode: { adminDirect: {} },
      amountIn: new BN(ENTRY_LAMPORTS),
      minOut: new BN(minOut),
      maxIn: new BN(ENTRY_LAMPORTS),
      isEntry: true,
      jupiterIxData: Array.from(jupData),
    }).accounts({
      pot, strategy: strategyPda, vault,
      sourceAta: vaultSolAta, destinationAta: vaultUsdcAta,
      jupiterProgram: JUPITER_V6,
      pythPriceUpdate: PROGRAM_ID,
      proposalSwapSpec: null,
      authority: payer.publicKey,
    }).remainingAccounts(jupAccounts).rpc()
    log('6) execute_swap (AdminDirect, 0.1 SOL→USDC)', true, sig)
  } catch (e: any) {
    log('6) execute_swap (AdminDirect, 0.1 SOL→USDC)', false, undefined,
      `Jupiter/swap failed — pot creation and deposit still valid. Error: ${e?.message?.slice(0, 120)}`)
  }

  console.log('\n=== Demo Swap Summary ===')
  for (const s of results.steps) {
    console.log(`${s.ok ? '✅' : '⚠️ '} ${s.step}${s.url ? `  →  ${s.url}` : ''}`)
  }

  const logFile = path.join(LOGS_DIR, `devnet-demo-swap-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify({ ...results, timestamp: new Date().toISOString() }, null, 2))
  console.log(`\nLog: ${logFile}`)

  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'task-2.3-swap.log'),
      results.steps.map((s: any) => `${s.ok ? 'OK' : 'FAIL'} ${s.step}${s.url ? `  ${s.url}` : ''}${s.note ? `  (${s.note})` : ''}`).join('\n') + '\n'
    )
  } catch { }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
