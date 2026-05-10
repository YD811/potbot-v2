'use client'

import React, { useMemo, ReactNode } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
// Import each wallet from its own package, NOT the @solana/wallet-adapter-
// wallets meta-package — that barrel pulls every adapter (Backpack, Glow,
// Coin98, Trust, etc.) and adds ~120 kB to the initial JS bundle even
// though we only ship Phantom + Solflare. Direct imports tree-shake
// cleanly.
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { getRpcUrl } from '@/lib/rpc'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { PrivyClientProvider } from '@/components/PrivyClientProvider'

import '@solana/wallet-adapter-react-ui/styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => getRpcUrl(),
    []
  )

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  return (
    <ThemeProvider>
      <PrivyClientProvider>
        <ConnectionProvider endpoint={endpoint}>
        {/* autoConnect: false — prevents the adapter from probing MetaMask/EVM extensions on load */}
        <WalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalProvider>
            <QueryClientProvider client={queryClient}>
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#1a1a2e',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  },
                }}
              />
            </QueryClientProvider>
          </WalletModalProvider>
        </WalletProvider>
        </ConnectionProvider>
      </PrivyClientProvider>
    </ThemeProvider>
  )
}
