'use client'

import React, { useMemo, ReactNode } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { getRpcUrl } from '@/lib/rpc'

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

const SolanaConnectionProvider = ConnectionProvider as any
const SolanaWalletProvider = WalletProvider as any
const SolanaWalletModalProvider = WalletModalProvider as any

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
    <SolanaConnectionProvider endpoint={endpoint}>
      {/* autoConnect: false — prevents the adapter from probing MetaMask/EVM extensions on load */}
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <SolanaWalletModalProvider>
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
        </SolanaWalletModalProvider>
      </SolanaWalletProvider>
    </SolanaConnectionProvider>
  )
}
