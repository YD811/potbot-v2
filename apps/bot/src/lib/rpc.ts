/**
 * Shared Solana connection + program instances for the bot.
 * Uses a read-only provider (no signing) for queries.
 * Actual transactions require users to sign via the web app or deep-link.
 */
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

const RPC_URL = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const POT_PROGRAM_ID = new PublicKey(
  process.env.POT_PROGRAM_ID ?? 'PotVLT11111111111111111111111111111111111111'
)
const DUEL_PROGRAM_ID = new PublicKey(
  process.env.DUEL_PROGRAM_ID ?? 'PotDUL11111111111111111111111111111111111111'
)

export const connection = new Connection(RPC_URL, 'confirmed')
export { POT_PROGRAM_ID, DUEL_PROGRAM_ID }

// ── Query helpers ──────────────────────────────────────────────────────────

export interface PotInfo {
  pubkey: string
  name: string
  memberCount: number
  totalShares: bigint
  tamagotchiLevel: number
  tradeCount: bigint
}

/**
 * Fetch all POT accounts where `authority` matches the given wallet.
 * Requires the IDL to be available — falls back to empty array if not deployed.
 */
export async function fetchPotsForWallet(walletB58: string): Promise<PotInfo[]> {
  try {
    const wallet = new PublicKey(walletB58)
    const accounts = await connection.getProgramAccounts(POT_PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 8, // skip 8-byte Anchor discriminator
            bytes: wallet.toBase58(),
          },
        },
      ],
    })

    // Without the IDL loaded we can at least return stubs with the pubkey
    return accounts.map((a) => ({
      pubkey: a.pubkey.toBase58(),
      name: '(loading…)',
      memberCount: 0,
      totalShares: 0n,
      tamagotchiLevel: 0,
      tradeCount: 0n,
    }))
  } catch {
    return []
  }
}

export async function getVaultBalance(vaultPubkey: string): Promise<number> {
  try {
    const info = await connection.getAccountInfo(new PublicKey(vaultPubkey))
    return (info?.lamports ?? 0) / LAMPORTS_PER_SOL
  } catch {
    return 0
  }
}

// ── Deep-link helpers ──────────────────────────────────────────────────────

const APP_URL = process.env.APP_URL ?? 'https://app.potbot.fun'

export function createPotLink()   { return `${APP_URL}/dashboard?action=create` }
export function potDetailLink(pk: string) { return `${APP_URL}/pots/${pk}` }
export function duelLink()        { return `${APP_URL}/duel` }
export function depositLink(pk: string) { return `${APP_URL}/pots/${pk}?tab=deposit` }
