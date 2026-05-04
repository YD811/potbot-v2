'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { usePot } from '@/hooks/usePots'
import {
  buildSquadsTransactionUrl,
  getMultisigForCreator,
  isSquadsVault,
} from '@/lib/squads'

interface Props {
  potPubkey: string
  txIndex?: number | null
}

export function SquadsBanner({ potPubkey, txIndex }: Props) {
  const { connection } = useConnection()
  const { data: pot } = usePot(potPubkey)
  const [isVault, setIsVault] = useState(false)
  const [multisigPda, setMultisigPda] = useState<PublicKey | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const potAny = pot as any
      const creator = potAny?.creator ?? potAny?.authority
      if (!creator) return

      try {
        const creatorPk = new PublicKey(creator)
        const vault = await isSquadsVault(creatorPk, connection)
        if (!vault || cancelled) {
          if (!cancelled) {
            setIsVault(false)
            setMultisigPda(null)
          }
          return
        }

        const multisig = await getMultisigForCreator(creatorPk, connection)
        if (!cancelled) {
          setIsVault(true)
          setMultisigPda(multisig)
        }
      } catch {
        if (!cancelled) {
          setIsVault(false)
          setMultisigPda(null)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [connection, (pot as any)?.authority, (pot as any)?.creator])

  if (!isVault) return null

  return (
    <div className="mb-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-100">
      <p className="text-sm">
        This pot is governed by a Squads multisig. Creator actions will be queued for multisig approval.
      </p>
      {multisigPda && typeof txIndex === 'number' && (
        <Link
          className="mt-2 inline-block text-xs text-blue-200 underline"
          href={buildSquadsTransactionUrl(multisigPda, txIndex)}
          target="_blank"
          rel="noreferrer"
        >
          View queued Squads transaction ↗
        </Link>
      )}
    </div>
  )
}
