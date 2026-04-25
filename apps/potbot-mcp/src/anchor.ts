/**
 * Minimal raw Anchor-instruction helpers — we don't depend on the IDL because
 * it's known to be partial; we compute discriminators directly from snake_case
 * names and serialise account args by hand. This keeps the MCP server
 * self-contained and resilient to IDL drift.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js'
import { createHash } from 'crypto'
import bs58 from 'bs58'

export const POT_VAULT_PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK',
)

export function rpcUrl(): string {
  return process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
}

export function getConnection(): Connection {
  return new Connection(rpcUrl(), 'confirmed')
}

/** Anchor instruction discriminator: sha256("global:<snake_case_name>")[..8] */
export function ixDiscriminator(snakeCaseName: string): Buffer {
  return createHash('sha256').update(`global:${snakeCaseName}`).digest().subarray(0, 8)
}

/** Borsh-encode a Rust String as `u32 length || utf-8 bytes`. */
function encodeString(s: string): Buffer {
  const bytes = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(bytes.length, 0)
  return Buffer.concat([len, bytes])
}

// ── PDA derivations ────────────────────────────────────────────────────────

export function memberPda(pot: PublicKey, member: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('member'), pot.toBuffer(), member.toBuffer()],
    POT_VAULT_PROGRAM_ID,
  )
}

export function delegatePda(pot: PublicKey, member: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('delegate'), pot.toBuffer(), member.toBuffer()],
    POT_VAULT_PROGRAM_ID,
  )
}

export function voterRecordPda(proposal: PublicKey, member: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('voter'), proposal.toBuffer(), member.toBuffer()],
    POT_VAULT_PROGRAM_ID,
  )
}

// ── Instruction builders ──────────────────────────────────────────────────

export interface RegisterDelegateArgs {
  pot: PublicKey
  memberWallet: PublicKey  // also the signer
  delegate: PublicKey
  rulesUri: string
}

export function buildRegisterDelegateIx(a: RegisterDelegateArgs): TransactionInstruction {
  const [member] = memberPda(a.pot, a.memberWallet)
  const [delegateAccount] = delegatePda(a.pot, a.memberWallet)

  const data = Buffer.concat([
    ixDiscriminator('register_delegate'),
    a.delegate.toBuffer(),
    encodeString(a.rulesUri),
  ])

  return new TransactionInstruction({
    programId: POT_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: a.pot, isSigner: false, isWritable: false },
      { pubkey: member, isSigner: false, isWritable: false },
      { pubkey: delegateAccount, isSigner: false, isWritable: true },
      { pubkey: a.memberWallet, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

export interface RevokeDelegateArgs {
  pot: PublicKey
  memberWallet: PublicKey  // signer
}

export function buildRevokeDelegateIx(a: RevokeDelegateArgs): TransactionInstruction {
  const [delegateAccount] = delegatePda(a.pot, a.memberWallet)

  const data = ixDiscriminator('revoke_delegate')

  return new TransactionInstruction({
    programId: POT_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: a.pot, isSigner: false, isWritable: false },
      { pubkey: delegateAccount, isSigner: false, isWritable: true },
      { pubkey: a.memberWallet, isSigner: true, isWritable: true },
    ],
    data,
  })
}

export interface VoteAsDelegateArgs {
  pot: PublicKey
  proposal: PublicKey
  memberWallet: PublicKey  // the delegated-from member
  delegateSigner: PublicKey  // the AI agent
  approve: boolean
}

export function buildVoteAsDelegateIx(a: VoteAsDelegateArgs): TransactionInstruction {
  const [delegateAccount] = delegatePda(a.pot, a.memberWallet)
  const [member] = memberPda(a.pot, a.memberWallet)
  const [voterRecord] = voterRecordPda(a.proposal, a.memberWallet)

  const data = Buffer.concat([
    ixDiscriminator('vote_as_delegate'),
    Buffer.from([a.approve ? 1 : 0]),
  ])

  return new TransactionInstruction({
    programId: POT_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: a.pot, isSigner: false, isWritable: false },
      { pubkey: a.proposal, isSigner: false, isWritable: true },
      { pubkey: delegateAccount, isSigner: false, isWritable: false },
      { pubkey: member, isSigner: false, isWritable: false },
      { pubkey: voterRecord, isSigner: false, isWritable: true },
      { pubkey: a.delegateSigner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

// ── Keypair / agent identity ──────────────────────────────────────────────

/**
 * Load the agent keypair from env. Supports two formats:
 *   - base58 secret key (64 bytes encoded) — most compact, AGENT_KEYPAIR=...
 *   - JSON array of 64 numbers — solana-keygen format
 * Returns null if not configured.
 */
export function loadAgentKeypair(): Keypair | null {
  const raw = process.env.AGENT_KEYPAIR
  if (!raw) return null

  const trimmed = raw.trim()

  // JSON array form
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed) as number[]
      return Keypair.fromSecretKey(Uint8Array.from(arr))
    } catch {
      throw new Error('AGENT_KEYPAIR is not a valid JSON keypair array')
    }
  }

  // base58 form
  try {
    const secret = bs58.decode(trimmed)
    if (secret.length !== 64) throw new Error(`expected 64 bytes, got ${secret.length}`)
    return Keypair.fromSecretKey(secret)
  } catch (err: any) {
    throw new Error(`AGENT_KEYPAIR base58 decode failed: ${err.message ?? String(err)}`)
  }
}

// ── Tx submit / serialize ─────────────────────────────────────────────────

/** Wrap one or more ixs in a Transaction, sign with `signers`, send + confirm. */
export async function sendIxs(
  ixs: TransactionInstruction[],
  signers: Keypair[],
  feePayer?: PublicKey,
): Promise<string> {
  if (signers.length === 0) throw new Error('at least one signer required')
  const conn = getConnection()
  const payer = feePayer ?? signers[0].publicKey
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed')

  const tx = new Transaction()
  tx.feePayer = payer
  tx.recentBlockhash = blockhash
  ixs.forEach(ix => tx.add(ix))
  tx.sign(...signers)

  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
  return sig
}

/**
 * Serialize an unsigned tx to base64 (legacy format) so a human/wallet can
 * sign it. Includes a fresh blockhash.
 */
export async function unsignedTxBase64(
  ixs: TransactionInstruction[],
  feePayer: PublicKey,
): Promise<{ tx_b64: string; blockhash: string }> {
  const conn = getConnection()
  const { blockhash } = await conn.getLatestBlockhash('confirmed')
  const tx = new Transaction()
  tx.feePayer = feePayer
  tx.recentBlockhash = blockhash
  ixs.forEach(ix => tx.add(ix))
  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  return { tx_b64: serialized.toString('base64'), blockhash }
}

/**
 * Read MemberDelegate account directly via getAccountInfo and parse the
 * relevant fields without needing the IDL. Layout:
 *   8B disc | 32 pot | 32 member | 32 delegate | 4+200 rules_uri | 8 scope_mask
 *   | 8 registered_at | 8 revoked_at | 1 bump
 */
export async function readMemberDelegate(pot: PublicKey, member: PublicKey): Promise<{
  exists: boolean
  delegate?: PublicKey
  rules_uri?: string
  registered_at?: number
  revoked_at?: number
  active?: boolean
}> {
  const [pda] = delegatePda(pot, member)
  const conn = getConnection()
  const info = await conn.getAccountInfo(pda)
  if (!info) return { exists: false }

  const data = info.data
  // Skip 8B disc + 32 pot + 32 member
  let offset = 8 + 32 + 32
  const delegate = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32
  const uriLen = data.readUInt32LE(offset)
  offset += 4
  const rules_uri = data.subarray(offset, offset + uriLen).toString('utf-8')
  offset += uriLen
  // skip scope_mask
  offset += 8
  const registered_at = Number(data.readBigInt64LE(offset))
  offset += 8
  const revoked_at = Number(data.readBigInt64LE(offset))

  return {
    exists: true,
    delegate,
    rules_uri,
    registered_at,
    revoked_at,
    active: revoked_at === 0,
  }
}
