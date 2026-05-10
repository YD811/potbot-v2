'use client'

import { createContext } from 'react'
import type { Wallet as AnchorWallet } from '@coral-xyz/anchor'

/**
 * Shared React context for the Privy-backed AnchorWallet. Lives in its
 * own module — free of Privy imports — so the hook side can be safely
 * pulled into the server bundle while the actual bridge that populates
 * the context loads client-only via next/dynamic.
 */
export const PrivyAnchorWalletContext = createContext<AnchorWallet | null>(null)
