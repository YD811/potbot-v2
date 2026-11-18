'use client'

import { useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import type { VersionedTransaction } from '@solana/web3.js'
import { usePrivyAnchorWallet } from '@/hooks/usePrivyAnchorWallet'

/**
 * One wallet for BAG, whichever way the person came in:
 *  - a Solana wallet app or extension (wallet-adapter), or
 *  - an email / Google login, where Privy creates an embedded Solana wallet.
 * Both can sign the Jupiter swaps and the join / create messages.
 */
export interface BagWallet {
  address: string | null
  connected: boolean
  source: 'adapter' | 'privy' | null
  signTransaction: ((tx: VersionedTransaction) => Promise<VersionedTransaction>) | null
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null
}

export function useBagWallet(): BagWallet {
  const adapter = useWallet()
  const privy = usePrivyAnchorWallet()

  return useMemo<BagWallet>(() => {
    if (adapter.publicKey) {
      return {
        address: adapter.publicKey.toBase58(),
        connected: adapter.connected,
        source: 'adapter',
        signTransaction: adapter.signTransaction ? (tx) => adapter.signTransaction!(tx) : null,
        signMessage: adapter.signMessage ? (m) => adapter.signMessage!(m) : null,
      }
    }
    if (privy) {
      return {
        address: privy.publicKey.toBase58(),
        connected: true,
        source: 'privy',
        signTransaction: privy.signMainnetTransaction ?? null,
        signMessage: privy.signMessage ?? null,
      }
    }
    return { address: null, connected: false, source: null, signTransaction: null, signMessage: null }
  }, [adapter.publicKey, adapter.connected, adapter.signTransaction, adapter.signMessage, privy])
}
