'use client'

import { useMemo, type ReactNode } from 'react'
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import type { Wallet as AnchorWallet } from '@coral-xyz/anchor'
import { useSignTransaction, useWallets } from '@privy-io/react-auth/solana'
import { PrivyAnchorWalletContext } from '@/contexts/PrivyAnchorWalletContext'

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'
const SOLANA_CHAIN: `solana:${string}` =
  CLUSTER === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet'

/**
 * Renders nothing visible. Its only job is to call Privy's Solana hooks
 * (`useWallets` + `useSignTransaction`) inside the component tree and
 * publish a wallet-adapter-compatible `AnchorWallet` to its descendants.
 *
 * Must only be rendered on the client. The wrapper that mounts it does
 * `nextDynamic(..., { ssr: false })` so this module never loads in a
 * server bundle — `@privy-io/react-auth/solana` crashes Next.js's
 * static prerender otherwise (Maximum call stack in `S`).
 */
export function PrivyAnchorWalletBridge({ children }: { children: ReactNode }) {
  const { wallets } = useWallets()
  const { signTransaction: privySign } = useSignTransaction()
  const wallet = wallets[0] ?? null

  const anchorWallet = useMemo<AnchorWallet | null>(() => {
    if (!wallet) return null
    let pk: PublicKey
    try { pk = new PublicKey(wallet.address) } catch { return null }

    async function signOne<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
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

  return (
    <PrivyAnchorWalletContext.Provider value={anchorWallet}>
      {children}
    </PrivyAnchorWalletContext.Provider>
  )
}
