'use client'

import { useCallback } from 'react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useLogin } from '@privy-io/react-auth'
import { useTheme } from '@/contexts/ThemeContext'

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID

/**
 * Opens the same connect flow as the navbar button: the email / Google login
 * in light (Normie) mode when Privy is configured, the wallet list otherwise.
 */
export function useOpenConnect(): () => void {
  const { isLight } = useTheme()
  const { setVisible } = useWalletModal()
  // HAS_PRIVY is a build-time constant, so the hook order never changes.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const privyLogin = HAS_PRIVY ? useLogin().login : null

  return useCallback(() => {
    if (isLight && privyLogin) privyLogin()
    else setVisible(true)
  }, [isLight, privyLogin, setVisible])
}
