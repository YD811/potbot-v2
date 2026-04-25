#!/usr/bin/env tsx
/**
 * PotBot v2 — Smoke Test (devnet)
 *
 * Tests the full strategy lifecycle on Anchor program:
 *   create_pot → set_allowed_mints → create_strategy (AdminDirect) →
 *   execute_swap (entry) → verify Active → execute_swap (exit) → verify Closed
 *
 * Usage:
 *   cd ~/potbot-v2-fix-deploy
 *   ts-node scripts/smoke_test.ts
 *
 * Prerequisites:
 *   - ~/.config/solana/id.json keypair with ≥ 0.1 SOL on devnet
 *   - npm i @coral-xyz/anchor @solana/web3.js @solana/spl-token node-fetch
 *   - IDL built (anchor build) or manual IDL placed in packages/sdk/src/idl/pot_vault.json
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  AccountMeta,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// ── Constants ─────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(
  "GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK"
);
const JUPITER_V6 = new PublicKey(
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
);
const DEVNET_RPC = "https://api.devnet.solana.com";
const JUP_QUOTE_URL = "https://quote-api.jup.ag/v6";

// Devnet USDC (Circle-issued test token on devnet)
const USDC_MINT = new PublicKey(
  "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
);
// wSOL is the canonical devnet input mint for SOL swaps
const SOL_MINT = NATIVE_MINT; // So11111111111111111111111111111111111111112

// Smoke-test parameters
const POT_NAME = "TestPot";
const FEE_BPS = 100; // 1%
const STRATEGY_SLOT_ID = 0;
const ENTRY_AMOUNT_SOL = 0.01; // 0.01 SOL = 10_000_000 lamports
const ENTRY_LAMPORTS = Math.floor(ENTRY_AMOUNT_SOL * 1e9);
const MAX_SLIPPAGE_BPS = 500; // 5%

// ── IDL (inline subset for smoke test — replace with full IDL when available) ─

// NOTE: Replace this with the full IDL from packages/sdk/src/idl/pot_vault.json
// once it's generated/built. This inline version has just enough to run the test.
const IDL_PATH = path.resolve(
  __dirname,
  "../packages/sdk/src/idl/pot_vault.json"
);

// ── PDA helpers ───────────────────────────────────────────────────────────────

function getPotPda(name: string, authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("pot"),
      Buffer.from(name, "utf8"),
      authority.toBuffer(),
    ],
    PROGRAM_ID
  );
}

function getVaultPda(pot: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), pot.toBuffer()],
    PROGRAM_ID
  );
}

function getStrategyPda(
  pot: PublicKey,
  slotId: number
): [PublicKey, number] {
  const slotBuf = Buffer.alloc(2);
  slotBuf.writeUInt16LE(slotId, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("strategy"), pot.toBuffer(), slotBuf],
    PROGRAM_ID
  );
}

// ── Jupiter helpers ───────────────────────────────────────────────────────────

async function jupiterQuote(
  inputMint: PublicKey,
  outputMint: PublicKey,
  amountLamports: number,
  userPublicKey: PublicKey
): Promise<{ outAmount: number; swapTransaction: string; quoteResponse: any }> {
  const quoteResp = await fetch(
    `${JUP_QUOTE_URL}/quote?` +
      new URLSearchParams({
        inputMint: inputMint.toBase58(),
        outputMint: outputMint.toBase58(),
        amount: amountLamports.toString(),
        slippageBps: MAX_SLIPPAGE_BPS.toString(),
        onlyDirectRoutes: "false",
      })
  );
  if (!quoteResp.ok) {
    const err = await quoteResp.text();
    throw new Error(`Jupiter /quote failed: ${err}`);
  }
  const quoteResponse = await quoteResp.json();

  // Get swap instructions (not the bundled tx — we need raw ix data + accounts)
  const swapIxResp = await fetch(`${JUP_QUOTE_URL}/swap-instructions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: userPublicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
  });
  if (!swapIxResp.ok) {
    const err = await swapIxResp.text();
    throw new Error(`Jupiter /swap-instructions failed: ${err}`);
  }
  const swapIxData = await swapIxResp.json();

  return {
    outAmount: Number(quoteResponse.outAmount),
    quoteResponse,
    swapTransaction: JSON.stringify(swapIxData), // raw instructions payload
  };
}

// Decode Jupiter /swap-instructions response into AccountMeta[] + ixData Buffer
function decodeJupiterIx(swapIxPayload: any): {
  accounts: AccountMeta[];
  data: Buffer;
} {
  const ix = swapIxPayload.swapInstruction;
  const accounts: AccountMeta[] = (ix.accounts as any[]).map((a: any) => ({
    pubkey: new PublicKey(a.pubkey),
    isSigner: a.isSigner,
    isWritable: a.isWritable,
  }));
  return {
    accounts,
    data: Buffer.from(ix.data, "base64"),
  };
}

// ── Logging helpers ───────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[smoke] ${msg}`);
}
function ok(msg: string) {
  console.log(`  ✅ ${msg}`);
}
function fail(msg: string) {
  console.error(`  ❌ ${msg}`);
  process.exit(1);
}
function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🫙  PotBot v2 — Smoke Test (devnet)\n");

  // ── 0. Setup ──────────────────────────────────────────────────────────────

  section("0. Setup");

  const keypairPath =
    process.env.KEYPAIR ||
    path.join(process.env.HOME!, ".config/solana/id.json");
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(raw));
  log(`Wallet: ${wallet.publicKey.toBase58()}`);

  const connection = new Connection(DEVNET_RPC, "confirmed");
  const balance = await connection.getBalance(wallet.publicKey);
  log(`Balance: ${(balance / 1e9).toFixed(4)} SOL`);
  if (balance < 0.05 * 1e9) {
    fail(
      "Insufficient balance — need ≥ 0.05 SOL. Run: solana airdrop 1 --url devnet"
    );
  }

  // Load IDL
  let idl: any;
  if (fs.existsSync(IDL_PATH)) {
    idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
    log(`IDL loaded from ${IDL_PATH}`);
  } else {
    fail(
      `IDL not found at ${IDL_PATH}. ` +
        `Run 'anchor build' or place the manual IDL there first.`
    );
    return;
  }

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed", skipPreflight: false }
  );
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  // Derive PDAs
  const [potPda] = getPotPda(POT_NAME, wallet.publicKey);
  const [vaultPda, vaultBump] = getVaultPda(potPda);
  const [strategyPda] = getStrategyPda(potPda, STRATEGY_SLOT_ID);

  log(`Pot PDA:      ${potPda.toBase58()}`);
  log(`Vault PDA:    ${vaultPda.toBase58()}`);
  log(`Strategy PDA: ${strategyPda.toBase58()}`);

  // Derive vault token accounts
  const vaultSolAta = getAssociatedTokenAddressSync(SOL_MINT, vaultPda, true);
  const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, vaultPda, true);

  // ── 1. create_pot ─────────────────────────────────────────────────────────

  section("1. create_pot");

  try {
    // Check if pot already exists (idempotent re-run)
    const potInfo = await connection.getAccountInfo(potPda);
    if (potInfo) {
      log("Pot already exists — skipping create_pot");
    } else {
      const txSig = await program.methods
        .createPot({
          name: POT_NAME,
          feeBps: FEE_BPS,
          isPublic: true,
          maxMembers: 50,
        })
        .accounts({
          pot: potPda,
          vault: vaultPda,
          authority: wallet.publicKey,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      log(`tx: ${txSig}`);
      log(`https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
      ok(`Pot created: ${potPda.toBase58()}`);
    }
  } catch (e: any) {
    fail(`create_pot failed: ${e.message}`);
  }

  // ── 2. set_allowed_mints ─────────────────────────────────────────────────

  section("2. set_allowed_mints");

  try {
    const txSig = await program.methods
      .setAllowedMints({
        mints: [SOL_MINT, USDC_MINT],
      })
      .accounts({
        pot: potPda,
        authority: wallet.publicKey,
      })
      .rpc();
    log(`tx: ${txSig}`);
    ok(`Allowlist set: SOL + USDC`);
  } catch (e: any) {
    // If pot already had mints set from prior run, tolerate gracefully
    if (
      e.message.includes("AlreadySet") ||
      e.message.includes("has one constraint")
    ) {
      log("Mints already set — skipping");
    } else {
      fail(`set_allowed_mints failed: ${e.message}`);
    }
  }

  // ── 3. create_strategy (AdminDirect, slot_id=0, SOL→USDC) ───────────────

  section("3. create_strategy");

  try {
    const stratInfo = await connection.getAccountInfo(strategyPda);
    if (stratInfo) {
      log("Strategy slot 0 already exists — skipping create_strategy");
    } else {
      const txSig = await program.methods
        .createStrategy({
          slotId: STRATEGY_SLOT_ID,
          source: {
            adminDirect: { admin: wallet.publicKey },
          },
          inputMint: SOL_MINT,
          outputMint: USDC_MINT,
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
        .rpc();
      log(`tx: ${txSig}`);
      ok(`Strategy created (Pending) at slot ${STRATEGY_SLOT_ID}`);
    }
  } catch (e: any) {
    fail(`create_strategy failed: ${e.message}`);
  }

  // Verify strategy.status == Pending before entry
  {
    const strat = await program.account.strategyAccount.fetch(strategyPda);
    if (!strat.status.pending) {
      fail(`Expected status=Pending before entry, got: ${JSON.stringify(strat.status)}`);
    }
    ok("strategy.status == Pending ✓");
  }

  // ── 4. execute_swap (AdminDirect, entry=true, SOL→USDC) ─────────────────

  section("4. execute_swap — entry (SOL→USDC)");

  // Ensure vault has wSOL ATA + funded
  {
    const ataIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      vaultSolAta,
      vaultPda,
      SOL_MINT
    );
    const usdcAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      vaultUsdcAta,
      vaultPda,
      USDC_MINT
    );

    // Fund the vault wSOL account by wrapping SOL
    // Transfer SOL → wSOL ATA (Jupiter handles unwrap via its own logic)
    const tx = new Transaction().add(ataIx, usdcAtaIx);
    await provider.sendAndConfirm(tx, [], { skipPreflight: true });
    log("Vault ATAs ensured");

    // Transfer ENTRY_LAMPORTS to vault wSOL account
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: vaultSolAta,
        lamports: ENTRY_LAMPORTS,
      }),
      // Sync native (wrap SOL into wSOL)
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [{ pubkey: vaultSolAta, isSigner: false, isWritable: true }],
        data: Buffer.from([17]), // SyncNative discriminant
      })
    );
    await provider.sendAndConfirm(fundTx, [], { skipPreflight: true });
    ok(`Funded vault wSOL ATA with ${ENTRY_AMOUNT_SOL} SOL`);
  }

  let usdcReceived = 0;

  try {
    log(`Fetching Jupiter quote: ${ENTRY_AMOUNT_SOL} SOL → USDC ...`);
    const { outAmount, swapTransaction } = await jupiterQuote(
      SOL_MINT,
      USDC_MINT,
      ENTRY_LAMPORTS,
      vaultPda // the vault PDA is the "user" in Jupiter's eyes
    );
    log(`Jupiter quote: ${(outAmount / 1e6).toFixed(4)} USDC out`);

    const swapIxPayload = JSON.parse(swapTransaction);
    const { accounts: jupAccounts, data: jupData } =
      decodeJupiterIx(swapIxPayload);

    const minOut = Math.floor(outAmount * (1 - MAX_SLIPPAGE_BPS / 10000));

    const txSig = await program.methods
      .executeSwap({
        mode: { adminDirect: {} },
        amountIn: new anchor.BN(ENTRY_LAMPORTS),
        minOut: new anchor.BN(minOut),
        maxIn: new anchor.BN(ENTRY_LAMPORTS),
        isEntry: true,
        jupiterIxData: Array.from(jupData),
      })
      .accounts({
        pot: potPda,
        strategy: strategyPda,
        vault: vaultPda,
        sourceAta: vaultSolAta,
        destinationAta: vaultUsdcAta,
        jupiterProgram: JUPITER_V6,
        pythPriceUpdate: PROGRAM_ID, // sentinel for AdminDirect (not read)
        proposalSwapSpec: null,
        authority: wallet.publicKey,
      })
      .remainingAccounts(jupAccounts)
      .rpc();

    log(`tx: ${txSig}`);
    log(`https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
    usdcReceived = outAmount;
    ok(`Entry swap executed — ${(outAmount / 1e6).toFixed(4)} USDC received`);
  } catch (e: any) {
    fail(`execute_swap (entry) failed: ${e.message}`);
  }

  // ── 5. Verify strategy.status == Active, balance_diff > 0 ───────────────

  section("5. Verify post-entry state");

  {
    const strat = await program.account.strategyAccount.fetch(strategyPda);
    if (!strat.status.active) {
      fail(
        `Expected status=Active after entry, got: ${JSON.stringify(strat.status)}`
      );
    }
    ok("strategy.status == Active ✓");

    const sizeOut = strat.sizeOut.toNumber();
    if (sizeOut === 0) {
      fail("strategy.size_out == 0 — entry swap not recorded");
    }
    ok(`strategy.size_out == ${sizeOut} (${(sizeOut / 1e6).toFixed(4)} USDC) ✓`);

    const sizeIn = strat.sizeIn.toNumber();
    if (sizeIn === 0) {
      fail("strategy.size_in == 0");
    }
    ok(`strategy.size_in == ${sizeIn} lamports ✓`);

    // Check USDC balance
    const usdcBalance = await connection.getTokenAccountBalance(vaultUsdcAta);
    const usdcAmount = Number(usdcBalance.value.amount);
    if (usdcAmount === 0) {
      fail("Vault USDC balance is 0 after entry swap");
    }
    ok(`Vault USDC balance: ${(usdcAmount / 1e6).toFixed(4)} USDC ✓`);
  }

  // ── 6. execute_swap (AdminDirect, exit=true, USDC→SOL) ───────────────────

  section("6. execute_swap — exit (USDC→SOL)");

  {
    const strat = await program.account.strategyAccount.fetch(strategyPda);
    const usdcToSell = strat.sizeOut.toNumber();

    try {
      log(`Fetching Jupiter quote: ${(usdcToSell / 1e6).toFixed(4)} USDC → SOL ...`);
      const { outAmount, swapTransaction } = await jupiterQuote(
        USDC_MINT,
        SOL_MINT,
        usdcToSell,
        vaultPda
      );
      log(`Jupiter quote: ${(outAmount / 1e9).toFixed(6)} SOL out`);

      const swapIxPayload = JSON.parse(swapTransaction);
      const { accounts: jupAccounts, data: jupData } =
        decodeJupiterIx(swapIxPayload);

      const minOut = Math.floor(outAmount * (1 - MAX_SLIPPAGE_BPS / 10000));

      const txSig = await program.methods
        .executeSwap({
          mode: { adminDirect: {} },
          amountIn: new anchor.BN(usdcToSell),
          minOut: new anchor.BN(minOut),
          maxIn: new anchor.BN(usdcToSell),
          isEntry: false, // EXIT
          jupiterIxData: Array.from(jupData),
        })
        .accounts({
          pot: potPda,
          strategy: strategyPda,
          vault: vaultPda,
          sourceAta: vaultUsdcAta,   // source = USDC on exit
          destinationAta: vaultSolAta, // destination = wSOL on exit
          jupiterProgram: JUPITER_V6,
          pythPriceUpdate: PROGRAM_ID,
          proposalSwapSpec: null,
          authority: wallet.publicKey,
        })
        .remainingAccounts(jupAccounts)
        .rpc();

      log(`tx: ${txSig}`);
      log(`https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
      ok(`Exit swap executed — ${(outAmount / 1e9).toFixed(6)} SOL received back`);
    } catch (e: any) {
      fail(`execute_swap (exit) failed: ${e.message}`);
    }
  }

  // ── 7. Verify strategy.status == Closed ───────────────────────────────────

  section("7. Verify post-exit state");

  {
    const strat = await program.account.strategyAccount.fetch(strategyPda);
    if (!strat.status.closed) {
      fail(
        `Expected status=Closed after exit, got: ${JSON.stringify(strat.status)}`
      );
    }
    ok("strategy.status == Closed ✓");

    const closedAt = strat.closedAt.toNumber();
    if (closedAt === 0) {
      fail("strategy.closed_at == 0 — exit not recorded");
    }
    ok(`strategy.closed_at == ${closedAt} ✓`);

    const nonce = strat.executorNonce;
    if (nonce < 2) {
      fail(`strategy.executor_nonce == ${nonce}, expected ≥ 2`);
    }
    ok(`strategy.executor_nonce == ${nonce} (entry + exit) ✓`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("  🫙  ALL SMOKE TESTS PASSED");
  console.log("═".repeat(60));
  console.log(`  Pot:      ${potPda.toBase58()}`);
  console.log(`  Strategy: ${strategyPda.toBase58()}`);
  console.log(`  Network:  devnet`);
  console.log("═".repeat(60) + "\n");
}

main().catch((e) => {
  console.error("\n❌ Smoke test crashed:", e);
  process.exit(1);
});
