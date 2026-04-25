/**
 * Client-side helpers for the on-chain `register_delegate` / `revoke_delegate`
 * instructions. We build raw Anchor instructions instead of going through
 * @coral-xyz/anchor because the bundled IDL is partial — these new ixs
 * aren't in it yet. Same approach as the MCP server (apps/potbot-mcp/src/anchor.ts).
 */
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { getProgramId } from './rpc-config'

const TEXT_ENCODER = new TextEncoder()

// Pre-computed Anchor discriminators — sha256(...)[..8].
// Hardcoded so we don't need `crypto` (Node) in the browser bundle.
const DISC_REGISTER_DELEGATE = Buffer.from([218, 45, 12, 33, 195, 89, 89, 208])
const DISC_REVOKE_DELEGATE   = Buffer.from([142, 66, 98, 126, 102, 60, 92, 163])
const DISC_ACCOUNT_DELEGATE  = Buffer.from([245, 72, 89, 200, 75, 114, 37, 94])

function encodeString(s: string): Buffer {
  const bytes = Buffer.from(TEXT_ENCODER.encode(s))
  const len = Buffer.alloc(4)
  len.writeUInt32LE(bytes.length, 0)
  return Buffer.concat([len, bytes])
}

export function delegatePda(pot: PublicKey, member: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('delegate'), pot.toBuffer(), member.toBuffer()],
    getProgramId(),
  )
}

export function memberPda(pot: PublicKey, member: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('member'), pot.toBuffer(), member.toBuffer()],
    getProgramId(),
  )
}

export interface RegisterDelegateParams {
  pot: PublicKey
  memberWallet: PublicKey
  delegate: PublicKey
  rulesUri: string
}

export function buildRegisterDelegateIx(p: RegisterDelegateParams): TransactionInstruction {
  const programId = getProgramId()
  const [member] = memberPda(p.pot, p.memberWallet)
  const [delegateAcc] = delegatePda(p.pot, p.memberWallet)

  const data = Buffer.concat([
    DISC_REGISTER_DELEGATE,
    p.delegate.toBuffer(),
    encodeString(p.rulesUri),
  ])

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: p.pot, isSigner: false, isWritable: false },
      { pubkey: member, isSigner: false, isWritable: false },
      { pubkey: delegateAcc, isSigner: false, isWritable: true },
      { pubkey: p.memberWallet, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

export interface RevokeDelegateParams {
  pot: PublicKey
  memberWallet: PublicKey
}

export function buildRevokeDelegateIx(p: RevokeDelegateParams): TransactionInstruction {
  const programId = getProgramId()
  const [delegateAcc] = delegatePda(p.pot, p.memberWallet)

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: p.pot, isSigner: false, isWritable: false },
      { pubkey: delegateAcc, isSigner: false, isWritable: true },
      { pubkey: p.memberWallet, isSigner: true, isWritable: true },
    ],
    data: DISC_REVOKE_DELEGATE,
  })
}

export interface MemberDelegateState {
  exists: boolean
  pda: PublicKey
  delegate?: PublicKey
  rulesUri?: string
  registeredAt?: number
  revokedAt?: number
  active?: boolean
}

/**
 * Read the on-chain MemberDelegate account directly.
 * Layout (post 8B disc):
 *   32 pot | 32 member | 32 delegate | 4+N rules_uri | 8 scope_mask
 *   | 8 registered_at | 8 revoked_at | 1 bump
 */
export async function readMemberDelegate(
  connection: Connection,
  pot: PublicKey,
  member: PublicKey,
): Promise<MemberDelegateState> {
  const [pda] = delegatePda(pot, member)
  const info = await connection.getAccountInfo(pda)
  if (!info) return { exists: false, pda }

  const data = info.data
  let offset = 8 + 32 + 32 // skip disc + pot + member
  const delegate = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32
  const uriLen = data.readUInt32LE(offset)
  offset += 4
  const rulesUri = data.subarray(offset, offset + uriLen).toString('utf-8')
  offset += uriLen
  offset += 8 // skip scope_mask
  const registeredAt = Number(data.readBigInt64LE(offset))
  offset += 8
  const revokedAt = Number(data.readBigInt64LE(offset))

  return {
    exists: true,
    pda,
    delegate,
    rulesUri,
    registeredAt,
    revokedAt,
    active: revokedAt === 0,
  }
}
