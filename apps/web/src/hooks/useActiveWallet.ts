'use client'

import { useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { usePrivy } from '@privy-io/react-auth'

/**
 * Unified "is the user connected, and as whom?" hook.
 *
 * The Crypto-mode flow uses @solana/wallet-adapter; the Normie-mode flow
 * uses Privy (email / Google + embedded wallet). Both providers stay
 * mounted across theme switches, so a session opened in one mode is
 * still alive in the other. This hook merges them into a single signal
 * the rest of the app can consume.
 *
 * Preference when both are connected: Privy wins if it has an embedded
 * Solana wallet AND wallet-adapter doesn't, otherwise wallet-adapter.
 * In practice users only have one open at a time.
 */
export type WalletSource = 'adapter' | 'privy' | null

export interface ActiveWallet {
  /** Base58 pubkey of the active Solana account, if any. */
  address: string | null
  /** Which provider supplied the connection. */
  source: WalletSource
  /** True iff `address` is non-null. */
  isConnected: boolean
  /** A short label for the active connection — email, .sol, or 4–4 trunc. */
  label: string
  /** Disconnects whichever provider is currently active. */
  disconnect: () => Promise<void>
}

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID

function shortPubkey(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

export function useActiveWallet(): ActiveWallet {
  const { publicKey: adapterPubkey, disconnect: adapterDisconnect } = useWallet()

  // usePrivy() throws if PrivyProvider isn't mounted. Our PrivyClientProvider
  // only mounts when NEXT_PUBLIC_PRIVY_APP_ID is set, so guard the hook.
  let privyAuthed = false
  let privyAddress: string | null = null
  let privyEmail: string | null = null
  let privyDisconnect: (() => Promise<void>) | null = null
  if (HAS_PRIVY) {
    // Hook order is preserved because HAS_PRIVY is a build-time const —
    // it's the same on every render of every component.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const privy = usePrivy()
    privyAuthed = privy.authenticated
    // Privy stores the embedded wallet address on user.wallet.address. For
    // users who linked an external wallet via Privy, that's also the same
    // field. Either way it's the Solana address we should treat as primary.
    privyAddress = privy.user?.wallet?.address ?? null
    privyEmail = privy.user?.email?.address ?? privy.user?.google?.email ?? null
    privyDisconnect = async () => { await privy.logout() }
  }

  return useMemo<ActiveWallet>(() => {
    const adapterAddress = adapterPubkey ? adapterPubkey.toBase58() : null

    // Pick whichever has an actual address. Prefer Privy when both have
    // one, since Privy users opted into the simpler flow and probably
    // expect the email-bound session to win.
    const usePrivySource = privyAuthed && !!privyAddress
    const source: WalletSource = usePrivySource
      ? 'privy'
      : adapterAddress
        ? 'adapter'
        : null

    if (source === 'privy') {
      const label = privyEmail ?? (privyAddress ? shortPubkey(privyAddress) : 'Connected')
      return {
        address: privyAddress,
        source,
        isConnected: true,
        label,
        disconnect: privyDisconnect ?? (async () => {}),
      }
    }
    if (source === 'adapter') {
      return {
        address: adapterAddress,
        source,
        isConnected: true,
        label: shortPubkey(adapterAddress!),
        disconnect: async () => { await adapterDisconnect() },
      }
    }
    return {
      address: null,
      source: null,
      isConnected: false,
      label: '',
      disconnect: async () => {},
    }
  }, [adapterPubkey, adapterDisconnect, privyAuthed, privyAddress, privyEmail, privyDisconnect])
}
