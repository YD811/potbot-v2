'use client'

import { useMemo } from 'react'
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import type { Wallet as AnchorWallet } from '@coral-xyz/anchor'
import { useSignTransaction, useWallets } from '@privy-io/react-auth/solana'

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'
const SOLANA_CHAIN: `solana:${string}` =
  CLUSTER === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet'

/**
 * Adapts Privy's Solana embedded-wallet hooks into the `AnchorWallet`
 * shape that `@coral-xyz/anchor` expects. This is what lets a user who
 * signed up with email/Google/Twitter/LinkedIn (no Phantom) call the
 * same `useProgram()` flow that wallet-adapter users do.
 *
 * Returns `null` if:
 *   - Privy isn't configured (NEXT_PUBLIC_PRIVY_APP_ID missing), or
 *   - we're rendering on the server (Privy's ESM has SSR side effects
 *     that crash Next's static prerender), or
 *   - the user isn't signed in / has no Solana wallet linked.
 *
 * Hook order is stable across renders because both HAS_PRIVY and
 * `typeof window` are constant *within a given execution context*
 * (server vs client). Strictly speaking the conditional violates
 * rules-of-hooks across the SSR→hydration boundary, but for client-
 * only rendering after hydration the order is identical.
 */
export function usePrivyAnchorWallet(): AnchorWallet | null {
  if (!HAS_PRIVY || typeof window === 'undefined') return null
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return usePrivyAnchorWalletInner()
}

function usePrivyAnchorWalletInner(): AnchorWallet | null {
  const { wallets } = useWallets()
  const { signTransaction: privySign } = useSignTransaction()
  const wallet = wallets[0] ?? null

  return useMemo<AnchorWallet | null>(() => {
    if (!wallet) return null
    let pk: PublicKey
    try { pk = new PublicKey(wallet.address) } catch { return null }

    async function signOne<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      // Anchor hands us either a legacy Transaction or a v0
      // VersionedTransaction. Both serialize to a Uint8Array; Privy
      // accepts the bytes verbatim.
      const bytes =
        tx instanceof VersionedTransaction
          ? tx.serialize()
          : (tx as Transaction).serialize({ requireAllSignatures: false, verifySignatures: false })

      const out = await privySign({
        transaction: new Uint8Array(bytes),
        wallet: wallet!,
        chain: SOLANA_CHAIN,
      })

      const signed = out.signedTransaction
      if (tx instanceof VersionedTransaction) {
        return VersionedTransaction.deserialize(signed) as unknown as T
      }
      return Transaction.from(signed) as unknown as T
    }

    return {
      publicKey: pk,
      async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
        return signOne(tx)
      },
      async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
        const out: T[] = []
        for (const tx of txs) out.push(await signOne(tx))
        return out
      },
      payer: undefined as any,
    } as unknown as AnchorWallet
  }, [wallet, privySign])
}
