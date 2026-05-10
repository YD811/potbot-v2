'use client'

import { type ReactNode } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID

/**
 * Wraps the app in PrivyProvider when an app id is configured. When
 * `NEXT_PUBLIC_PRIVY_APP_ID` is missing we render children unchanged so
 * the app keeps booting in environments (CI, local-without-Privy) where
 * the env var hasn't been set yet. The dark-mode (Crypto) flow never
 * touches Privy regardless — it always uses @solana/wallet-adapter.
 */
export function PrivyClientProvider({ children }: { children: ReactNode }) {
  if (!APP_ID) return <>{children}</>

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        // Normie-mode login surface: email + Google + injected wallet.
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#16a34a',
          logo: 'https://potbot.fun/og-image.png',
        },
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
          solana:   { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
