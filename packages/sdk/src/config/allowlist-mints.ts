import { PublicKey } from '@solana/web3.js'

export interface AllowlistMint {
  symbol: string
  decimals: number
  mint: PublicKey
}

export const DEVNET_ALLOWLIST: AllowlistMint[] = [
  {
    symbol: 'SOL',
    decimals: 9,
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
  },
  {
    symbol: 'USDC',
    decimals: 6,
    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  },
  {
    symbol: 'JUP',
    decimals: 6,
    mint: new PublicKey('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'),
  },
]
