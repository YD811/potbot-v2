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

/** Anchor account discriminator: sha256("account:<PascalCaseStruct>")[..8] */
export function accountDiscriminator(pascalCaseName: string): Buffer {
  return createHash('sha256').update(`account:${pascalCaseName}`).digest().subarray(0, 8)
}

/** Borsh-encode a Rust String as `u32 length || utf-8 bytes`. */
function encodeString(s: string): Buffer {
  const bytes = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(bytes.length, 0)
  return Buffer.concat([len, bytes])
}

/** Cursor-based reader for Borsh-encoded Anchor accounts. */
class BorshReader {
  private offset = 0
  constructor(private data: Buffer) {}

  remaining(): number { return this.data.length - this.offset }
  skip(n: number): void { this.offset += n }
  pos(): number { return this.offset }

  u8(): number { const v = this.data.readUInt8(this.offset); this.offset += 1; return v }
  bool(): boolean { return this.u8() !== 0 }
  u16(): number { const v = this.data.readUInt16LE(this.offset); this.offset += 2; return v }
  u32(): number { const v = this.data.readUInt32LE(this.offset); this.offset += 4; return v }
  u64(): bigint { const v = this.data.readBigUInt64LE(this.offset); this.offset += 8; return v }
  i64(): bigint { const v = this.data.readBigInt64LE(this.offset); this.offset += 8; return v }
  pubkey(): PublicKey { const v = new PublicKey(this.data.subarray(this.offset, this.offset + 32)); this.offset += 32; return v }
  string(): string {
    const len = this.u32()
    const v = this.data.subarray(this.offset, this.offset + len).toString('utf-8')
    this.offset += len
    return v
  }
  optionPubkey(): PublicKey | null {
    const tag = this.u8()
    if (tag === 0) return null
    return this.pubkey()
  }
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

export function vaultPda(pot: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), pot.toBuffer()],
    POT_VAULT_PROGRAM_ID,
  )
}

export function proposalPda(pot: PublicKey, proposalId: bigint): [PublicKey, number] {
  const idLe = Buffer.alloc(8)
  idLe.writeBigUInt64LE(proposalId, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), pot.toBuffer(), idLe],
    POT_VAULT_PROGRAM_ID,
  )
}

// ── On-chain account decoders ─────────────────────────────────────────────
//
// We decode just the fields we need for analytics/listing. Layout pulled from
// `packages/program/programs/pot_vault/src/state/{pot,proposal}.rs` with the
// 8-byte Anchor disc prefix on top.

export interface DecodedPot {
  pubkey: string
  authority: string
  name: string
  emoji: string
  total_shares: string  // u64 as string to avoid BigInt JSON issues
  member_count: number
  trade_count: number
  total_volume_lamports: string
  next_proposal_id: string
  created_at: number
  high_water_mark: string
  is_public: boolean
  min_deposit_lamports: string
  yield_strategy: 'None' | 'Conservative' | 'Balanced' | 'Aggressive'
  trade_level: number
  withdraw_level: number
  quorum_bps: number
  vote_timeout_seconds: number
  agent_pubkey: string | null
}

export function decodePotAccount(pubkey: PublicKey, data: Buffer): DecodedPot | null {
  const expectedDisc = accountDiscriminator('PotAccount')
  if (data.length < 8 || !data.subarray(0, 8).equals(expectedDisc)) return null

  const r = new BorshReader(data)
  r.skip(8) // discriminator
  const authority = r.pubkey()
  const name = r.string()
  const emoji = r.string()
  r.skip(2) // vault_bump + pot_bump
  const total_shares = r.u64()
  const member_count = r.u32()
  const trade_count = r.u32()
  const total_volume = r.u64()
  r.skip(1 + 8) // tamagotchi_level + tamagotchi_xp
  r.skip(32 + 32) // community_token_mint + token_mint
  r.skip(8) // shares_per_sol

  // PotConfig
  const is_public = r.bool()
  const min_deposit = r.u64()
  r.skip(8) // lockup_seconds
  const yieldStrategyIdx = r.u8()
  const yield_strategy = (['None', 'Conservative', 'Balanced', 'Aggressive'] as const)[yieldStrategyIdx] ?? 'None'
  r.skip(2 + 2 + 2) // max_yield_allocation_bps + max_trade_size_bps + max_members

  // GovSettings
  const trade_level = r.u8()
  const withdraw_level = r.u8()
  r.skip(1 + 1 + 1) // member_change_level + settings_change_level + yield_change_level
  const vote_timeout_seconds = Number(r.i64())
  const quorum_bps = r.u16()
  r.skip(8) // timelock_seconds

  const next_proposal_id = r.u64()
  const created_at = Number(r.i64())
  const high_water_mark = r.u64()
  r.skip(2) // protocol_fee_bps
  r.skip(8) // last_activity_at
  const agent_pubkey = r.optionPubkey()

  return {
    pubkey: pubkey.toBase58(),
    authority: authority.toBase58(),
    name,
    emoji,
    total_shares: total_shares.toString(),
    member_count,
    trade_count,
    total_volume_lamports: total_volume.toString(),
    next_proposal_id: next_proposal_id.toString(),
    created_at,
    high_water_mark: high_water_mark.toString(),
    is_public,
    min_deposit_lamports: min_deposit.toString(),
    yield_strategy,
    trade_level,
    withdraw_level,
    quorum_bps,
    vote_timeout_seconds,
    agent_pubkey: agent_pubkey?.toBase58() ?? null,
  }
}

export interface DecodedProposal {
  pubkey: string
  pot: string
  proposal_id: string
  proposer: string
  proposal_type: string
  swap?: { from_mint: string; to_mint: string; amount_in: string; min_amount_out: string }
  description: string
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Expired'
  yes_shares: string
  no_shares: string
  total_shares_snapshot: string
  created_at: number
  resolved_at: number
  passed_at: number
}

const PROPOSAL_TYPES = [
  'Swap', 'Withdraw', 'ChangeSettings', 'ChangeYield', 'AddMember',
  'RemoveMember', 'SetAgent', 'TransferFunds', 'UpdateRiskConfig',
  'TokenizePot', 'DepositToYield', 'WithdrawFromYield',
] as const

const PROPOSAL_STATUSES = ['Active', 'Passed', 'Rejected', 'Executed', 'Expired'] as const

export function decodeProposalAccount(pubkey: PublicKey, data: Buffer): DecodedProposal | null {
  const expectedDisc = accountDiscriminator('ProposalAccount')
  if (data.length < 8 || !data.subarray(0, 8).equals(expectedDisc)) return null

  const r = new BorshReader(data)
  r.skip(8)
  const pot = r.pubkey()
  const proposal_id = r.u64()
  const proposer = r.pubkey()
  const variantIdx = r.u8()
  const proposal_type = PROPOSAL_TYPES[variantIdx] ?? `Unknown(${variantIdx})`

  let swap: DecodedProposal['swap']
  if (variantIdx === 0) {
    const from_mint = r.pubkey()
    const to_mint = r.pubkey()
    const amount_in = r.u64()
    const min_amount_out = r.u64()
    swap = {
      from_mint: from_mint.toBase58(),
      to_mint: to_mint.toBase58(),
      amount_in: amount_in.toString(),
      min_amount_out: min_amount_out.toString(),
    }
  } else {
    // Skip other variant fields by walking only enough to reach description
    // For simplicity we bail out of detailed parsing for non-Swap types.
    // We can still report the variant name + the universal trailing fields
    // by reading from the end of the account, but since variant payloads have
    // variable sizes this is brittle. Return without detailed payload.
    return {
      pubkey: pubkey.toBase58(),
      pot: pot.toBase58(),
      proposal_id: proposal_id.toString(),
      proposer: proposer.toBase58(),
      proposal_type,
      description: '',
      status: 'Active',
      yes_shares: '0',
      no_shares: '0',
      total_shares_snapshot: '0',
      created_at: 0,
      resolved_at: 0,
      passed_at: 0,
    }
  }

  const description = r.string()
  const statusIdx = r.u8()
  const status = PROPOSAL_STATUSES[statusIdx] ?? 'Active'
  const yes_shares = r.u64()
  const no_shares = r.u64()
  const total_shares_snapshot = r.u64()
  const created_at = Number(r.i64())
  const resolved_at = Number(r.i64())
  const passed_at = Number(r.i64())

  return {
    pubkey: pubkey.toBase58(),
    pot: pot.toBase58(),
    proposal_id: proposal_id.toString(),
    proposer: proposer.toBase58(),
    proposal_type,
    swap,
    description,
    status,
    yes_shares: yes_shares.toString(),
    no_shares: no_shares.toString(),
    total_shares_snapshot: total_shares_snapshot.toString(),
    created_at,
    resolved_at,
    passed_at,
  }
}

// ── On-chain queries ──────────────────────────────────────────────────────

export async function getAllPots(): Promise<DecodedPot[]> {
  const conn = getConnection()
  const disc = accountDiscriminator('PotAccount')
  const accounts = await conn.getProgramAccounts(POT_VAULT_PROGRAM_ID, {
    filters: [{ memcmp: { offset: 0, bytes: bs58.encode(disc) } }],
  })
  const pots: DecodedPot[] = []
  for (const a of accounts) {
    const decoded = decodePotAccount(a.pubkey, a.account.data)
    if (decoded) pots.push(decoded)
  }
  return pots
}

export async function getProposalsForPot(pot: PublicKey): Promise<DecodedProposal[]> {
  const conn = getConnection()
  const disc = accountDiscriminator('ProposalAccount')
  const accounts = await conn.getProgramAccounts(POT_VAULT_PROGRAM_ID, {
    filters: [
      { memcmp: { offset: 0, bytes: bs58.encode(disc) } },
      { memcmp: { offset: 8, bytes: pot.toBase58() } }, // pot field is right after disc
    ],
  })
  const proposals: DecodedProposal[] = []
  for (const a of accounts) {
    const decoded = decodeProposalAccount(a.pubkey, a.account.data)
    if (decoded) proposals.push(decoded)
  }
  return proposals.sort((a, b) => Number(b.proposal_id) - Number(a.proposal_id))
}

export async function readPotAccount(pot: PublicKey): Promise<DecodedPot | null> {
  const conn = getConnection()
  const info = await conn.getAccountInfo(pot)
  if (!info) return null
  return decodePotAccount(pot, info.data)
}

// ── Instruction builders for the wider pot lifecycle ─────────────────────

export interface CreateSwapProposalArgs {
  pot: PublicKey
  proposer: PublicKey  // signer; must be a member
  proposalId: bigint   // pot.next_proposal_id
  fromMint: PublicKey
  toMint: PublicKey
  amountInLamports: bigint
  minAmountOutLamports: bigint
  description: string
}

export function buildCreateSwapProposalIx(a: CreateSwapProposalArgs): TransactionInstruction {
  const [proposal] = proposalPda(a.pot, a.proposalId)
  const [member] = memberPda(a.pot, a.proposer)
  const [vault] = vaultPda(a.pot)

  // CreateProposalParams = ProposalType (variant 0 = Swap) + description (String)
  const amountIn = Buffer.alloc(8); amountIn.writeBigUInt64LE(a.amountInLamports, 0)
  const minOut = Buffer.alloc(8); minOut.writeBigUInt64LE(a.minAmountOutLamports, 0)

  const data = Buffer.concat([
    ixDiscriminator('create_proposal'),
    Buffer.from([0]),  // ProposalType::Swap variant index
    a.fromMint.toBuffer(),
    a.toMint.toBuffer(),
    amountIn,
    minOut,
    encodeString(a.description),
  ])

  return new TransactionInstruction({
    programId: POT_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: a.pot, isSigner: false, isWritable: true },
      { pubkey: proposal, isSigner: false, isWritable: true },
      { pubkey: member, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: false },
      { pubkey: a.proposer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

export interface DepositArgs {
  pot: PublicKey
  depositor: PublicKey  // signer
  lamports: bigint
}

export function buildDepositIx(a: DepositArgs): TransactionInstruction {
  const [vault] = vaultPda(a.pot)
  const [member] = memberPda(a.pot, a.depositor)

  const lamportsLe = Buffer.alloc(8)
  lamportsLe.writeBigUInt64LE(a.lamports, 0)

  const data = Buffer.concat([
    ixDiscriminator('deposit'),
    lamportsLe,
  ])

  return new TransactionInstruction({
    programId: POT_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: a.pot, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: member, isSigner: false, isWritable: true },
      { pubkey: a.depositor, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

export async function getVaultLamports(pot: PublicKey): Promise<bigint> {
  const conn = getConnection()
  const [vault] = vaultPda(pot)
  const lamports = await conn.getBalance(vault).catch(() => 0)
  return BigInt(lamports)
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
