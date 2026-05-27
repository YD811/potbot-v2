'use client'

import { useCallback, useMemo } from 'react'
import { Transaction } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { usePrivy } from '@privy-io/react-auth'
import { useSignTransaction, useWallets } from '@privy-io/react-auth/solana'

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'
const SOLANA_CHAIN: `solana:${string}` =
  CLUSTER === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet'

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export interface ClaimWallet {
  ready: boolean
  connected: boolean
  address: string | null
  via: 'adapter' | 'privy' | null
  login: () => void
  signAndSend: (base64Tx: string) => Promise<string>
}

export function useClaimWallet(): ClaimWallet {
  const { connection } = useConnection()
  const adapter = useWallet()
  const adapterConnected = Boolean(adapter.connected && adapter.publicKey)
  const adapterAddress = adapter.publicKey?.toBase58() ?? null

  const { ready, authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  const { signTransaction: privySign } = useSignTransaction()
  const privyWallet = wallets?.[0] ?? null
  const privyAddress = privyWallet?.address ?? null
  const privyConnected = Boolean(authenticated && privyAddress)

  const via: ClaimWallet['via'] = adapterConnected ? 'adapter' : privyConnected ? 'privy' : null
  const connected = via !== null
  const address = adapterConnected ? adapterAddress : privyAddress

  const signAndSend = useCallback(async (base64Tx: string): Promise<string> => {
    const tx = Transaction.from(base64ToBytes(base64Tx))
    let signed: Transaction
    if (adapterConnected && adapter.signTransaction) {
      signed = await adapter.signTransaction(tx)
    } else if (privyWallet) {
      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false })
      const out = await privySign({
        transaction: new Uint8Array(serialized),
        wallet: privyWallet,
        chain: SOLANA_CHAIN,
      })
      signed = Transaction.from(out.signedTransaction)
    } else {
      throw new Error('wallet_not_connected')
    }
    const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 })
    await connection.confirmTransaction(sig, 'confirmed')
    return sig
  }, [adapterConnected, adapter, privyWallet, privySign, connection])

  const doLogin = useCallback(() => { login() }, [login])

  return useMemo(() => ({ ready, connected, address, via, login: doLogin, signAndSend }),
    [ready, connected, address, via, doLogin, signAndSend])
}
