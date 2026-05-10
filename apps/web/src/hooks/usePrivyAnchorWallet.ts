'use client'

import { useContext } from 'react'
import type { Wallet as AnchorWallet } from '@coral-xyz/anchor'
import { PrivyAnchorWalletContext } from '@/contexts/PrivyAnchorWalletContext'

/**
 * Read the Privy-backed AnchorWallet published by
 * `PrivyAnchorWalletBridge`. This module is intentionally free of any
 * Privy imports — the actual Privy hooks live behind a
 * `next/dynamic({ ssr: false })` boundary inside PrivyClientProvider.
 *
 * Always returns `null` until the bridge has hydrated on the client.
 */
export function usePrivyAnchorWallet(): AnchorWallet | null {
  return useContext(PrivyAnchorWalletContext)
}
