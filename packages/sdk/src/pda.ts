import { PublicKey } from '@solana/web3.js'

export const POT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_POT_PROGRAM_ID ?? 'PotVLT111111111111111111111111111111111111'
)
export const DUEL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_DUEL_PROGRAM_ID ?? 'PotDuel11111111111111111111111111111111111'
)

/** PDA for the POT config account */
export function getPotAddress(authority: PublicKey, name: string, programId = POT_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)],
    programId
  )
}

/** PDA for the SOL vault holding collective funds */
export function getVaultAddress(potAddress: PublicKey, programId = POT_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), potAddress.toBuffer()],
    programId
  )
}

/** PDA for a member account */
export function getMemberAddress(potAddress: PublicKey, wallet: PublicKey, programId = POT_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('member'), potAddress.toBuffer(), wallet.toBuffer()],
    programId
  )
}

/** PDA for a governance proposal */
export function getProposalAddress(potAddress: PublicKey, proposalId: number, programId = POT_PROGRAM_ID) {
  const idBuf = Buffer.alloc(8)
  idBuf.writeBigUInt64LE(BigInt(proposalId))
  return PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), potAddress.toBuffer(), idBuf],
    programId
  )
}

/** PDA for a Duel account */
export function getDuelAddress(challenger: PublicKey, defender: PublicKey, duelId: number, programId = DUEL_PROGRAM_ID) {
  const idBuf = Buffer.alloc(8)
  idBuf.writeBigUInt64LE(BigInt(duelId))
  return PublicKey.findProgramAddressSync(
    [Buffer.from('duel'), challenger.toBuffer(), defender.toBuffer(), idBuf],
    programId
  )
}

/** PDA for a side bet */
export function getSideBetAddress(duelAddress: PublicKey, bettor: PublicKey, programId = DUEL_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sidebet'), duelAddress.toBuffer(), bettor.toBuffer()],
    programId
  )
}
