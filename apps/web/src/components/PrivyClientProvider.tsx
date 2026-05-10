'use client'

import { type ReactNode } from 'react'
import nextDynamic from 'next/dynamic'
import { PrivyProvider } from '@privy-io/react-auth'

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID

/**
 * The Solana bridge calls Privy's `/solana` hooks, which crash Next.js
 * static prerender at module-eval time. Load the bridge client-only so
 * the Solana subpath never appears in the server bundle.
 */
const PrivyAnchorWalletBridge = nextDynamic(
  () => import('./PrivyAnchorWalletBridge').then((m) => m.PrivyAnchorWalletBridge),
  { ssr: false },
)

/**
 * Wraps the app in PrivyProvider when an app id is configured. When
 * `NEXT_PUBLIC_PRIVY_APP_ID` is missing we render children unchanged so
 * the app keeps booting in environments (CI, local-without-Privy) where
 * the env var hasn't been set yet. Dark-mode (Crypto) flows never
 * touch Privy regardless — they always use @solana/wallet-adapter.
 */
export function PrivyClientProvider({ children }: { children: ReactNode }) {
  if (!APP_ID) return <>{children}</>

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        // Normie-mode login surface: email + Google + Twitter + LinkedIn,
        // plus injected wallet for users who already have Phantom.
        loginMethods: ['email', 'google', 'twitter', 'linkedin', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#15803d',
          logo: 'https://potbot.fun/og-image.png',
          // Hide Ethereum UI in the login modal — we only operate on Solana.
          walletChainType: 'solana-only',
        },
        embeddedWallets: {
          // Solana embedded wallet only. Drop the Ethereum block so a
          // new user doesn't have an EVM address attached to their POT
          // account that we'd never use.
          solana: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      <PrivyAnchorWalletBridge>{children}</PrivyAnchorWalletBridge>
    </PrivyProvider>
  )
}
