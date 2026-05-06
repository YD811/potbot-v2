#!/usr/bin/env tsx
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import {
  Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY,
  Transaction, TransactionInstruction, LAMPORTS_PER_SOL, AccountMeta,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT,
} from '@solana/spl-token'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { IDL as SDK_IDL } from '../packages/sdk/src/idl/pot_vault'

function anchorDisc(snakeName: string): Buffer {
  return crypto.createHash('sha256').update(`global:${snakeName}`).digest().slice(0, 8)
}

async function sendRawIx(
  provider: AnchorProvider,
  disc: Buffer,
  accounts: AccountMeta[],
  argsBuf: Buffer,
  signers: Keypair[] = [],
): Promise<string> {
  const data = Buffer.concat([disc, argsBuf])
  const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys: accounts, data })
  const tx = new Transaction().add(ix)
  return provider.sendAndConfirm(tx, signers, { commitment: 'confirmed' })
}

const DEVNET_RPC   = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID   = new PublicKey('GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK')
const JUPITER_V6   = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4')
const SOL_MINT     = NATIVE_MINT
const USDC_MINT    = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const TREASURY     = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')
const KAMINO_STUB  = new PublicKey('11111111111111111111111111111111')
const EXPLORER     = 'https://explorer.solana.com/tx'
const JUP_API      = 'https://quote-api.jup.ag/v6'
const LOGS_DIR     = path.join(process.cwd(), 'logs')
const EVIDENCE_DIR = process.env.EVIDENCE_DIR ?? '/Users/yegordo/Library/Mobile Documents/iCloud~md~obsidian/Documents/YD/.sisyphus/evidence'

function loadKeypair(): Keypair {
  const p = process.env.KEYPAIR_PATH ?? path.join(os.homedir(), '.config', 'solana', 'id.json')
  if (!fs.existsSync(p)) return Keypair.generate()
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(p, 'utf8')) as number[]))
}

function loadIdl(): any {
  const target = path.join(process.cwd(), 'packages', 'program', 'target', 'idl', 'pot_vault.json')
  if (fs.existsSync(target)) return JSON.parse(fs.readFileSync(target, 'utf8'))
  return SDK_IDL
}

function pdaPot(authority: PublicKey, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)], PROGRAM_ID
  )[0]
}
function pdaVault(pot: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), pot.toBuffer()], PROGRAM_ID)[0]
}
function pdaMember(pot: PublicKey, wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('member'), pot.toBuffer(), wallet.toBuffer()], PROGRAM_ID
  )[0]
}
function pdaProposal(pot: PublicKey, proposalId: number) {
  const buf = Buffer.allocUnsafe(8)
  buf.writeBigUInt64LE(BigInt(proposalId), 0)
  return PublicKey.findProgramAddressSync([Buffer.from('proposal'), pot.toBuffer(), buf], PROGRAM_ID)[0]
}
function pdaVoterRecord(proposal: PublicKey, voter: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('voter'), proposal.toBuffer(), voter.toBuffer()], PROGRAM_ID
  )[0]
}
function pdaStrategy(pot: PublicKey, slotId: number) {
  const buf = Buffer.alloc(2)
  buf.writeUInt16LE(slotId, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('strategy'), pot.toBuffer(), buf], PROGRAM_ID
  )[0]
}
function pdaTokenMint(pot: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('token_mint'), pot.toBuffer()], PROGRAM_ID)[0]
}

function explorerUrl(sig: string) { return `${EXPLORER}/${sig}?cluster=devnet` }

async function tryJupiterQuote(amountLamports: number, userPk: PublicKey) {
  const resp = await fetch(`${JUP_API}/quote?` + new URLSearchParams({
    inputMint: SOL_MINT.toBase58(),
    outputMint: USDC_MINT.toBase58(),
    amount: amountLamports.toString(),
    slippageBps: '500',
  }))
  if (!resp.ok) throw new Error(`/quote: ${await resp.text()}`)
  const quote = await resp.json() as any
  const ixResp = await fetch(`${JUP_API}/swap-instructions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey: userPk.toBase58(), wrapAndUnwrapSol: true }),
  })
  if (!ixResp.ok) throw new Error(`/swap-instructions: ${await ixResp.text()}`)
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
  console.log('\n🌀  PotBot v2 — Full Lifecycle Demo (devnet)\n')
  fs.mkdirSync(LOGS_DIR, { recursive: true })

  const connection = new Connection(DEVNET_RPC, 'confirmed')
  const member1 = loadKeypair()
  const member2 = Keypair.generate()
  const provider = new AnchorProvider(connection, new Wallet(member1), { commitment: 'confirmed' })
  const program = new Program(loadIdl(), provider)

  const results: Record<string, any> = {
    wallet1: member1.publicKey.toBase58(),
    wallet2: member2.publicKey.toBase58(),
    steps: [],
  }

  let stepNum = 0
  const log = (label: string, ok: boolean, sig?: string, note?: string) => {
    stepNum++
    const url = sig ? explorerUrl(sig) : undefined
    const icon = ok ? '✅' : '⚠️ '
    console.log(`${icon} ${stepNum}) ${label}${url ? `\n   ${url}` : ''}${note ? `\n   ${note}` : ''}`)
    results.steps.push({ step: `${stepNum}) ${label}`, ok, sig, url, note })
  }

  try {
    const s1 = await connection.requestAirdrop(member1.publicKey, 2 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(s1, 'confirmed')
    console.log(`Airdrop 2 SOL → member1`)
  } catch { console.warn('Airdrop member1 rate-limited') }
  try {
    const s2 = await connection.requestAirdrop(member2.publicKey, 1 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(s2, 'confirmed')
    console.log(`Airdrop 1 SOL → member2 (${member2.publicKey.toBase58().slice(0, 8)}...)`)
  } catch {
    try {
      const tx = SystemProgram.transfer({
        fromPubkey: member1.publicKey, toPubkey: member2.publicKey,
        lamports: 0.5 * LAMPORTS_PER_SOL,
      })
      const sig = await provider.sendAndConfirm(new Transaction().add(tx))
      console.log(`Funded member2 from member1: ${sig}`)
    } catch { console.warn('Could not fund member2') }
  }

  const potName   = `demo-lifecycle-${Date.now()}`
  const pot       = pdaPot(member1.publicKey, potName)
  const vault     = pdaVault(pot)
  const member1Pda = pdaMember(pot, member1.publicKey)
  const member2Pda = pdaMember(pot, member2.publicKey)
  const strategyPda = pdaStrategy(pot, 0)
  const tokenMint = pdaTokenMint(pot)
  const vaultSolAta  = getAssociatedTokenAddressSync(SOL_MINT, vault, true)
  const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, vault, true)

  console.log(`\nPot:     ${pot.toBase58()}`)
  console.log(`Vault:   ${vault.toBase58()}`)
  console.log(`Name:    ${potName}\n`)

  try {
    const sig = await (program.methods as any).createPot({
      name: potName, emoji: '🌀', isPublic: true,
      minDeposit: new BN(0), lockupSeconds: new BN(0),
      yieldStrategy: 0, maxYieldAllocationBps: 0, maxTradeSizeBps: 10_000,
      maxMembers: 1000,
      tradeLevel: 0, withdrawLevel: 0, memberChangeLevel: 0,
      settingsChangeLevel: 0, yieldChangeLevel: 0,
      voteTimeoutSeconds: new BN(3600), quorumBps: 100,
      timelockSeconds: new BN(0), protocolFeeBps: 0,
    }).accounts({
      pot, vault, authority: member1.publicKey, payer: member1.publicKey,
      systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
    }).rpc()
    log('create_pot (autocracy mode — all levels=0)', true, sig)
  } catch (e: any) { log('create_pot', false, undefined, e?.message); process.exit(1) }

  try {
    const sig = await (program.methods as any)
      .deposit(new BN(0.3 * LAMPORTS_PER_SOL))
      .accounts({ pot, vault, member: member1Pda, depositor: member1.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('deposit 0.3 SOL (member1)', true, sig)
  } catch (e: any) { log('deposit 0.3 SOL (member1)', false, undefined, e?.message) }

  try {
    const provider2 = new AnchorProvider(connection, new Wallet(member2), { commitment: 'confirmed' })
    const prog2 = new Program(loadIdl(), provider2)
    const sig = await (prog2.methods as any)
      .deposit(new BN(0.3 * LAMPORTS_PER_SOL))
      .accounts({ pot, vault, member: member2Pda, depositor: member2.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('deposit 0.3 SOL (member2)', true, sig)
  } catch (e: any) { log('deposit 0.3 SOL (member2)', false, undefined, e?.message) }

  try {
    const sig = await (program.methods as any)
      .setAllowedMints({ mints: [SOL_MINT, USDC_MINT], agentAuthority: member1.publicKey })
      .accounts({ pot, authority: member1.publicKey })
      .rpc()
    log('set_allowed_mints (SOL + USDC)', true, sig)
  } catch (e: any) { log('set_allowed_mints', false, undefined, e?.message) }

  const proposal0 = pdaProposal(pot, 0)
  try {
    const sig = await (program.methods as any).createProposal({
      proposalType: {
        swap: {
          fromMint: SOL_MINT, toMint: USDC_MINT,
          amountIn: new BN(0.01 * LAMPORTS_PER_SOL), minAmountOut: new BN(0),
        },
      },
      description: 'Demo lifecycle swap: 0.01 SOL → USDC',
    }).accounts({
      pot, proposal: proposal0,
      member: member1Pda, vault,
      proposer: member1.publicKey, systemProgram: SystemProgram.programId,
    }).rpc()
    log('create_proposal (Swap, auto-passes in autocracy)', true, sig)
  } catch (e: any) { log('create_proposal', false, undefined, e?.message) }

  try {
    const voterRecord1 = pdaVoterRecord(proposal0, member1.publicKey)
    const sig = await (program.methods as any)
      .vote(true)
      .accounts({ pot, proposal: proposal0, member: member1Pda, voterRecord: voterRecord1, voter: member1.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('vote YES (member1)', true, sig)
  } catch (e: any) {
    const msg = e?.message ?? ''
    log('vote YES (member1)', false, undefined,
      msg.includes('already') || msg.includes('already in use') ? 'already voted (expected in autocracy)' : msg)
  }

  try {
    const provider2 = new AnchorProvider(connection, new Wallet(member2), { commitment: 'confirmed' })
    const prog2 = new Program(loadIdl(), provider2)
    const voterRecord2 = pdaVoterRecord(proposal0, member2.publicKey)
    const sig = await (prog2.methods as any)
      .vote(true)
      .accounts({ pot, proposal: proposal0, member: member2Pda, voterRecord: voterRecord2, voter: member2.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('vote YES (member2)', true, sig)
  } catch (e: any) { log('vote YES (member2)', false, undefined, e?.message) }

  try {
    const stratInfo = await connection.getAccountInfo(strategyPda)
    if (stratInfo) {
      log('create_strategy (AdminDirect)', true, undefined, 'already exists')
    } else {
      const sig = await (program.methods as any).createStrategy({
        slotId: 0,
        source: { adminDirect: { admin: member1.publicKey } },
        inputMint: SOL_MINT, outputMint: USDC_MINT,
        pythPriceFeed: null, stopLossBps: null, takeProfitBps: null,
        trailingStopBps: null, yieldTarget: { none: {} },
      }).accounts({
        pot, strategy: strategyPda, payer: member1.publicKey,
        authority: member1.publicKey, systemProgram: SystemProgram.programId,
      }).rpc()
      log('create_strategy (AdminDirect, slot 0)', true, sig)
    }
  } catch (e: any) { log('create_strategy', false, undefined, e?.message) }

  try {
    const ataIx = createAssociatedTokenAccountIdempotentInstruction(
      member1.publicKey, vaultSolAta, vault, SOL_MINT
    )
    const usdcAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      member1.publicKey, vaultUsdcAta, vault, USDC_MINT
    )
    await provider.sendAndConfirm(new Transaction().add(ataIx, usdcAtaIx), [], { skipPreflight: true })

    const ENTRY_LAMPORTS = 0.05 * LAMPORTS_PER_SOL
    const fundTx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: member1.publicKey, toPubkey: vaultSolAta, lamports: ENTRY_LAMPORTS }),
      new TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys: [{ pubkey: vaultSolAta, isSigner: false, isWritable: true }], data: Buffer.from([17]) })
    )
    await provider.sendAndConfirm(fundTx, [], { skipPreflight: true })

    console.log('  Fetching Jupiter quote (0.05 SOL → USDC)...')
    const { outAmount, jupAccounts, jupData } = await tryJupiterQuote(ENTRY_LAMPORTS, vault)
    console.log(`  Jupiter quote: ${(outAmount / 1e6).toFixed(4)} USDC`)

    const sig = await (program.methods as any).executeSwap({
      mode: { adminDirect: {} },
      amountIn: new BN(ENTRY_LAMPORTS),
      minOut: new BN(Math.floor(outAmount * 0.95)),
      maxIn: new BN(ENTRY_LAMPORTS),
      isEntry: true,
      jupiterIxData: Array.from(jupData),
    }).accounts({
      pot, strategy: strategyPda, vault,
      sourceAta: vaultSolAta, destinationAta: vaultUsdcAta,
      jupiterProgram: JUPITER_V6, pythPriceUpdate: PROGRAM_ID,
      proposalSwapSpec: null, authority: member1.publicKey,
    }).remainingAccounts(jupAccounts).rpc()
    log('execute_swap (AdminDirect, 0.05 SOL→USDC)', true, sig)
  } catch (e: any) {
    log('execute_swap (AdminDirect)', false, undefined,
      `Jupiter/swap skipped — ${e?.message?.slice(0, 100)}`)
  }

  let tokenizationOk = false
  let sharesPerSol = 1000

  try {
    const sig = await (program.methods as any)
      .tokenizeShares()
      .accounts({
        pot, vault, tokenMint,
        authority: member1.publicKey, treasury: TREASURY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }).rpc()
    log('tokenize_shares (shares_per_sol=1000)', true, sig)
    tokenizationOk = true
    sharesPerSol = 1000
  } catch (e: any) {
    log('tokenize_shares', false, undefined, `${e?.message?.slice(0, 100)} — trying init_token_mint`)
    try {
      const sig = await (program.methods as any)
        .initTokenMint()
        .accounts({
          pot, tokenMint, authority: member1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        }).rpc()
      log('init_token_mint (fallback, shares_per_sol=100)', true, sig)
      tokenizationOk = true
      sharesPerSol = 100
    } catch (e2: any) { log('init_token_mint', false, undefined, e2?.message) }
  }

  if (tokenizationOk) {
    const member1Ata = getAssociatedTokenAddressSync(tokenMint, member1.publicKey, false)
    const member2Ata = getAssociatedTokenAddressSync(tokenMint, member2.publicKey, false)
    const sharesAmount = 50
    const tokenAmount  = sharesAmount * sharesPerSol
    const halfTokens   = Math.floor(tokenAmount / 2)

    try {
      const sig = await (program.methods as any)
        .mintTokensToMember(new BN(sharesAmount))
        .accounts({
          pot, tokenMint, memberTokenAccount: member1Ata,
          memberWallet: member1.publicKey, authority: member1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).rpc()
      log(`mint_tokens_to_member (${sharesAmount} shares → ${tokenAmount} tokens → member1)`, true, sig)
    } catch (e: any) { log('mint_tokens_to_member (member1)', false, undefined, e?.message) }

    try {
      const sig = await (program.methods as any)
        .mintTokensToMember(new BN(sharesAmount))
        .accounts({
          pot, tokenMint, memberTokenAccount: member2Ata,
          memberWallet: member2.publicKey, authority: member1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).rpc()
      log(`mint_tokens_to_member (${sharesAmount} shares → ${tokenAmount} tokens → member2)`, true, sig)
    } catch (e: any) { log('mint_tokens_to_member (member2)', false, undefined, e?.message) }

    try {
      const KAMINO_RESERVE_STUB = new PublicKey('9TD2TSv4pENb8VwfbVYg25jvym7HN6iuAR6pFNSrKjqQ')
      const routeArgsBuf = Buffer.alloc(1 + 32 + 8)
      routeArgsBuf[0] = 1
      KAMINO_RESERVE_STUB.toBuffer().copy(routeArgsBuf, 1)
      routeArgsBuf.writeBigUInt64LE(BigInt(0.01 * LAMPORTS_PER_SOL), 33)
      const routeAccounts: AccountMeta[] = [
        { pubkey: pot,                isSigner: false, isWritable: true },
        { pubkey: member1.publicKey,  isSigner: true,  isWritable: false },
      ]
      const sig = await sendRawIx(provider, anchorDisc('route_to_yield'), routeAccounts, routeArgsBuf)
      log('route_to_yield (KaminoLend stub — emit only)', true, sig)
    } catch (e: any) { log('route_to_yield', false, undefined, e?.message) }

    try {
      const amountBuf = Buffer.alloc(8)
      amountBuf.writeBigUInt64LE(BigInt(halfTokens), 0)
      const redeemAccounts: AccountMeta[] = [
        { pubkey: pot,               isSigner: false, isWritable: true },
        { pubkey: vault,             isSigner: false, isWritable: true },
        { pubkey: tokenMint,         isSigner: false, isWritable: true },
        { pubkey: member1Ata,        isSigner: false, isWritable: true },
        { pubkey: member1.publicKey, isSigner: true,  isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]
      const sig = await sendRawIx(provider, anchorDisc('redeem_tokens'), redeemAccounts, amountBuf)
      log(`redeem_tokens (member1 burns ${halfTokens} tokens → SOL)`, true, sig)
    } catch (e: any) { log('redeem_tokens (member1)', false, undefined, e?.message) }
  } else {
    for (const l of ['mint_tokens_to_member (member1)', 'mint_tokens_to_member (member2)', 'route_to_yield', 'redeem_tokens (member1)']) {
      log(l, false, undefined, 'skipped — tokenization failed')
    }
  }

  try {
    const sig = await (program.methods as any)
      .withdraw(new BN(1))
      .accounts({
        pot, vault, member: member2Pda,
        withdrawer: member2.publicKey, systemProgram: SystemProgram.programId,
      })
      .signers([member2])
      .rpc()
    log('withdraw (member2 — 1 share)', true, sig)
  } catch (e: any) {
    log('withdraw (member2)', false, undefined, e?.message)
  }

  const totalOk = results.steps.filter((s: any) => s.ok).length
  const totalSteps = results.steps.length
  const explorerUrls = results.steps.filter((s: any) => s.url).map((s: any) => s.url)

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`🌀  Full Lifecycle Demo — ${totalOk}/${totalSteps} steps OK`)
  console.log(`${'─'.repeat(60)}`)
  for (const s of results.steps) {
    console.log(`${s.ok ? '✅' : '⚠️ '} ${s.step}${s.url ? `  →  ${s.url}` : ''}`)
  }
  console.log(`\nExplorer URLs (${explorerUrls.length}):`)
  explorerUrls.forEach((u: string, i: number) => console.log(`  ${i + 1}. ${u}`))

  const logFile = path.join(LOGS_DIR, `devnet-lifecycle-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify({
    ...results, timestamp: new Date().toISOString(),
    summary: { totalOk, totalSteps, explorerUrls },
  }, null, 2))
  console.log(`\nLog: ${logFile}`)

  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'task-2.5-lifecycle.log'),
      [`Lifecycle Demo — ${totalOk}/${totalSteps} OK`, ...results.steps.map((s: any) =>
        `${s.ok ? 'OK' : 'FAIL'} ${s.step}${s.url ? `  ${s.url}` : ''}${s.note ? `  (${s.note})` : ''}`)
      ].join('\n') + '\n'
    )
  } catch { }

  if (explorerUrls.length < 10) {
    console.warn(`\n⚠️  Only ${explorerUrls.length} explorer URLs generated (target: ≥10). Some steps failed — check logs above.`)
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
