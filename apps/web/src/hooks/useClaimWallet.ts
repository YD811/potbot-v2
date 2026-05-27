'use client'

import { useCallback, useContext, useMemo } from 'react'
import { Connection, Transaction } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'
import { PrivyAnchorWalletContext } from '@/contexts/PrivyAnchorWalletContext'

const SNS_RPC =
  process.env.NEXT_PUBLIC_SNS_RPC_URL ??
  'https://api.mainnet-beta.solana.com'

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

let _mainnetConn: Connection | null = null
function getMainnetConnection(): Connection {
  if (!_mainnetConn) _mainnetConn = new Connection(SNS_RPC, 'confirmed')
  return _mainnetConn
}

export interface ClaimWallet {
  connected: boolean
  address: string | null
  via: 'adapter' | 'privy' | null
  signAndSend: (base64Tx: string) => Promise<string>
}

export function useClaimWallet(): ClaimWallet {
  const adapter = useWallet()
  const adapterConnected = Boolean(adapter.connected && adapter.publicKey)
  const adapterAddress = adapter.publicKey?.toBase58() ?? null

  const privyWallet = useContext(PrivyAnchorWalletContext)
  const privyConnected = Boolean(privyWallet?.publicKey)
  const privyAddress = privyWallet?.publicKey?.toBase58() ?? null

  const via: ClaimWallet['via'] = adapterConnected ? 'adapter' : privyConnected ? 'privy' : null
  const connected = via !== null
  const address = adapterConnected ? adapterAddress : privyAddress

  const signAndSend = useCallback(async (base64Tx: string): Promise<string> => {
    const tx = Transaction.from(base64ToBytes(base64Tx))
    let signed: Transaction

    if (adapterConnected && adapter.signTransaction) {
      signed = await adapter.signTransaction(tx)
    } else if (privyWallet) {
      signed = await privyWallet.signTransaction(tx) as Transaction
    } else {
      throw new Error('wallet_not_connected')
    }

    const mainnet = getMainnetConnection()
    const sig = await mainnet.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 })
    await mainnet.confirmTransaction(sig, 'confirmed')
    return sig
  }, [adapterConnected, adapter, privyWallet])

  return useMemo(() => ({ connected, address, via, signAndSend }),
    [connected, address, via, signAndSend])
}
