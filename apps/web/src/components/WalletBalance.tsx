'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { useSolPrice, formatUsd } from '@/lib/prices'

export function WalletBalance() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { price: solPrice } = useSolPrice()

  const { data: lamports, isLoading } = useQuery({
    queryKey: ['sol-balance', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return null
      return connection.getBalance(publicKey)
    },
    enabled: !!publicKey,
    refetchInterval: 15_000,
    staleTime: 10_000,
  })

  if (!publicKey) return null

  const sol = lamports != null ? lamports / 1e9 : null
  const usd = sol != null && solPrice ? solPrice * sol : null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm">
      <span className="text-gray-400">Balance:</span>
      {isLoading ? (
        <span className="text-gray-500 animate-pulse">…</span>
      ) : sol != null ? (
        <>
          <span className="font-semibold text-white">{sol.toFixed(4)} SOL</span>
          {usd != null && (
            <span className="text-gray-500 text-xs">({formatUsd(usd)})</span>
          )}
        </>
      ) : (
        <span className="text-gray-500">—</span>
      )}
    </div>
  )
}
