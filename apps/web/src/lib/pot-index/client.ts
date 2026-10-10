/**
 * pot_index client — PotBot Portfolios (Crypto World's Fair 2026).
 *
 * Thin, explicit wrapper over the Anchor program: PDAs, account reads, instruction builders.
 * Transactions that need prices post fresh Pyth updates in the same transaction (see pyth-post.ts).
 */
import { AnchorProvider, BN, EventParser, Program, type Idl, type Wallet } from '@coral-xyz/anchor'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import idl from './idl.json'

export const POT_INDEX_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_POT_INDEX_PROGRAM_ID ?? (idl as { address: string }).address,
)

export const CONFIG_SEED = Buffer.from('config')
export const ASSET_SEED = Buffer.from('asset')
export const POT_SEED = Buffer.from('pot')
export const CASH_LEG = 255

export const ENTRY_FEE_BPS = 30
export const EXIT_FEE_BPS = 50
export const INDEX_DECIMALS = 6
export const MIN_DEPOSIT_USDC = 1

/** Registered asset as the UI knows it (mirrors on-chain AssetConfig + display data). */
export interface AssetInfo {
  symbol: string
  name: string
  mint: string
  decimals: number
  feedId: string // 0x-prefixed Pyth feed id
  logo?: string
}

export interface LegView {
  mint: PublicKey
  vault: PublicKey
  feedId: string
  weightBps: number
  decimals: number
}

export interface PotView {
  address: PublicKey
  creator: PublicKey
  indexMint: PublicKey
  cashVault: PublicKey
  name: string
  symbol: string
  legs: LegView[]
  finalized: boolean
  paused: boolean
  depositCapUsd: number // micro-USD
  slippageBps: number
  maxTradeBps: number
  totalDepositsUsd: number
  totalExitsUsd: number
  createdAt: number
}

export function configPda(): PublicKey {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], POT_INDEX_PROGRAM_ID)[0]
}
export function assetPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([ASSET_SEED, mint.toBuffer()], POT_INDEX_PROGRAM_ID)[0]
}
export function potPda(indexMint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([POT_SEED, indexMint.toBuffer()], POT_INDEX_PROGRAM_ID)[0]
}
export function ata(owner: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, true)
}

export function feedIdToBytes(hex: string): number[] {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  return Array.from(Buffer.from(clean, 'hex'))
}
export function bytesToFeedId(bytes: number[] | Uint8Array): string {
  return '0x' + Buffer.from(bytes).toString('hex')
}

/** Read-only program (no signer) for fetching accounts. */
export function readonlyProgram(connection: Connection): Program {
  const dummy: Wallet = {
    publicKey: PublicKey.default,
    signTransaction: async <T,>(t: T) => t,
    signAllTransactions: async <T,>(t: T) => t,
  } as unknown as Wallet
  const provider = new AnchorProvider(connection, dummy, { commitment: 'confirmed' })
  return new Program(idl as Idl, provider)
}

export function makePotIndexProgram(connection: Connection, wallet: Wallet): Program {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  return new Program(idl as Idl, provider)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPotView(address: PublicKey, a: any): PotView {
  return {
    address,
    creator: a.creator,
    indexMint: a.indexMint,
    cashVault: a.cashVault,
    name: a.name,
    symbol: a.symbol,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    legs: (a.legs as any[]).map((l) => ({
      mint: l.mint,
      vault: l.vault,
      feedId: bytesToFeedId(l.feedId),
      weightBps: l.weightBps,
      decimals: l.decimals,
    })),
    finalized: a.finalized,
    paused: a.paused,
    depositCapUsd: Number(a.depositCapUsd),
    slippageBps: a.slippageBps,
    maxTradeBps: a.maxTradeBps,
    totalDepositsUsd: Number(a.totalDepositsUsd),
    totalExitsUsd: Number(a.totalExitsUsd),
    createdAt: Number(a.createdAt),
  }
}

export async function fetchPot(connection: Connection, indexMint: PublicKey): Promise<PotView | null> {
  const program = readonlyProgram(connection)
  const address = potPda(indexMint)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acc = await (program.account as any).pot.fetchNullable(address)
  return acc ? toPotView(address, acc) : null
}

export async function fetchAllPots(connection: Connection): Promise<PotView[]> {
  const program = readonlyProgram(connection)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = await (program.account as any).pot.all()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Finalized Pots only. A paused Pot that never took a deposit is retired — keep it off the list.
  return all
    .map((x: any) => toPotView(x.publicKey, x.account))
    .filter((p: PotView) => p.finalized && !(p.paused && p.totalDepositsUsd === 0))
}

export async function fetchConfig(connection: Connection) {
  const program = readonlyProgram(connection)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.account as any).config.fetchNullable(configPda())
}

/** Balances of every leg + cash + index supply, in base units. */
export async function fetchPotBalances(connection: Connection, pot: PotView) {
  const keys = [pot.cashVault, ...pot.legs.map((l) => l.vault), pot.indexMint]
  const infos = await connection.getMultipleAccountsInfo(keys)
  const tokenAmount = (data: Buffer | null) => (data ? Number(data.readBigUInt64LE(64)) : 0)
  const cash = tokenAmount(infos[0]?.data ?? null)
  const legs = pot.legs.map((_, i) => tokenAmount(infos[i + 1]?.data ?? null))
  const mintData = infos[infos.length - 1]?.data
  const supply = mintData ? Number(mintData.readBigUInt64LE(36)) : 0
  return { cash, legs, supply }
}

/** NAV in USD from client-side prices (display only; the program re-prices on-chain). */
export function navUsd(pot: PotView, bal: { cash: number; legs: number[] }, prices: Record<string, number>): number {
  let nav = bal.cash / 1e6
  pot.legs.forEach((l, i) => {
    const p = prices[l.mint.toBase58()] ?? 0
    nav += (bal.legs[i] / 10 ** l.decimals) * p
  })
  return nav
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

export interface CreatePotArgs {
  name: string
  symbol: string
  legs: { mint: PublicKey; weightBps: number }[]
  depositCapUsd?: number // whole USD, 0 = none
  slippageBps?: number
  maxTradeBps?: number
}

/**
 * Build the instructions to create a Pot. Returns the index mint keypair (must co-sign) and the
 * instruction list: create_pot, add_leg × n, finalize_pot. Fits one transaction for ≤ 3 legs;
 * callers chunk with `chunkInstructions` otherwise.
 */
export async function buildCreatePot(
  program: Program,
  creator: PublicKey,
  usdcMint: PublicKey,
  args: CreatePotArgs,
): Promise<{ indexMint: Keypair; instructions: TransactionInstruction[] }> {
  const indexMint = Keypair.generate()
  const pot = potPda(indexMint.publicKey)
  const sum = args.legs.reduce((s, l) => s + l.weightBps, 0)
  if (sum !== 10_000) throw new Error('weights must sum to 10000 bps')

  const create = await program.methods
    .createPot({
      name: args.name,
      symbol: args.symbol,
      depositCapUsd: new BN(Math.round((args.depositCapUsd ?? 0) * 1e6)),
      slippageBps: args.slippageBps ?? 100,
      maxTradeBps: args.maxTradeBps ?? 1000,
    })
    .accounts({
      creator,
      config: configPda(),
      indexMint: indexMint.publicKey,
      pot,
      usdcMint,
      cashVault: ata(pot, usdcMint),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction()

  const legs = await Promise.all(
    args.legs.map((l) =>
      program.methods
        .addLeg(l.weightBps)
        .accounts({
          creator,
          pot,
          asset: assetPda(l.mint),
          mint: l.mint,
          vault: ata(pot, l.mint),
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction(),
    ),
  )
  const finalize = await program.methods.finalizePot().accounts({ creator, pot }).instruction()
  return { indexMint, instructions: [create, ...legs, finalize] }
}

export interface DepositArgs {
  pot: PotView
  user: PublicKey
  usdcMint: PublicKey
  treasury: PublicKey
  amountUsdc: number // whole USDC
  minSharesOut?: number // base units
  referrer?: PublicKey | null
  /** Pyth price update account per leg, in leg order (from pyth-post.ts). */
  priceUpdates: PublicKey[]
}

export async function buildDeposit(program: Program, a: DepositArgs): Promise<TransactionInstruction[]> {
  const { pot, user, usdcMint } = a
  const pre: TransactionInstruction[] = [
    createAssociatedTokenAccountIdempotentInstruction(user, ata(user, pot.indexMint), user, pot.indexMint),
    createAssociatedTokenAccountIdempotentInstruction(user, ata(pot.creator, usdcMint), pot.creator, usdcMint),
    createAssociatedTokenAccountIdempotentInstruction(user, ata(a.treasury, usdcMint), a.treasury, usdcMint),
  ]
  if (a.referrer) {
    pre.push(createAssociatedTokenAccountIdempotentInstruction(user, ata(a.referrer, usdcMint), a.referrer, usdcMint))
  }
  const remaining = pot.legs.flatMap((l, i) => [
    { pubkey: l.vault, isWritable: false, isSigner: false },
    { pubkey: a.priceUpdates[i], isWritable: false, isSigner: false },
  ])
  const ix = await program.methods
    .deposit(new BN(Math.round(a.amountUsdc * 1e6)), new BN(a.minSharesOut ?? 0))
    .accounts({
      user,
      config: configPda(),
      pot: pot.address,
      indexMint: pot.indexMint,
      userIndexAta: ata(user, pot.indexMint),
      usdcMint,
      userUsdc: ata(user, usdcMint),
      cashVault: pot.cashVault,
      creatorUsdc: ata(pot.creator, usdcMint),
      protocolUsdc: ata(a.treasury, usdcMint),
      referrerUsdc: a.referrer ? ata(a.referrer, usdcMint) : null,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as never)
    .remainingAccounts(remaining)
    .instruction()
  return [...pre, ix]
}

export interface ExitArgs {
  pot: PotView
  user: PublicKey
  usdcMint: PublicKey
  shares: number // base units
  minUsdcOut?: number
}

export async function buildExit(program: Program, a: ExitArgs): Promise<TransactionInstruction[]> {
  const { pot, user, usdcMint } = a
  const pre: TransactionInstruction[] = [
    createAssociatedTokenAccountIdempotentInstruction(user, ata(user, usdcMint), user, usdcMint),
    ...pot.legs.map((l) => createAssociatedTokenAccountIdempotentInstruction(user, ata(user, l.mint), user, l.mint)),
  ]
  const remaining = pot.legs.flatMap((l) => [
    { pubkey: l.vault, isWritable: true, isSigner: false },
    { pubkey: ata(user, l.mint), isWritable: true, isSigner: false },
    { pubkey: l.mint, isWritable: false, isSigner: false },
  ])
  const ix = await program.methods
    .exit(new BN(a.shares), new BN(a.minUsdcOut ?? 0))
    .accounts({
      user,
      pot: pot.address,
      indexMint: pot.indexMint,
      userIndexAta: ata(user, pot.indexMint),
      usdcMint,
      cashVault: pot.cashVault,
      userUsdc: ata(user, usdcMint),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remaining)
    .instruction()
  return [...pre, ix]
}

export interface RebalanceArgs {
  pot: PotView
  keeper: PublicKey
  usdcMint: PublicKey
  legOut: number // index or CASH_LEG
  legIn: number
  amountOut: number // base units of the sold leg
  priceUpdates: PublicKey[]
}

/** open + close pair; the caller inserts the swap instruction(s) between them. */
export async function buildRebalancePair(program: Program, a: RebalanceArgs) {
  const { pot, keeper, usdcMint } = a
  const outMint = a.legOut === CASH_LEG ? usdcMint : pot.legs[a.legOut].mint
  const outVault = a.legOut === CASH_LEG ? pot.cashVault : pot.legs[a.legOut].vault
  const inVault = pot.legs[a.legIn].vault
  const remaining = pot.legs.flatMap((l, i) => [
    { pubkey: l.vault, isWritable: false, isSigner: false },
    { pubkey: a.priceUpdates[i], isWritable: false, isSigner: false },
  ])
  const open = await program.methods
    .rebalanceOpen(a.legOut, a.legIn, new BN(a.amountOut))
    .accounts({
      keeper,
      config: configPda(),
      pot: pot.address,
      cashVault: pot.cashVault,
      outVault,
      outMint,
      keeperOutAta: ata(keeper, outMint),
      inVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .remainingAccounts(remaining)
    .instruction()
  const close = await program.methods
    .rebalanceClose()
    .accounts({ keeper, pot: pot.address, inVault })
    .instruction()
  return { open, close }
}

/** Estimate shares for a deposit (mirrors on-chain math; display only). */
export function estimateShares(amountUsdc: number, navUsd: number, supplyBase: number): number {
  const net = amountUsdc * (1 - ENTRY_FEE_BPS / 10_000) * 1e6
  const vs = 1_000_000
  return Math.floor((net * (supplyBase + vs)) / (navUsd * 1e6 + vs))
}

// ---------------------------------------------------------------------------
// Activity feed (program events parsed from transaction logs)
// ---------------------------------------------------------------------------

export type PotEvent =
  | { kind: 'deposit'; sig: string; time: number | null; user: string; amountUsdc: number; feeUsdc: number; shares: number }
  | { kind: 'exit'; sig: string; time: number | null; user: string; shares: number; usdcOut: number }
  | { kind: 'rebalance'; sig: string; time: number | null; keeper: string; legOut: number; legIn: number; amountOut: number; received: number }
  | { kind: 'created'; sig: string; time: number | null }

/** Last `limit` events for a Pot, newest first. Reads the Pot account's transaction history. */
export async function fetchPotActivity(connection: Connection, pot: PotView, limit = 30): Promise<PotEvent[]> {
  const sigs = await connection.getSignaturesForAddress(pot.address, { limit }, 'confirmed')
  if (sigs.length === 0) return []
  const txs = await connection.getParsedTransactions(
    sigs.map((s) => s.signature),
    { maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
  )
  const program = readonlyProgram(connection)
  const parser = new EventParser(program.programId, program.coder)
  const out: PotEvent[] = []
  txs.forEach((tx, i) => {
    const sig = sigs[i].signature
    const time = sigs[i].blockTime ?? null
    if (!tx || tx.meta?.err || !tx.meta?.logMessages) return
    let opened: { keeper: string; legOut: number; legIn: number; amountOut: number } | null = null
    let any = false
    for (const ev of parser.parseLogs(tx.meta.logMessages)) {
      any = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = ev.data as any
      if (ev.name === 'Deposited') {
        out.push({ kind: 'deposit', sig, time, user: d.user.toBase58(), amountUsdc: Number(d.amountUsdc) / 1e6, feeUsdc: Number(d.feeUsdc) / 1e6, shares: Number(d.shares) / 1e6 })
      } else if (ev.name === 'Exited') {
        out.push({ kind: 'exit', sig, time, user: d.user.toBase58(), shares: Number(d.shares) / 1e6, usdcOut: Number(d.usdcOut) / 1e6 })
      } else if (ev.name === 'RebalanceOpened') {
        opened = { keeper: d.keeper.toBase58(), legOut: d.legOut, legIn: d.legIn, amountOut: Number(d.amountOut) }
      } else if (ev.name === 'RebalanceClosed' && opened) {
        out.push({ kind: 'rebalance', sig, time, ...opened, received: Number(d.received) })
        opened = null
      }
    }
    if (!any && i === txs.length - 1) out.push({ kind: 'created', sig, time })
  })
  return out
}
