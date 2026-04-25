import { PublicKey } from '@solana/web3.js';

// ─── Program ID ────────────────────────────────────────────────────────────
// Source of truth. Must match `declare_id!` in
// `packages/program/programs/pot_vault/src/lib.rs` and `Anchor.toml`.
// Override at runtime via NEXT_PUBLIC_PROGRAM_ID if deploying a fresh build
// to a different address.
export const PROGRAM_ID = new PublicKey(
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PROGRAM_ID) ||
  'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'
);

// Back-compat alias — some callers import this name.
export const POT_PROGRAM_ID = PROGRAM_ID;

// Original PDAs
export function getPotAddress(name: string, authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pot'), Buffer.from(name), authority.toBuffer()],
    PROGRAM_ID
  );
}

export function getVaultAddress(potPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), potPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getMemberAddress(potPubkey: PublicKey, wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('member'), potPubkey.toBuffer(), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function getProposalAddress(potPubkey: PublicKey, proposalId: number): [PublicKey, number] {
  const idBytes = Buffer.allocUnsafe(8);
  idBytes.writeBigUInt64LE(BigInt(proposalId), 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), potPubkey.toBuffer(), idBytes],
    PROGRAM_ID
  );
}

export function getVoterRecordAddress(proposalPubkey: PublicKey, voter: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('voter_record'), proposalPubkey.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  );
}

// Strategy Vault PDAs
export function getStrategyVaultAddress(name: string, creator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('strategy_vault'), Buffer.from(name), creator.toBuffer()],
    PROGRAM_ID
  );
}

export function getParticipantAddress(strategyVault: PublicKey, wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), strategyVault.toBuffer(), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function getReferralAddress(strategyVault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('referral'), strategyVault.toBuffer()],
    PROGRAM_ID
  );
}

// ─── Premium Feature PDAs ───────────────────────────────────────

// Private Pot PDA
export function getPrivatePotAddress(potPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('private_pot'), potPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// SNS Domain PDA
export function getSnsAddress(potPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sns'), potPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// Tamagotchi NFT PDA
export function getTamagotchiNftAddress(potPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tamagotchi_nft'), potPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// Token mint PDAs for tokenized shares
export function getTokenMintAddress(potPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_mint'), potPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// Tamagotchi mint PDA for NFTs
export function getTamagotchiMintAddress(potPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tamagotchi_mint'), potPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// Helper: Get Metaplex metadata PDA
export function getMetadataAddress(mint: PublicKey): [PublicKey, number] {
  const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
}