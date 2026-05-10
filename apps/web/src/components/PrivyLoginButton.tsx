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
        className="px-4 py-2 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold border border-gray-200"
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
        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition whitespace-nowrap"
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
      className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-sm font-semibold transition whitespace-nowrap"
      title="Click to disconnect"
    >
      {display}
    </button>
  )
}
