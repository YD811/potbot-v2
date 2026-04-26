'use client'

import { ReactNode, useRef } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'

export function PrivyProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const didWarnRef = useRef(false)

  if (!appId) {
    if (!didWarnRef.current) {
      console.warn('NEXT_PUBLIC_PRIVY_APP_ID is missing. Rendering without PrivyProvider.')
      didWarnRef.current = true
    }
    return <>{children}</>
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google', 'twitter', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#7C3AED',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
