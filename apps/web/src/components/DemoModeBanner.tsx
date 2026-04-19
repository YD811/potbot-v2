'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { healthApi } from '@/lib/api-client'

export function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(false)

  const { isError: apiDown } = useQuery({
    queryKey: ['api-health'],
    queryFn: healthApi.check,
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 25_000,
  })

  if (!apiDown || dismissed) return null

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-300">
          <span className="text-base">🎮</span>
          <span>
            <span className="font-semibold">Demo Mode</span>
            {' '}— running with simulated vault data. Connect your wallet and deploy the program to go live.
          </span>
          <a
            href="https://github.com/YD811/potbot-v2"
            target="_blank"
            rel="noreferrer"
            className="underline text-amber-200 hover:text-white transition hidden sm:inline"
          >
            Setup guide ↗
          </a>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-400 hover:text-white transition text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
