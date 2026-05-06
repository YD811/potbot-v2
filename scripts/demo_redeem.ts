#!/usr/bin/env tsx
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import {
  Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL,
  TransactionInstruction, Transaction, AccountMeta,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID,
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

const DEVNET_RPC    = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID    = new PublicKey('GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK')
const TREASURY      = new PublicKey('2LeG86xuss12WrYsamTGk4zLfBbXJpWZpr1yFrUqN98o')
const EXPLORER      = 'https://explorer.solana.com/tx'
const LOGS_DIR      = path.join(process.cwd(), 'logs')
const EVIDENCE_DIR  = process.env.EVIDENCE_DIR ?? '/Users/yegordo/Library/Mobile Documents/iCloud~md~obsidian/Documents/YD/.sisyphus/evidence'

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
function pdaTokenMint(pot: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('token_mint'), pot.toBuffer()], PROGRAM_ID)[0]
}
function pdaMember(pot: PublicKey, wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('member'), pot.toBuffer(), wallet.toBuffer()], PROGRAM_ID
  )[0]
}

function explorerUrl(sig: string) { return `${EXPLORER}/${sig}?cluster=devnet` }

async function main() {
  console.log('\n🎟️  PotBot v2 — Demo Redeem (devnet)\n')
  fs.mkdirSync(LOGS_DIR, { recursive: true })

  const connection = new Connection(DEVNET_RPC, 'confirmed')
  const payer = loadKeypair()
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: 'confirmed' })
  const program = new Program(loadIdl(), provider)

  const results: Record<string, any> = { wallet: payer.publicKey.toBase58(), steps: [] }
  const log = (step: string, ok: boolean, sig?: string, note?: string) => {
    const url = sig ? explorerUrl(sig) : undefined
    console.log(`${ok ? '✅' : '⚠️ '} ${step}${url ? `\n   ${url}` : ''}${note ? `\n   ${note}` : ''}`)
    results.steps.push({ step, ok, sig, url, note })
  }

  try {
    const sig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(sig, 'confirmed')
    console.log(`Airdrop 2 SOL → ${payer.publicKey.toBase58()}`)
  } catch { console.warn('Airdrop rate-limited') }

  const potName = `demo-redeem-${Date.now()}`
  const pot     = pdaPot(payer.publicKey, potName)
  const vault   = pdaVault(pot)
  const tokenMint = pdaTokenMint(pot)
  console.log(`Pot: ${pot.toBase58()}\nVault: ${vault.toBase58()}\nMint: ${tokenMint.toBase58()}`)

  try {
    const sig = await (program.methods as any).createPot({
      name: potName, emoji: '🎟️', isPublic: true,
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
    const memberPda = pdaMember(pot, payer.publicKey)
    const sig = await (program.methods as any)
      .deposit(new BN(0.5 * LAMPORTS_PER_SOL))
      .accounts({ pot, vault, member: memberPda, depositor: payer.publicKey, systemProgram: SystemProgram.programId })
      .rpc()
    log('2) deposit 0.5 SOL', true, sig)
  } catch (e: any) { log('2) deposit 0.5 SOL', false, undefined, e?.message) }

  let tokenizationOk = false
  let sharesPerSol = 1000

  try {
    const sig = await (program.methods as any)
      .tokenizeShares()
      .accounts({
        pot, vault, tokenMint,
        authority: payer.publicKey,
        treasury: TREASURY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }).rpc()
    log('3) tokenize_shares (shares_per_sol=1000, fee→treasury)', true, sig)
    tokenizationOk = true
    sharesPerSol = 1000
  } catch (e: any) {
    log('3) tokenize_shares', false, undefined, `${e?.message?.slice(0, 120)} — falling back to init_token_mint`)
    try {
      const sig = await (program.methods as any)
        .initTokenMint()
        .accounts({
          pot, tokenMint,
          authority: payer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        }).rpc()
      log('3b) init_token_mint (fallback, shares_per_sol=100)', true, sig)
      tokenizationOk = true
      sharesPerSol = 100
    } catch (e2: any) {
      log('3b) init_token_mint', false, undefined, e2?.message)
    }
  }

  const member2 = Keypair.generate()
  console.log(`\nEphemeral member: ${member2.publicKey.toBase58()}`)

  try {
    const airdropSig = await connection.requestAirdrop(member2.publicKey, 0.05 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(airdropSig, 'confirmed')
  } catch { }

  if (tokenizationOk) {
    const sharesAmount = 50
    const expectedTokens = sharesAmount * sharesPerSol
    const halfTokens = Math.floor(expectedTokens / 2)
    const member2Ata = getAssociatedTokenAddressSync(tokenMint, member2.publicKey, false)

    try {
      const sig = await (program.methods as any)
        .mintTokensToMember(new BN(sharesAmount))
        .accounts({
          pot, tokenMint,
          memberTokenAccount: member2Ata,
          memberWallet: member2.publicKey,
          authority: payer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).rpc()
      log(`4) mint_tokens_to_member (${sharesAmount} shares → ${expectedTokens} tokens → ${member2.publicKey.toBase58().slice(0, 8)}...)`, true, sig)
    } catch (e: any) { log('4) mint_tokens_to_member', false, undefined, e?.message) }

    try {
      const amountBuf = Buffer.alloc(8)
      amountBuf.writeBigUInt64LE(BigInt(halfTokens), 0)
      const redeemAccounts: AccountMeta[] = [
        { pubkey: pot,            isSigner: false, isWritable: true },
        { pubkey: vault,          isSigner: false, isWritable: true },
        { pubkey: tokenMint,      isSigner: false, isWritable: true },
        { pubkey: member2Ata,     isSigner: false, isWritable: true },
        { pubkey: member2.publicKey, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]
      const sig = await sendRawIx(provider, anchorDisc('redeem_tokens'), redeemAccounts, amountBuf, [member2])
      log(`5) redeem_tokens (burn ${halfTokens} tokens → receive SOL)`, true, sig)
    } catch (e: any) { log('5) redeem_tokens', false, undefined, e?.message) }
  } else {
    log('4) mint_tokens_to_member', false, undefined, 'skipped — tokenization failed')
    log('5) redeem_tokens', false, undefined, 'skipped — tokenization failed')
  }

  console.log('\n=== Demo Redeem Summary ===')
  for (const s of results.steps) {
    console.log(`${s.ok ? '✅' : '⚠️ '} ${s.step}${s.url ? `  →  ${s.url}` : ''}`)
  }

  const logFile = path.join(LOGS_DIR, `devnet-demo-redeem-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify({ ...results, timestamp: new Date().toISOString() }, null, 2))
  console.log(`\nLog: ${logFile}`)

  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'task-2.4-redeem.log'),
      results.steps.map((s: any) => `${s.ok ? 'OK' : 'FAIL'} ${s.step}${s.url ? `  ${s.url}` : ''}${s.note ? `  (${s.note})` : ''}`).join('\n') + '\n'
    )
  } catch { }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
