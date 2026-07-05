// Index-vault layer (flagship POT-1) — SDK mirror of
// packages/program/programs/pot_vault/src/instructions/index_*.rs
//
// Conventions match client.ts: build*Tx returns an unsigned Transaction for
// the given signer; fetch* returns decoded account state. All amounts are in
// base units of the config's base mint (USDC 1e6) unless noted.

import { BN, Program } from '@coral-xyz/anchor'
import {
  PublicKey, SystemProgram, Transaction, TransactionInstruction, Connection,
} from '@solana/web3.js'
import {
  getStrategyConfigAddress,
  getAllowlistAddress,
  getIndexMintAddress,
  getStrategyPositionAddress,
  getPositionVaultAddress,
  getRedeemRequestAddress,
  getVaultAddress,
  RouteKindId,
} from './pda'

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

export const ROUTE_KIND = {
  hold: { hold: {} },
  kaminoLend: { kaminoLend: {} },
  kaminoLiquidity: { kaminoLiquidity: {} },
  meteoraDlmm: { meteoraDlmm: {} },
} as const
export type RouteKindArg = (typeof ROUTE_KIND)[keyof typeof ROUTE_KIND]

export const TOKEN_CLASS = {
  stable: { stable: {} },
  stakedSol: { stakedSol: {} },
  rwaStock: { rwaStock: {} },
} as const

export interface WeightEntryArg {
  mint: PublicKey
  weightBps: number
  route: RouteKindArg
}

export interface InitStrategyConfigParams {
  keeper: PublicKey
  weights: WeightEntryArg[]
  bandBps: number
  maxSlippageBps: number
  idleBufferBps: number
  tvlCap: BN
  depositMin: BN
  depositMax: BN
  navStalenessSlots: BN
  maxNavDeviationBps: number
  isFlagship: boolean
}

export function getAta(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0]
}

/** Idempotent ATA create instruction — used for the vault's PDA-owned ATAs
 *  and the member payout ATA (kept out of the program for stack budget). */
export function createAtaIdempotentIx(
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
): TransactionInstruction {
  const ata = getAta(mint, owner)
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]), // CreateIdempotent
  })
}

// ── bootstrap ────────────────────────────────────────────────────────────────

export async function buildInitAllowlistTx(
  program: Program<any>,
  authority: PublicKey,
  tokens: { mint: PublicKey; class: any }[],
): Promise<Transaction> {
  const [allowlist] = getAllowlistAddress()
  return await (program as any).methods
    .initAllowlist(tokens)
    .accounts({ allowlist, authority, systemProgram: SystemProgram.programId })
    .transaction()
}

export async function buildSetAllowlistTx(
  program: Program<any>,
  authority: PublicKey,
  tokens: { mint: PublicKey; class: any }[],
): Promise<Transaction> {
  const [allowlist] = getAllowlistAddress()
  return await (program as any).methods
    .setAllowlist(tokens)
    .accounts({ allowlist, authority })
    .transaction()
}

/** Full index bootstrap: init_index_mint + init_strategy_config + the two
 *  vault ATAs (base buffer + index escrow), in one transaction. */
export async function buildInitIndexTx(
  program: Program<any>,
  pot: PublicKey,
  authority: PublicKey,
  baseMint: PublicKey,
  params: InitStrategyConfigParams,
): Promise<Transaction> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [indexMint] = getIndexMintAddress(pot)
  const [allowlist] = getAllowlistAddress()

  const tx = new Transaction()
  tx.add(
    await (program as any).methods
      .initIndexMint()
      .accounts({
        pot, vault, indexMint, authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),
    await (program as any).methods
      .initStrategyConfig(params)
      .accounts({
        pot, config, indexMint, baseMint, allowlist, authority,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),
    createAtaIdempotentIx(authority, baseMint, vault),
    createAtaIdempotentIx(authority, indexMint, vault),
  )
  return tx
}

export async function buildUpdateStrategyConfigTx(
  program: Program<any>,
  pot: PublicKey,
  authority: PublicKey,
  args: Partial<Record<keyof InitStrategyConfigParams, any>>,
): Promise<Transaction> {
  const [config] = getStrategyConfigAddress(pot)
  const [allowlist] = getAllowlistAddress()
  return await (program as any).methods
    .updateStrategyConfig({
      keeper: args.keeper ?? null,
      weights: args.weights ?? null,
      bandBps: args.bandBps ?? null,
      maxSlippageBps: args.maxSlippageBps ?? null,
      idleBufferBps: args.idleBufferBps ?? null,
      tvlCap: args.tvlCap ?? null,
      depositMin: args.depositMin ?? null,
      depositMax: args.depositMax ?? null,
      navStalenessSlots: args.navStalenessSlots ?? null,
      maxNavDeviationBps: args.maxNavDeviationBps ?? null,
    })
    .accounts({ pot, config, allowlist, authority })
    .transaction()
}

export async function buildSetStrategyPausedTx(
  program: Program<any>,
  pot: PublicKey,
  signer: PublicKey,
  paused: boolean,
): Promise<Transaction> {
  const [config] = getStrategyConfigAddress(pot)
  return await (program as any).methods
    .setStrategyPaused(paused)
    .accounts({ pot, config, signer })
    .transaction()
}

// ── user flows ───────────────────────────────────────────────────────────────

/** Deposit base (USDC) → mint iPOT at NAV. Creates the depositor's index ATA
 *  in-program (init_if_needed). */
export async function buildDepositBaseTx(
  program: Program<any>,
  pot: PublicKey,
  depositor: PublicKey,
  baseMint: PublicKey,
  amountBase: BN,
  minSharesOut: BN = new BN(0),
): Promise<Transaction> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [indexMint] = getIndexMintAddress(pot)
  return await (program as any).methods
    .depositBase(amountBase, minSharesOut)
    .accounts({
      pot, config, vault,
      vaultBaseAta: getAta(baseMint, vault),
      indexMint, baseMint,
      depositor,
      depositorBaseAta: getAta(baseMint, depositor),
      depositorIndexAta: getAta(indexMint, depositor),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
}

/** Instant redemption from the idle buffer. Fails with
 *  RedemptionInsufficientVault when the buffer can't cover it — fall back to
 *  buildRequestRedeemTx (the queue). */
export async function buildRedeemInstantTx(
  program: Program<any>,
  pot: PublicKey,
  member: PublicKey,
  baseMint: PublicKey,
  indexAmount: BN,
  minOutBase: BN = new BN(0),
): Promise<Transaction> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [indexMint] = getIndexMintAddress(pot)
  const tx = new Transaction()
  tx.add(
    createAtaIdempotentIx(member, baseMint, member),
    await (program as any).methods
      .redeemInstant(indexAmount, minOutBase)
      .accounts({
        pot, config, vault,
        vaultBaseAta: getAta(baseMint, vault),
        indexMint, baseMint,
        member,
        memberIndexAta: getAta(indexMint, member),
        memberBaseAta: getAta(baseMint, member),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction(),
  )
  return tx
}

/** Queue a redemption (escrows iPOT now, prices at settlement NAV).
 *  Reads next_redeem_id from the config to derive the request PDA. */
export async function buildRequestRedeemTx(
  program: Program<any>,
  pot: PublicKey,
  member: PublicKey,
  indexAmount: BN,
  minOutBase: BN = new BN(0),
): Promise<{ tx: Transaction; request: PublicKey; id: bigint }> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [indexMint] = getIndexMintAddress(pot)
  const cfg: any = await (program as any).account.strategyConfig.fetch(config)
  const id = BigInt(cfg.nextRedeemId.toString())
  const [request] = getRedeemRequestAddress(pot, member, id)
  const tx = await (program as any).methods
    .requestRedeem(indexAmount, minOutBase)
    .accounts({
      pot, config, vault,
      vaultIndexAta: getAta(indexMint, vault),
      indexMint, request, member,
      memberIndexAta: getAta(indexMint, member),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
  return { tx, request, id }
}

/** Permissionless settlement crank. Ensures the member's payout ATA exists
 *  (cranker pays the rent if not). */
export async function buildSettleRedeemTx(
  program: Program<any>,
  pot: PublicKey,
  baseMint: PublicKey,
  request: PublicKey,
  member: PublicKey,
  cranker: PublicKey,
): Promise<Transaction> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [indexMint] = getIndexMintAddress(pot)
  const tx = new Transaction()
  tx.add(
    createAtaIdempotentIx(cranker, baseMint, member),
    await (program as any).methods
      .settleRedeem()
      .accounts({
        pot, config, vault,
        vaultBaseAta: getAta(baseMint, vault),
        vaultIndexAta: getAta(indexMint, vault),
        indexMint, baseMint, request, member,
        memberBaseAta: getAta(baseMint, member),
        cranker,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction(),
  )
  return tx
}

export async function buildCancelRedeemTx(
  program: Program<any>,
  pot: PublicKey,
  request: PublicKey,
  member: PublicKey,
): Promise<Transaction> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [indexMint] = getIndexMintAddress(pot)
  return await (program as any).methods
    .cancelRedeem()
    .accounts({
      pot, config, vault,
      vaultIndexAta: getAta(indexMint, vault),
      request, member,
      memberIndexAta: getAta(indexMint, member),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction()
}

// ── keeper flows ─────────────────────────────────────────────────────────────

export async function buildUpdateNavSnapshotTx(
  program: Program<any>,
  pot: PublicKey,
  keeper: PublicKey,
  valueBase: BN,
): Promise<Transaction> {
  const [config] = getStrategyConfigAddress(pot)
  return await (program as any).methods
    .updateNavSnapshot(valueBase)
    .accounts({ pot, config, keeper })
    .transaction()
}

/** One-time per-leg bootstrap (both steps in one tx). */
export async function buildInitPositionTx(
  program: Program<any>,
  pot: PublicKey,
  keeper: PublicKey,
  baseMint: PublicKey,
  legMint: PublicKey,
  route: RouteKindArg,
  routeId: RouteKindId,
): Promise<Transaction> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [position] = getStrategyPositionAddress(pot, legMint, routeId)
  const [positionVault] = getPositionVaultAddress(pot, legMint, routeId)
  const tx = new Transaction()
  tx.add(
    await (program as any).methods
      .initPosition(route)
      .accounts({
        pot, config, vault, baseMint, legMint, position, keeper,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),
    await (program as any).methods
      .initPositionVault(route)
      .accounts({
        pot, config, vault, baseMint, legMint, positionVault, keeper,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),
  )
  return tx
}

export async function buildDeployToStrategyTx(
  program: Program<any>,
  pot: PublicKey,
  keeper: PublicKey,
  baseMint: PublicKey,
  legMint: PublicKey,
  route: RouteKindArg,
  routeId: RouteKindId,
  amountBase: BN,
): Promise<Transaction> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [allowlist] = getAllowlistAddress()
  const [position] = getStrategyPositionAddress(pot, legMint, routeId)
  const [positionVault] = getPositionVaultAddress(pot, legMint, routeId)
  return await (program as any).methods
    .deployToStrategy(route, amountBase)
    .accounts({
      pot, config, allowlist, vault,
      vaultBaseAta: getAta(baseMint, vault),
      baseMint, legMint, position, positionVault, keeper,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction()
}

export async function buildWithdrawFromStrategyTx(
  program: Program<any>,
  pot: PublicKey,
  keeper: PublicKey,
  baseMint: PublicKey,
  legMint: PublicKey,
  route: RouteKindArg,
  routeId: RouteKindId,
  amountBase: BN,
): Promise<Transaction> {
  const [vault] = getVaultAddress(pot)
  const [config] = getStrategyConfigAddress(pot)
  const [position] = getStrategyPositionAddress(pot, legMint, routeId)
  const [positionVault] = getPositionVaultAddress(pot, legMint, routeId)
  return await (program as any).methods
    .withdrawFromStrategy(route, amountBase)
    .accounts({
      pot, config, vault,
      vaultBaseAta: getAta(baseMint, vault),
      baseMint, legMint, position, positionVault, keeper,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction()
}

// ── reads ────────────────────────────────────────────────────────────────────

export async function fetchStrategyConfig(program: Program<any>, pot: PublicKey) {
  const [config] = getStrategyConfigAddress(pot)
  return await (program as any).account.strategyConfig.fetchNullable(config)
}

export async function fetchAllowlist(program: Program<any>) {
  const [allowlist] = getAllowlistAddress()
  return await (program as any).account.tokenAllowlist.fetchNullable(allowlist)
}

export async function fetchPositions(program: Program<any>, pot: PublicKey) {
  const all = await (program as any).account.strategyPosition.all([
    { memcmp: { offset: 8, bytes: pot.toBase58() } },
  ])
  return all
}

export async function fetchPendingRedeems(program: Program<any>, pot: PublicKey) {
  const all = await (program as any).account.redeemRequest.all([
    { memcmp: { offset: 8, bytes: pot.toBase58() } },
  ])
  return all.filter((r: any) => 'pending' in r.account.status)
}

/** NAV per share ×1e6 (base units per 1e6 index units), from the on-chain
 *  snapshot + live index supply. Returns null before the first snapshot. */
export async function getNavPerShare(
  program: Program<any>,
  connection: Connection,
  pot: PublicKey,
): Promise<{ navBase: bigint; supply: bigint; pricePerShareE6: bigint } | null> {
  const p: any = await (program as any).account.potAccount.fetch(pot)
  if (!p.navSnapshot) return null
  const [indexMint] = getIndexMintAddress(pot)
  const supplyInfo = await connection.getTokenSupply(indexMint)
  const supply = BigInt(supplyInfo.value.amount)
  const navBase = BigInt(p.navSnapshot.valueBase.toString())
  if (supply === 0n) return { navBase, supply, pricePerShareE6: 1_000_000n }
  return { navBase, supply, pricePerShareE6: (navBase * 1_000_000n) / supply }
}

/** Book-value NAV in base units: idle buffer + Σ position cost bases.
 *  The keeper uses this until protocol adapters land (receipts are at book),
 *  then swaps in market pricing per route. */
export async function computeBookNav(
  program: Program<any>,
  connection: Connection,
  pot: PublicKey,
  baseMint: PublicKey,
): Promise<bigint> {
  const [vault] = getVaultAddress(pot)
  const vaultBaseAta = getAta(baseMint, vault)
  let idle = 0n
  try {
    const bal = await connection.getTokenAccountBalance(vaultBaseAta)
    idle = BigInt(bal.value.amount)
  } catch {
    // ATA not created yet → zero idle
  }
  const positions = await fetchPositions(program, pot)
  const deployed = positions.reduce(
    (acc: bigint, p: any) => acc + BigInt(p.account.deployedBase.toString()),
    0n,
  )
  return idle + deployed
}
