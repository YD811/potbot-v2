/**
 * Raw Anchor instruction builders for the pot_vault program — trimmed to
 * what the agent cron needs (create_proposal::Swap). Same shape as
 * apps/potbot-mcp/src/anchor.ts, kept local instead of shared so this
 * server can deploy independently.
 *
 * IDL is intentionally NOT used: discriminators are computed from the
 * snake_case names directly, and account layouts are decoded by hand.
 * Resilient to future field appends to the Rust struct.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { createHash } from 'crypto'
import bs58 from 'bs58'

export const POT_VAULT_PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK',
)

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

let _conn: Connection | null = null
export function getConnection(): Connection {
  if (!_conn) _conn = new Connection(RPC_URL, 'confirmed')
  return _conn
}

function ixDiscriminator(snake: string): Buffer {
  return createHash('sha256').update(`global:${snake}`).digest().subarray(0, 8)
}

function accountDiscriminator(pascal: string): Buffer {
  return createHash('sha256').update(`account:${pascal}`).digest().subarray(0, 8)
}

function encodeString(s: string): Buffer {
  const bytes = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(bytes.length, 0)
  return Buffer.concat([len, bytes])
}

// ── PDAs ───────────────────────────────────────────────────────────────────

export function memberPda(pot: PublicKey, member: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('member'), pot.toBuffer(), member.toBuffer()],
    POT_VAULT_PROGRAM_ID,
  )[0]
}

export function vaultPda(pot: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), pot.toBuffer()],
    POT_VAULT_PROGRAM_ID,
  )[0]
}

export function proposalPda(pot: PublicKey, proposalId: bigint): PublicKey {
  const idLe = Buffer.alloc(8)
  idLe.writeBigUInt64LE(proposalId, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), pot.toBuffer(), idLe],
    POT_VAULT_PROGRAM_ID,
  )[0]
}

// ── On-chain reads ────────────────────────────────────────────────────────

export interface PotHeader {
  authority: PublicKey
  name: string
  emoji: string
  totalShares: bigint
  memberCount: number
  nextProposalId: bigint
}

/**
 * Decode the prefix of PotAccount up through next_proposal_id. We need the
 * agent keypair to be the proposer, which means it must be a member —
 * the cron will fail at the on-chain MemberNotFound check if it's not.
 * Layout: see packages/program/programs/pot_vault/src/state/pot.rs
 */
export async function readPotHeader(pot: PublicKey): Promise<PotHeader | null> {
  const conn = getConnection()
  const info = await conn.getAccountInfo(pot)
  if (!info) return null

  const expected = accountDiscriminator('PotAccount')
  if (info.data.length < 8 || !info.data.subarray(0, 8).equals(expected)) return null

  const data = info.data
  let off = 8
  const authority = new PublicKey(data.subarray(off, off + 32)); off += 32
  const nameLen = data.readUInt32LE(off); off += 4
  const name = data.subarray(off, off + nameLen).toString('utf-8'); off += nameLen
  const emojiLen = data.readUInt32LE(off); off += 4
  const emoji = data.subarray(off, off + emojiLen).toString('utf-8'); off += emojiLen
  off += 2 // vault_bump + pot_bump
  const totalShares = data.readBigUInt64LE(off); off += 8
  const memberCount = data.readUInt32LE(off); off += 4
  off += 4 // trade_count
  off += 8 // total_volume
  off += 1 + 8 // tamagotchi_level + tamagotchi_xp
  off += 32 + 32 // community_token_mint + token_mint
  off += 8 // shares_per_sol
  // PotConfig
  off += 1 + 8 + 8 // is_public + min_deposit + lockup_seconds
  off += 1 // yield_strategy enum tag
  off += 2 + 2 + 2 // max_yield_allocation_bps + max_trade_size_bps + max_members
  // GovSettings
  off += 5 // 5 × u8 levels
  off += 8 // vote_timeout_seconds
  off += 2 // quorum_bps
  off += 8 // timelock_seconds
  const nextProposalId = data.readBigUInt64LE(off)

  return { authority, name, emoji, totalShares, memberCount, nextProposalId }
}

// ── Instruction builders ──────────────────────────────────────────────────

export interface CreateSwapProposalArgs {
  pot: PublicKey
  proposer: PublicKey
  proposalId: bigint
  fromMint: PublicKey
  toMint: PublicKey
  amountInLamports: bigint
  minAmountOutLamports: bigint
  description: string
}

export function buildCreateSwapProposalIx(a: CreateSwapProposalArgs): TransactionInstruction {
  const proposal = proposalPda(a.pot, a.proposalId)
  const member = memberPda(a.pot, a.proposer)
  const vault = vaultPda(a.pot)

  const amountIn = Buffer.alloc(8); amountIn.writeBigUInt64LE(a.amountInLamports, 0)
  const minOut = Buffer.alloc(8); minOut.writeBigUInt64LE(a.minAmountOutLamports, 0)

  const data = Buffer.concat([
    ixDiscriminator('create_proposal'),
    Buffer.from([0]),       // ProposalType::Swap variant
    a.fromMint.toBuffer(),
    a.toMint.toBuffer(),
    amountIn,
    minOut,
    encodeString(a.description),
  ])

  return new TransactionInstruction({
    programId: POT_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: a.pot,      isSigner: false, isWritable: true },
      { pubkey: proposal,   isSigner: false, isWritable: true },
      { pubkey: member,     isSigner: false, isWritable: false },
      { pubkey: vault,      isSigner: false, isWritable: false },
      { pubkey: a.proposer, isSigner: true,  isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

// ── Keypair / sending ─────────────────────────────────────────────────────

let _agentKp: Keypair | null = null
let _agentLoaded = false

export function loadAgentKeypair(): Keypair | null {
  if (_agentLoaded) return _agentKp
  _agentLoaded = true

  const raw = process.env.AGENT_KEYPAIR
  if (!raw) return null

  const trimmed = raw.trim()
  try {
    if (trimmed.startsWith('[')) {
      _agentKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed) as number[]))
    } else {
      const secret = bs58.decode(trimmed)
      if (secret.length !== 64) throw new Error(`expected 64-byte secret, got ${secret.length}`)
      _agentKp = Keypair.fromSecretKey(secret)
    }
    return _agentKp
  } catch (err: any) {
    console.error('[anchor-ix] AGENT_KEYPAIR parse failed:', err.message ?? err)
    return null
  }
}

export async function sendSignedIx(
  ix: TransactionInstruction,
  signer: Keypair,
): Promise<string> {
  const conn = getConnection()
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed')
  const tx = new Transaction()
  tx.feePayer = signer.publicKey
  tx.recentBlockhash = blockhash
  tx.add(ix)
  tx.sign(signer)
  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })
  await conn.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    'confirmed',
  )
  return sig
}
