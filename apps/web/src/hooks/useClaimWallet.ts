'use client'

import { useCallback, useMemo } from 'react'
import { Connection, Transaction } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'
import { usePrivy } from '@privy-io/react-auth'
import { useSignTransaction, useWallets } from '@privy-io/react-auth/solana'

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID

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
  ready: boolean
  connected: boolean
  address: string | null
  via: 'adapter' | 'privy' | null
  login: () => void
  signAndSend: (base64Tx: string) => Promise<string>
}

export function useClaimWallet(): ClaimWallet {
  const adapter = useWallet()
  const adapterConnected = Boolean(adapter.connected && adapter.publicKey)
  const adapterAddress = adapter.publicKey?.toBase58() ?? null

  let privyReady = true
  let privyAuthed = false
  let privyAddress: string | null = null
  let privyLogin: (() => void) = () => {}
  let privyWallet: any = null
  let privySign: any = null

  if (HAS_PRIVY) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const privy = usePrivy()
    privyReady = privy.ready
    privyAuthed = privy.authenticated
    privyAddress = privy.user?.wallet?.address ?? null
    privyLogin = privy.login
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const solWallets = useWallets()
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const solSign = useSignTransaction()
    privyWallet = solWallets.wallets?.[0] ?? null
    privySign = solSign.signTransaction
  }

  const privyConnected = privyAuthed && !!privyAddress
  const via: ClaimWallet['via'] = adapterConnected ? 'adapter' : privyConnected ? 'privy' : null
  const connected = via !== null
  const address = adapterConnected ? adapterAddress : privyAddress

  const signAndSend = useCallback(async (base64Tx: string): Promise<string> => {
    const tx = Transaction.from(base64ToBytes(base64Tx))
    let signed: Transaction

    if (adapterConnected && adapter.signTransaction) {
      signed = await adapter.signTransaction(tx)
    } else if (privyWallet && privySign) {
      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false })
      const out = await privySign({
        transaction: new Uint8Array(serialized),
        wallet: privyWallet,
        chain: 'solana:mainnet' as `solana:${string}`,
      })
      signed = Transaction.from(out.signedTransaction)
    } else {
      throw new Error('wallet_not_connected')
    }

    // SNS lives on mainnet — always send through a mainnet RPC,
    // not the app's default connection (which may be devnet).
    const mainnet = getMainnetConnection()
    const sig = await mainnet.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 })
    await mainnet.confirmTransaction(sig, 'confirmed')
    return sig
  }, [adapterConnected, adapter, privyWallet, privySign])

  return useMemo(() => ({
    ready: privyReady,
    connected,
    address,
    via,
    login: privyLogin,
    signAndSend,
  }), [privyReady, connected, address, via, privyLogin, signAndSend])
}
