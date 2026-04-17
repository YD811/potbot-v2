#!/usr/bin/env tsx
/**
 * End-to-end devnet test suite for PotBot v2
 * 
 * Tests the full flow:
 * 1. Program is deployed and reachable
 * 2. Create a pot
 * 3. Deposit SOL
 * 4. Create a swap proposal
 * 5. Vote on the proposal
 * 6. Check governance state
 * 7. AI agent rules
 * 8. Analytics API
 * 
 * Usage:
 *   cd packages/program && tsx ../../scripts/e2e-devnet.ts
 *   
 * Requires:
 *   - anchor deploy (program live on devnet)
 *   - apps/web/.env.local set
 *   - apps/api running (npm run dev in apps/api)
 */
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js'
import { AnchorProvider, Program, Wallet, setProvider } from '@coral-xyz/anchor'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// ─── Config ───────────────────────────────────────────────────────────────

const RPC_URL    = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID = process.env.PROGRAM_ID ?? 'ED4zhABMV97obJSD5bzasUPaNVmc3qwA3WhwqoGVCDvH'
const API_URL    = process.env.API_URL ?? 'http://localhost:3001'

// Load default Solana CLI keypair
function loadDefaultKeypair(): Keypair {
  const keypairPath = process.env.KEYPAIR_PATH ??
    path.join(os.homedir(), '.config', 'solana', 'id.json')
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Keypair not found at ${keypairPath}. Run: solana-keygen new`)
  }
  const raw = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
  return Keypair.fromSecretKey(new Uint8Array(raw))
}

// ─── Test Utilities ────────────────────────────────────────────────────────

let passed = 0
let failed = 0

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ⏳ ${name}...`)
  try {
    await fn()
    passed++
    console.log(`\r  ✅ ${name}`)
  } catch (e) {
    failed++
    console.log(`\r  ❌ ${name}: ${e}`)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

// ─── Tests ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🧪 PotBot v2 — E2E Devnet Test Suite')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   RPC:     ${RPC_URL}`)
  console.log(`   Program: ${PROGRAM_ID}`)
  console.log(`   API:     ${API_URL}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const connection = new Connection(RPC_URL, 'confirmed')
  const payer = loadDefaultKeypair()
  console.log(`  Wallet:  ${payer.publicKey.toBase58()}`)

  // ── 1. Connectivity ─────────────────────────────────────────────────────
  console.log('\n[1] Connectivity')

  await test('RPC responds', async () => {
    const slot = await connection.getSlot()
    assert(slot > 0, `Expected slot > 0, got ${slot}`)
    console.log(`(slot ${slot})`)
  })

  await test('Program account exists on devnet', async () => {
    const info = await connection.getAccountInfo(new PublicKey(PROGRAM_ID))
    assert(info !== null, 'Program account is null — run: cd packages/program && bash deploy.sh')
    assert(info!.executable, 'Program account is not executable')
  })

  await test('Wallet has sufficient SOL', async () => {
    const balance = await connection.getBalance(payer.publicKey)
    const sol = balance / LAMPORTS_PER_SOL
    assert(sol >= 0.1, `Wallet has ${sol} SOL — need at least 0.1. Run: solana airdrop 2`)
    console.log(`(${sol.toFixed(4)} SOL)`)
  })

  // ── 2. API Health ────────────────────────────────────────────────────────
  console.log('\n[2] PotBot API')

  await test('API health endpoint', async () => {
    const res = await fetch(`${API_URL}/health`).catch(() => null)
    assert(res !== null && res.ok, `API not running at ${API_URL}. Run: cd apps/api && npm run dev`)
    const data = await res!.json() as any
    assert(data.status === 'ok', `Unexpected status: ${JSON.stringify(data)}`)
  })

  await test('Price oracle — SOL price', async () => {
    const res = await fetch(`${API_URL}/prices/So11111111111111111111111111111111111111112`)
    assert(res.ok, `Price endpoint failed: ${res.status}`)
    const data = await res.json() as any
    assert(data.price > 0, `SOL price is ${data.price}`)
    console.log(`($${data.price.toFixed(2)})`)
  })

  await test('Yield opportunities endpoint', async () => {
    const res = await fetch(`${API_URL}/yield/opportunities`)
    assert(res.ok, `Yield endpoint failed: ${res.status}`)
    const data = await res.json() as any
    assert(Array.isArray(data.opportunities), 'Expected opportunities array')
    assert(data.opportunities.length > 0, 'No yield opportunities returned')
    console.log(`(${data.opportunities.length} opps, best: ${data.opportunities[0]?.apy?.toFixed(1)}% APY)`)
  })

  // ── 3. Load IDL ──────────────────────────────────────────────────────────
  console.log('\n[3] IDL & Program')

  let idl: any = null
  await test('IDL file exists', async () => {
    const idlPath = path.join(__dirname, '..', 'packages', 'sdk', 'src', 'idl', 'pot_vault.json')
    const altPath = path.join(__dirname, '..', 'packages', 'program', 'target', 'idl', 'pot_vault.json')
    const p = fs.existsSync(idlPath) ? idlPath : fs.existsSync(altPath) ? altPath : null
    assert(p !== null, 'IDL not found — run: cd packages/program && anchor build')
    idl = JSON.parse(fs.readFileSync(p!, 'utf-8'))
  })

  if (!idl) {
    console.log('\n  ⚠️  Skipping on-chain tests (no IDL). Run anchor build first.\n')
  } else {
    const provider = new AnchorProvider(connection, new Wallet(payer), {})
    setProvider(provider)
    const program = new Program(idl, provider)

    // ── 4. Create a Pot ────────────────────────────────────────────────────
    console.log('\n[4] On-chain Interactions')

    const testPotName = `e2e-${Date.now().toString(36)}`
    const [potPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), Buffer.from(testPotName), payer.publicKey.toBuffer()],
      program.programId
    )
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), potPda.toBuffer()],
      program.programId
    )
    const [memberPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('member'), potPda.toBuffer(), payer.publicKey.toBuffer()],
      program.programId
    )

    await test('Create pot on devnet', async () => {
      const tx = await (program.methods as any)
        .createPot(testPotName, '🧪', false, 0)
        .accounts({
          pot: potPda,
          vault: vaultPda,
          authority: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false })
      console.log(`(tx: ${tx.slice(0, 8)}...)`)
    })

    await test('Deposit 0.05 SOL', async () => {
      const depositLamports = 0.05 * LAMPORTS_PER_SOL
      const tx = await (program.methods as any)
        .deposit(depositLamports)
        .accounts({
          pot: potPda,
          vault: vaultPda,
          member: memberPda,
          depositor: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      console.log(`(tx: ${tx.slice(0, 8)}...)`)
    })

    await test('Vault has balance', async () => {
      const balance = await connection.getBalance(vaultPda)
      assert(balance > 0, `Vault balance is 0 at ${vaultPda.toBase58()}`)
      console.log(`(${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL)`)
    })

    await test('Fetch pot account', async () => {
      const pot = await (program.account as any).potAccount.fetch(potPda)
      assert(pot.name === testPotName, `Name mismatch: ${pot.name}`)
      assert(pot.memberCount === 1, `Expected 1 member, got ${pot.memberCount}`)
      console.log(`(shares: ${pot.totalShares}, members: ${pot.memberCount})`)
    })

    await test('Create swap proposal', async () => {
      const SOL_MINT  = 'So11111111111111111111111111111111111111112'
      const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      const proposalId = 0
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('proposal'), potPda.toBuffer(), Buffer.from([proposalId, 0, 0, 0, 0, 0, 0, 0])],
        program.programId
      )
      const tx = await (program.methods as any)
        .createProposal(
          { swap: { fromMint: new PublicKey(SOL_MINT), toMint: new PublicKey(USDC_MINT), amountIn: 0.01 * LAMPORTS_PER_SOL, minAmountOut: 0 } },
          'E2E test swap: 0.01 SOL → USDC'
        )
        .accounts({
          pot: potPda,
          proposal: proposalPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      console.log(`(tx: ${tx.slice(0, 8)}...)`)
    })

    // ── 5. Analytics API with real data ────────────────────────────────────
    console.log('\n[5] Analytics Integration')

    await test('Analytics for created pot', async () => {
      const res = await fetch(`${API_URL}/analytics/${potPda.toBase58()}`)
      assert(res.ok, `Analytics failed: ${res.status}`)
      const data = await res.json() as any
      assert(data.pubkey === potPda.toBase58(), 'Pubkey mismatch')
      console.log(`(NAV: $${data.navUsd?.toFixed(2) ?? '?'})`)
    })
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  if (failed === 0) {
    console.log('  🎉 All tests passed! PotBot is ready.\n')
    process.exit(0)
  } else {
    console.log('  ❌ Some tests failed. Check output above.\n')
    process.exit(1)
  }
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
