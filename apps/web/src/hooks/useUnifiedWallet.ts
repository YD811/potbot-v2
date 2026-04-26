'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWallets as usePrivySolanaWallets } from '@privy-io/react-auth/solana'
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

type UnifiedSignTransaction = (
  transaction: Transaction | VersionedTransaction
) => Promise<Transaction | VersionedTransaction>

type UnifiedSignAllTransactions = (
  transactions: (Transaction | VersionedTransaction)[]
) => Promise<(Transaction | VersionedTransaction)[]>

export function useUnifiedWallet() {
  const wallet = useWallet()
  const { ready, wallets } = usePrivySolanaWallets()

  const walletAdapterConnected = Boolean(wallet.connected && wallet.publicKey)
  const privyWallet = wallets[0] as {
    address?: string
    signTransaction?: UnifiedSignTransaction
    signAllTransactions?: UnifiedSignAllTransactions
  } | undefined
  const privyConnected = Boolean(ready && privyWallet?.address)

  if (walletAdapterConnected) {
    return {
      publicKey: wallet.publicKey,
      connected: true,
      source: 'wallet-adapter' as const,
      signTransaction: wallet.signTransaction as UnifiedSignTransaction | undefined,
      signAllTransactions: wallet.signAllTransactions as UnifiedSignAllTransactions | undefined,
    }
  }

  if (privyConnected) {
    return {
      publicKey: new PublicKey(privyWallet!.address!),
      connected: true,
      source: 'privy-embedded' as const,
      signTransaction: privyWallet?.signTransaction,
      signAllTransactions: privyWallet?.signAllTransactions,
    }
  }

  return {
    publicKey: null,
    connected: false,
    source: null,
    signTransaction: undefined,
    signAllTransactions: undefined,
  }
}
