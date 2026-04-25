export type PotbotMode = 'onchain' | 'mock'

/**
 * Runtime mode toggle for web app data sources.
 * - onchain: read from Solana RPC + Anchor program
 * - mock: in-memory Zustand data
 */
export function getMode(): PotbotMode {
  const raw = process.env.NEXT_PUBLIC_MODE?.toLowerCase()
  return raw === 'mock' ? 'mock' : 'onchain'
}

export function isOnchainMode(): boolean {
  return getMode() === 'onchain'
}

export function isMockMode(): boolean {
  return getMode() === 'mock'
}
