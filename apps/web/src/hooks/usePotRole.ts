'use client'

import { useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMembers, usePot } from '@/hooks/usePots'

export type PotRole = 'creator' | 'member' | 'viewer'

export function derivePotRole(params: {
  walletPubkey?: string
  creator?: string
  members?: Array<{ wallet?: string; pubkey?: string }>
}): PotRole {
  const { walletPubkey, creator, members = [] } = params
  if (!walletPubkey) return 'viewer'
  if (creator && walletPubkey === creator) return 'creator'

  const isMember = members.some((member) => {
    const memberAddress = member.wallet ?? member.pubkey
    return memberAddress === walletPubkey
  })

  return isMember ? 'member' : 'viewer'
}

export function usePotRole(potPubkey?: string): { role: PotRole; isLoading: boolean } {
  const { publicKey } = useWallet()
  const { data: pot, isLoading: isPotLoading } = usePot(potPubkey)
  const { data: members = [], isLoading: isMembersLoading } = useMembers(potPubkey)

  const role = useMemo(
    () =>
      derivePotRole({
        walletPubkey: publicKey?.toBase58(),
        creator: (pot as any)?.creator ?? (pot as any)?.authority,
        members: members as Array<{ wallet?: string; pubkey?: string }>,
      }),
    [publicKey, pot, members]
  )

  return {
    role,
    isLoading: isPotLoading || isMembersLoading,
  }
}
