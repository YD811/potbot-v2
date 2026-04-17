export interface AgentRule {
  id: string
  name: string
  enabled: boolean
  trigger: {
    type: 'price_above' | 'price_below' | 'time_interval' | 'pnl_above' | 'pnl_below' | 'balance_above' | 'balance_below'
    threshold?: number
    interval?: number  // minutes
    token?: string     // mint address
  }
  action: {
    type: 'propose_swap' | 'vote_yes' | 'alert' | 'dca_buy' | 'yield_deposit'
    amount?: number
    token?: string      // from mint
    toToken?: string    // to mint (for swaps)
    protocol?: string   // for yield deposits
  }
  cooldownMinutes: number
  lastTriggeredAt?: number  // Unix ms
}

export interface AgentEvalContext {
  prices: Record<string, number>
  ts: number
}

export interface Position {
  mint: string
  symbol: string
  amount: number
  entryPrice: number
  entryValue: number
}

export interface NavSnapshot {
  ts: number    // Unix seconds
  nav: number   // USD value
}
