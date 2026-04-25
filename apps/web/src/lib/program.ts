import { AnchorProvider, Program } from '@coral-xyz/anchor'
import type { Wallet, Idl } from '@coral-xyz/anchor'
import { getRpcConnection } from './rpc'
import { getProgramId } from './rpc-config'
import { IDL } from '@potbot/sdk'

/** Build an Anchor Program client against the configured network + program id. */
export function makeProgram(wallet: Wallet): Program {
  const provider = new AnchorProvider(getRpcConnection(), wallet, { commitment: 'confirmed' })
  return new Program({ ...(IDL as Idl), address: getProgramId().toBase58() } as Idl, provider)
}
