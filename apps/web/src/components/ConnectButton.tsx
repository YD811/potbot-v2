'use client'

import dynamic from 'next/dynamic'
import { useTheme } from '@/contexts/ThemeContext'
import { PrivyLoginButton } from '@/components/PrivyLoginButton'

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID

// Wallet-adapter button is a client-only ESM component — defer it.
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

/**
 * Replaces the standalone wallet-adapter button in the navbar.
 *
 *   Dark mode (Crypto):  identical to the previous build — Phantom /
 *                        Solflare via @solana/wallet-adapter.
 *   Light mode (Normie): Privy login (email or Google), with an embedded
 *                        Solana wallet auto-created so the user can sign
 *                        without ever installing Phantom.
 *
 * If `NEXT_PUBLIC_PRIVY_APP_ID` is unset we always fall back to the
 * wallet-adapter button so the app still works without Privy keys.
 */
export function ConnectButton() {
  const { isLight } = useTheme()
  if (isLight && HAS_PRIVY) return <PrivyLoginButton />
  return <WalletMultiButtonDynamic />
}
