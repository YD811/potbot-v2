'use client'

import { createContext } from 'react'
import type { Wallet as AnchorWallet } from '@coral-xyz/anchor'
import type { VersionedTransaction } from '@solana/web3.js'

/** The embedded wallet, plus the two signers BAG needs on mainnet. */
export type PrivyWallet = AnchorWallet & {
  signMainnetTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>
}

/**
 * Shared React context for the Privy-backed AnchorWallet. Lives in its
 * own module — free of Privy imports — so the hook side can be safely
 * pulled into the server bundle while the actual bridge that populates
 * the context loads client-only via next/dynamic.
 */
export const PrivyAnchorWalletContext = createContext<PrivyWallet | null>(null)
