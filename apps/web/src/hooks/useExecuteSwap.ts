'use client'

import { useMutation } from '@tanstack/react-query'
import { BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { getVaultAddress, POT_PROGRAM_ID } from '@potbot/sdk'

import { useProgram } from './usePots'
import {
  prepareJupiterCpiPayload,
  JUPITER_V6_PROGRAM_ID,
} from '@/lib/jupiter-swap'

/**
 * Execute a Jupiter v6 swap through our program in AdminDirect mode.
 *
 * Caller is responsible for ensuring:
 *   - the strategy PDA referenced by `strategyPda` is in Pending status
 *   - vault has matching source/destination ATAs (sourceAta / destinationAta)
 *   - signer is pot.authority
 *
 * Slippage is bounded twice: off-chain via slippageBps and on-chain via
 * args.minOut (Jupiter's `otherAmountThreshold`).
 */
export function useExecuteSwap(potPubkey: string) {
  const program = useProgram()

  return useMutation({
    mutationFn: async (params: {
      inputMint: string
      outputMint: string
      amountLamports: number
      strategyPda: PublicKey
      sourceAta: PublicKey
      destinationAta: PublicKey
      isEntry?: boolean
      slippageBps?: number
    }) => {
      if (!program) throw new Error('Program not ready (wallet connected?)')

      const potKey = new PublicKey(potPubkey)
      const [vaultPda] = getVaultAddress(potKey)

      const payload = await prepareJupiterCpiPayload(
        params.inputMint,
        params.outputMint,
        params.amountLamports,
        vaultPda.toBase58(),
        params.slippageBps ?? 50,
      )

      const tx = await (program as any).methods
        .executeSwap({
          mode: { adminDirect: {} },
          amountIn: new BN(params.amountLamports),
          minOut: new BN(payload.minOut.toString()),
          maxIn: new BN(params.amountLamports),
          isEntry: params.isEntry ?? true,
          jupiterIxData: Array.from(payload.ixData),
        })
        .accounts({
          pot: potKey,
          strategy: params.strategyPda,
          vault: vaultPda,
          sourceAta: params.sourceAta,
          destinationAta: params.destinationAta,
          jupiterProgram: JUPITER_V6_PROGRAM_ID,
          // For AdminDirect we never read the Pyth account; pass the program
          // id as a sentinel.
          pythPriceUpdate: POT_PROGRAM_ID,
          authority: program.provider.publicKey!,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(payload.remainingAccounts)
        .rpc({ commitment: 'confirmed' })

      return { signature: tx as string, quote: payload.quote }
    },
  })
}
