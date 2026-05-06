// scripts/demo_swap.ts
//
// E2E demo: SOL → USDC swap on devnet through PotBot's `execute_swap`
// instruction in AdminDirect mode.
//
// Prereqs:
//   - existing pot on devnet whose authority matches your local keypair
//   - vault has at least 0.05 SOL (run scripts/fund-devnet.sh first)
//   - export POT_PUBKEY=<pot pubkey>  (or pass --pot <pubkey>)
//   - anchor build has produced a current IDL at packages/program/target/idl/pot_vault.json
//
// Run:
//   npx ts-node scripts/demo_swap.ts --pot <pot pubkey>

/* eslint-disable no-console */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { AnchorProvider, BN, Program, Wallet, type Idl } from '@coral-xyz/anchor'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'

// ─── Constants ─────────────────────────────────────────────────────────────

const DEVNET_RPC = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey(
  process.env.POT_PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK',
)
const JUPITER_V6 = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4')
const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

const QUOTE_URL = 'https://quote-api.jup.ag/v6/quote'
const SWAP_IX_URL = 'https://quote-api.jup.ag/v6/swap-instructions'

const SWAP_LAMPORTS = 10_000_000 // 0.01 SOL
const MIN_VAULT_LAMPORTS = 50_000_000 // 0.05 SOL

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadKeypair(): Keypair {
  const fromEnv = process.env.AUTHORITY_KEYPAIR
  const file = fromEnv && fromEnv.length > 0
    ? fromEnv
    : path.join(os.homedir(), '.config', 'solana', 'id.json')
  const raw = fs.readFileSync(file, 'utf8')
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
}

function parseArgs(): { pot: PublicKey } {
  const argv = process.argv.slice(2)
  const idx = argv.indexOf('--pot')
  const pot = idx >= 0 ? argv[idx + 1] : process.env.POT_PUBKEY
  if (!pot) {
    console.error('Missing pot pubkey. Pass --pot <pubkey> or set POT_PUBKEY env var.')
    process.exit(1)
  }
  return { pot: new PublicKey(pot) }
}

function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`
}

interface JupiterAccountMetaJson {
  pubkey: string
  isSigner: boolean
  isWritable: boolean
}

interface JupiterIxJson {
  programId: string
  accounts: JupiterAccountMetaJson[]
  data: string // base64
}

interface JupiterSwapInstructionsResp {
  swapInstruction: JupiterIxJson
  addressLookupTableAddresses?: string[]
}

async function getJupiterQuote(amountLamports: number) {
  const url = new URL(QUOTE_URL)
  url.searchParams.set('inputMint', NATIVE_MINT.toBase58())
  url.searchParams.set('outputMint', USDC_DEVNET.toBase58())
  url.searchParams.set('amount', String(amountLamports))
  url.searchParams.set('slippageBps', '50')
  url.searchParams.set('onlyDirectRoutes', 'false')
  url.searchParams.set('asLegacyTransaction', 'false')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Jupiter quote failed: ${res.statusText}`)
  return res.json() as Promise<{
    outAmount: string
    otherAmountThreshold: string
    [key: string]: any
  }>
}

async function getJupiterSwapIx(quote: any, vault: PublicKey): Promise<JupiterSwapInstructionsResp> {
  const res = await fetch(SWAP_IX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: vault.toBase58(),
      wrapAndUnwrapSol: false, // we wrap manually below
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })
  if (!res.ok) throw new Error(`Jupiter swap-instructions failed: ${await res.text()}`)
  const body = (await res.json()) as JupiterSwapInstructionsResp
  if (!body.swapInstruction) throw new Error('Jupiter response missing swapInstruction')
  return body
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const { pot: potPda } = parseArgs()
  const wallet = loadKeypair()
  const connection = new Connection(DEVNET_RPC, 'confirmed')

  console.log('Authority:', wallet.publicKey.toBase58())
  console.log('Pot     :', potPda.toBase58())

  // Derive vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), potPda.toBuffer()],
    PROGRAM_ID,
  )
  console.log('Vault   :', vaultPda.toBase58())

  // Sanity: vault has minimum SOL.
  const vaultLamports = (await connection.getAccountInfo(vaultPda))?.lamports ?? 0
  if (vaultLamports < MIN_VAULT_LAMPORTS) {
    console.error(
      `\nVault has only ${vaultLamports} lamports. Top it up first:\n` +
      `  solana transfer ${vaultPda.toBase58()} 0.1 --url devnet --allow-unfunded-recipient\n`,
    )
    process.exit(1)
  }

  // Load program via IDL
  const idlPath = path.join(__dirname, '..', 'packages', 'program', 'target', 'idl', 'pot_vault.json')
  if (!fs.existsSync(idlPath)) {
    console.error(`IDL not found at ${idlPath}. Run \`anchor build\` first.`)
    process.exit(1)
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as Idl
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' })
  const program = new Program({ ...idl, address: PROGRAM_ID.toBase58() } as Idl, provider) as any

  // Read pot to find next strategy slot
  const potAcc: any = await program.account.potAccount.fetch(potPda)
  const slotId: number = potAcc.strategyCount ?? 0
  console.log('Slot id :', slotId)

  const slotBuf = Buffer.alloc(2)
  slotBuf.writeUInt16LE(slotId, 0)
  const [strategyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('strategy'), potPda.toBuffer(), slotBuf],
    PROGRAM_ID,
  )

  // 1) create_strategy (idempotent: if account exists, skip)
  const strategyExists = (await connection.getAccountInfo(strategyPda)) !== null
  if (!strategyExists) {
    console.log('\n[1/4] create_strategy...')
    const sig = await program.methods
      .createStrategy({
        slotId,
        source: { adminDirect: { admin: wallet.publicKey } },
        inputMint: NATIVE_MINT,
        outputMint: USDC_DEVNET,
        pythPriceFeed: null,
        stopLossBps: null,
        takeProfitBps: null,
        trailingStopBps: null,
        yieldTarget: { none: {} },
      })
      .accounts({
        pot: potPda,
        strategy: strategyPda,
        payer: wallet.publicKey,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: 'confirmed' })
    console.log('  ok:', explorerTx(sig))
  } else {
    console.log('\n[1/4] strategy already exists — skipping create_strategy')
  }

  // 2) ensure vault wSOL ATA + USDC ATA, wrap 0.01 SOL into wSOL
  console.log('\n[2/4] preparing vault ATAs + wrapping SOL...')
  const vaultWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, vaultPda, true)
  const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_DEVNET, vaultPda, true)

  const setupIxs = [
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      vaultWsolAta,
      vaultPda,
      NATIVE_MINT,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      vaultUsdcAta,
      vaultPda,
      USDC_DEVNET,
    ),
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: vaultWsolAta,
      lamports: SWAP_LAMPORTS,
    }),
    createSyncNativeInstruction(vaultWsolAta),
  ]

  const { Transaction, sendAndConfirmTransaction } = await import('@solana/web3.js')
  const setupTx = new Transaction().add(...setupIxs)
  const setupSig = await sendAndConfirmTransaction(connection, setupTx, [wallet], { commitment: 'confirmed' })
  console.log('  setup tx:', explorerTx(setupSig))

  // 3) Jupiter quote + instructions
  console.log('\n[3/4] Jupiter quote...')
  const quote = await getJupiterQuote(SWAP_LAMPORTS)
  console.log(`  out (USDC): ${Number(quote.outAmount) / 1e6}`)
  console.log(`  threshold : ${Number(quote.otherAmountThreshold) / 1e6}`)

  const swapResp = await getJupiterSwapIx(quote, vaultPda)
  const ixData = Buffer.from(swapResp.swapInstruction.data, 'base64')
  const remainingAccounts = swapResp.swapInstruction.accounts.map((a) => ({
    pubkey: new PublicKey(a.pubkey),
    isSigner: a.isSigner,
    isWritable: a.isWritable,
  }))
  const minOut = new BN(quote.otherAmountThreshold)

  // 4) execute_swap
  console.log('\n[4/4] execute_swap (AdminDirect)...')
  const swapSig = await program.methods
    .executeSwap({
      mode: { adminDirect: {} },
      amountIn: new BN(SWAP_LAMPORTS),
      minOut,
      maxIn: new BN(SWAP_LAMPORTS),
      isEntry: true,
      jupiterIxData: Array.from(ixData),
    })
    .accounts({
      pot: potPda,
      strategy: strategyPda,
      vault: vaultPda,
      sourceAta: vaultWsolAta,
      destinationAta: vaultUsdcAta,
      jupiterProgram: JUPITER_V6,
      pythPriceUpdate: PROGRAM_ID, // sentinel for AdminDirect
      authority: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .rpc({ commitment: 'confirmed' })

  console.log('\n✅ Swap executed.')
  console.log('   ', explorerTx(swapSig))
}

main().catch((err) => {
  console.error('\nERROR:', err?.message ?? err)
  if (err?.logs) {
    console.error('\nProgram logs:')
    for (const l of err.logs) console.error(' ', l)
  }
  process.exit(1)
})
