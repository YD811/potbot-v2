'use client'

import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'
import { usePrivy } from '@privy-io/react-auth'

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

const AUTH_BUTTON_CLASS =
  'rounded-2xl bg-primary text-white px-4 py-2 transition hover:opacity-90'

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export function AuthButton() {
  const { connected } = useWallet()
  const { ready, authenticated, user, login, logout } = usePrivy()

  if (connected) {
    return <WalletMultiButtonDynamic />
  }

  if (ready && !authenticated) {
    return (
      <button type="button" className={AUTH_BUTTON_CLASS} onClick={login}>
        Sign in
      </button>
    )
  }

  if (ready && authenticated) {
    const label =
      user?.email?.address ||
      user?.wallet?.address ||
      user?.linkedAccounts?.find((account) => account.type === 'wallet')?.address ||
      'Account'

    return (
      <button type="button" className={AUTH_BUTTON_CLASS} onClick={logout}>
        {label.includes('@') ? label : truncateAddress(label)}
      </button>
    )
  }

  return <WalletMultiButtonDynamic />
}
