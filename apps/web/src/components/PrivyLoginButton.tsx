'use client'

import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth'

/**
 * Privy-powered login button. Only mounted by ConnectButton when light
 * theme is active AND `NEXT_PUBLIC_PRIVY_APP_ID` is set, so this file is
 * safe to import even when Privy isn't configured — its hooks will
 * never run in that case.
 */
export function PrivyLoginButton() {
  const { ready, authenticated, user } = usePrivy()
  const { login } = useLogin()
  const { logout } = useLogout()

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 rounded-full border border-pot-border bg-pot-card text-pot-muted text-sm font-semibold"
      >
        Loading…
      </button>
    )
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={() => login()}
        className="px-4 py-2 rounded-full bg-pot-accent hover:brightness-110 text-pot-dark text-sm font-semibold transition whitespace-nowrap"
      >
        Connect with email or Google
      </button>
    )
  }

  const walletAddr = user?.wallet?.address
  const display =
    user?.email?.address ??
    user?.google?.email ??
    (walletAddr ? `${walletAddr.slice(0, 4)}…${walletAddr.slice(-4)}` : 'Connected')

  return (
    <button
      type="button"
      onClick={() => logout()}
      className="px-4 py-2 rounded-full border border-pot-border bg-pot-card hover:border-pot-muted text-white text-sm font-semibold transition whitespace-nowrap"
      title="Click to disconnect"
    >
      {display}
    </button>
  )
}
