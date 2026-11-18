'use client'

import React, { useMemo, ReactNode } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalGate } from '@/components/WalletModalGate'
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

  // Wallet Standard auto-detection only. Phantom, Solflare, Backpack, Jupiter
  // and the rest register themselves; legacy adapters made them appear twice
  // and broke connecting.
  const wallets = useMemo(() => [], [])

  return (
    <ThemeProvider>
      <PrivyClientProvider>
        <ConnectionProvider endpoint={endpoint}>
        {/* autoConnect: false — prevents the adapter from probing MetaMask/EVM extensions on load */}
        <WalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalGate>
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
          </WalletModalGate>
        </WalletProvider>
        </ConnectionProvider>
      </PrivyClientProvider>
    </ThemeProvider>
  )
}
