import { Connection } from '@solana/web3.js'
import { getCommitment, getRpcUrl } from './rpc-config'

let singleton: Connection | null = null

export function getRpcConnection(): Connection {
  if (!singleton) {
    singleton = new Connection(getRpcUrl(), getCommitment())
  }
  return singleton
}

export function resetRpcConnection(): void {
  singleton = null
}
