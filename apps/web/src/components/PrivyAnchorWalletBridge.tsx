'use client'

import { Component, useMemo, type ReactNode } from 'react'
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import type { Wallet as AnchorWallet } from '@coral-xyz/anchor'
import { usePrivy } from '@privy-io/react-auth'
import { useSignTransaction, useWallets } from '@privy-io/react-auth/solana'
import { PrivyAnchorWalletContext } from '@/contexts/PrivyAnchorWalletContext'

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'
const SOLANA_CHAIN: `solana:${string}` =
  CLUSTER === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet'

/**
 * Belt-and-braces error boundary. If anything inside the Solana bridge
 * throws (Privy hooks misbehaving, version mismatch, missing peer),
 * we catch it and keep providing `null` for the wallet context so the
 * page doesn't go to the generic "Application error" screen.
 */
class BridgeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: unknown) {
    console.warn('[PrivyAnchorWalletBridge] crashed — falling back to null wallet:', err)
  }
  render() {
    if (this.state.hasError) {
      return (
        <PrivyAnchorWalletContext.Provider value={null}>
          {this.props.children}
        </PrivyAnchorWalletContext.Provider>
      )
    }
    return this.props.children
  }
}

/**
 * Outer entry point — wraps the inner authed bridge in an error
 * boundary and gates calls to the `/solana` hooks until Privy reports
 * `ready` AND the user is authenticated. The Solana hooks complain in
 * various ways when called before that, so this is the safe order.
 */
export function PrivyAnchorWalletBridge({ children }: { children: ReactNode }) {
  return (
    <BridgeErrorBoundary>
      <BridgeGate>{children}</BridgeGate>
    </BridgeErrorBoundary>
  )
}

function BridgeGate({ children }: { children: ReactNode }) {
  // `usePrivy` lives in the base package and is safe to call always.
  const { ready, authenticated } = usePrivy()

  // Until Privy has finished initialising AND the user has signed in,
  // there's nothing for the Solana hooks to consume — short-circuit
  // with a null wallet so the rest of the app keeps rendering.
  if (!ready || !authenticated) {
    return (
      <PrivyAnchorWalletContext.Provider value={null}>
        {children}
      </PrivyAnchorWalletContext.Provider>
    )
  }

  return <AuthedBridge>{children}</AuthedBridge>
}

function AuthedBridge({ children }: { children: ReactNode }) {
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
