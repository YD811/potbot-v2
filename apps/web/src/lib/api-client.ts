/**
 * PotBot API Client — typed interface to the backend
 * Centralizes all API calls so the frontend never calls Jupiter/Solana directly
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface PricesResponse {
  prices: Record<string, number>
  count: number
  ts: number
}

export interface VaultAnalytics {
  pubkey: string
  navUsd: number
  navPerShareUsd: number
  totalShares: number
  pnlUsd: number
  pnlPct: number
  apy30d: number
  apy7d: number
  positions: PositionWithPnl[]
  solBalanceLamports: number
  solBalanceUsd: number
  /** Total executed swaps for this vault (mirrors PotAccount.tradeCount on-chain). */
  tradeCount?: number
  updatedAt: number
  cached?: boolean
}

export interface PositionWithPnl {
  mint: string
  symbol: string
  amount: number
  entryPrice: number
  entryValue: number
  currentPrice: number
  currentValue: number
  unrealizedPnlUsd: number
  unrealizedPnlPct: number
}

export interface YieldOpportunity {
  protocol: string
  name: string
  token: string
  mint: string
  apy: number
  tvlUsd: number
  risk: 'low' | 'medium' | 'high'
  url: string
  tags: string[]
}

export interface YieldResponse {
  opportunities: YieldOpportunity[]
  count: number
  ts: number
}

export interface AgentRule {
  id: string
  name: string
  enabled: boolean
  trigger: {
    type: string
    threshold?: number
    interval?: number
    token?: string
  }
  action: {
    type: string
    amount?: number
    token?: string
    toToken?: string
  }
  cooldownMinutes: number
  lastTriggeredAt?: number
}

export interface AgentLog {
  id: string
  potPubkey: string
  ruleId: string
  ruleName: string
  triggerDesc: string
  actionDesc: string
  proposalCreated: boolean
  proposalId?: string
  error?: string
  ts: number
}

// ── Prices ───────────────────────────────────────────────────────────────────

export const pricesApi = {
  get: (mints: string[]) =>
    apiFetch<PricesResponse>(`/prices?ids=${mints.join(',')}`),

  getOne: (mint: string) =>
    apiFetch<{ mint: string; price: number; ts: number }>(`/prices/${mint}`),
}

// ── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getVault: (pubkey: string) =>
    apiFetch<VaultAnalytics>(`/analytics/${pubkey}`),

  updatePositions: (pubkey: string, positions: Omit<PositionWithPnl, 'currentPrice' | 'currentValue' | 'unrealizedPnlUsd' | 'unrealizedPnlPct'>[]) =>
    apiFetch<{ ok: boolean }>(`/analytics/${pubkey}/positions`, {
      method: 'POST',
      body: JSON.stringify({ positions }),
    }),
}

// ── Yield ────────────────────────────────────────────────────────────────────

export const yieldApi = {
  getOpportunities: (params?: { risk?: string; token?: string; protocol?: string }) => {
    const qs = new URLSearchParams()
    if (params?.risk)     qs.set('risk', params.risk)
    if (params?.token)    qs.set('token', params.token)
    if (params?.protocol) qs.set('protocol', params.protocol)
    const q = qs.toString()
    return apiFetch<YieldResponse>(`/yield/opportunities${q ? `?${q}` : ''}`)
  },

  getBest: (token: string) =>
    apiFetch<{ token: string; opportunities: YieldOpportunity[]; bestApy: number }>(
      `/yield/best/${token}`
    ),
}

// ── Agent ────────────────────────────────────────────────────────────────────

export const agentApi = {
  getRules: (pubkey: string) =>
    apiFetch<{ rules: AgentRule[]; potPubkey: string }>(`/agent/${pubkey}/rules`),

  updateRules: (pubkey: string, rules: AgentRule[]) =>
    apiFetch<{ ok: boolean; count: number }>(`/agent/${pubkey}/rules`, {
      method: 'POST',
      body: JSON.stringify({ rules }),
    }),

  getLogs: (pubkey: string, limit = 50) =>
    apiFetch<{ logs: AgentLog[]; count: number }>(`/agent/${pubkey}/logs?limit=${limit}`),

  trigger: (pubkey: string) =>
    apiFetch<{ ok: boolean; message: string }>(`/agent/${pubkey}/trigger`, { method: 'POST' }),
}

// ── Health ───────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () =>
    apiFetch<{ status: string; version: string; ts: number }>('/health'),
}
