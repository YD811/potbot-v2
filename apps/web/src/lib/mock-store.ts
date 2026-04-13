/**
 * In-memory mock store for demo mode.
 * Simulates on-chain state so the full flow is clickable without deploying the program.
 * When the program is deployed on devnet, the hooks switch to real Anchor calls automatically.
 *
 * Yield accrual:
 *   Runs every YIELD_TICK_MS and adds APY-based yield to pots with yield strategies.
 *   This simulates Meteora Dynamic Vault earning in real-time for the demo.
 */

import { create } from 'zustand'
import { Keypair } from '@solana/web3.js'

// ── Yield config by strategy ───────────────────────────────────────────────────
const YIELD_APY: Record<number, number> = {
  0: 0,      // None
  1: 0.06,   // Conservative  ~6% APY
  2: 0.15,   // Balanced      ~15% APY
  3: 0.30,   // Aggressive    ~30% APY
  4: 0.40,   // JLP           ~40% APY (Jupiter LP + Drift hedge)
}

const YIELD_RESERVE_PCT: Record<number, number> = {
  0: 1.00,  // 100% liquid
  1: 0.70,  // 70% liquid, 30% earning
  2: 0.40,  // 40% liquid, 60% earning
  3: 0.20,  // 20% liquid, 80% earning
  4: 0.80,  // 20% liquid, 80% in JLP (delta-hedged)
}

const YIELD_TICK_MS = 10_000  // accrue yield every 10s (demo speed-up)
const SECS_PER_YEAR = 365 * 86400

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface TokenHolding {
  mint: string
  symbol: string
  icon: string
  amount: number   // UI units
  decimals: number
}

export interface MockPot {
  pubkey: string
  name: string
  emoji: string
  balance: number      // liquid SOL in vault
  totalShares: number
  memberCount: number
  tradeCount: number
  totalVolume: number
  tamagotchiLevel: number
  tamagotchiXp: number
  isPublic: boolean
  yieldStrategy: number
  tradeLevel: number
  withdrawLevel: number
  authority: string
  createdAt: number    // unix ms
  nextProposalId: number
  holdings?: TokenHolding[]

  // ── Yield (Meteora mock) ──────────────────────────────────────────────────
  meteoraLpBalance: number    // SOL-equivalent deposited in Meteora
  totalYieldEarned: number    // cumulative SOL earned via yield
  lastYieldAccrualAt: number  // unix ms

  // ── ETF tokenization ──────────────────────────────────────────────────────
  mode: 'virtual' | 'tokenized'
  tokenTicker: string         // set when tokenized
  navPerShareBps: number      // 10000 = 1.0x, no change; grows with yield/profit
}

export interface MockMember {
  potPubkey: string
  wallet: string
  shares: number
  depositTotal: number
  withdrawTotal: number
  joinedAt: number
}

export interface MockProposal {
  pubkey: string
  potPubkey: string
  proposalId: number
  proposer: string
  type: string
  description: string
  status: 'active' | 'passed' | 'rejected' | 'executed' | 'expired'
  yesShares: number
  noShares: number
  totalSharesSnapshot: number
  createdAt: Date
  voters: string[]
}

/* ── Seed data ──────────────────────────────────────────────────────────────── */

const SEED_POTS: MockPot[] = [
  {
    pubkey: 'DemoPoT1111111111111111111111111111111111111',
    name: 'Diamond Hands DAO',
    emoji: '💎',
    balance: 42.5,
    totalShares: 42500,
    memberCount: 5,
    tradeCount: 12,
    totalVolume: 156.3,
    tamagotchiLevel: 3,
    tamagotchiXp: 2400,
    isPublic: true,
    yieldStrategy: 2,    // Balanced — 15% APY, 60% in Meteora
    tradeLevel: 2,
    withdrawLevel: 2,
    authority: 'SeedAuth1111111111111111111111111111111111',
    createdAt: Date.now() - 7 * 86400000,
    nextProposalId: 3,
    holdings: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', icon: '💵', amount: 820,  decimals: 6 },
      { mint: 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7', symbol: 'JUP',  icon: '🪐', amount: 1200, decimals: 6 },
    ],
    meteoraLpBalance: 25.5,  // 60% of balance earning
    totalYieldEarned: 0.42,
    lastYieldAccrualAt: Date.now(),
    mode: 'virtual',
    tokenTicker: '',
    navPerShareBps: 10098,   // +0.98% profit so far
  },
  {
    pubkey: 'DemoPoT2222222222222222222222222222222222222',
    name: 'Degen Squad',
    emoji: '🐸',
    balance: 8.2,
    totalShares: 8200,
    memberCount: 3,
    tradeCount: 28,
    totalVolume: 310.7,
    tamagotchiLevel: 4,
    tamagotchiXp: 8500,
    isPublic: true,
    yieldStrategy: 3,    // Aggressive — 30% APY, 80% in Meteora
    tradeLevel: 1,
    withdrawLevel: 1,
    authority: 'SeedAuth2222222222222222222222222222222222',
    createdAt: Date.now() - 14 * 86400000,
    nextProposalId: 5,
    holdings: [
      { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u', symbol: 'BONK', icon: '🐕', amount: 125_000_000, decimals: 5 },
      { mint: 'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ', symbol: 'WIF',  icon: '🐶', amount: 480,        decimals: 6 },
    ],
    meteoraLpBalance: 6.56,
    totalYieldEarned: 0.31,
    lastYieldAccrualAt: Date.now(),
    mode: 'virtual',
    tokenTicker: '',
    navPerShareBps: 10150,   // +1.5% (aggressive earns more)
  },
  {
    pubkey: 'DemoPoT3333333333333333333333333333333333333',
    name: 'Safe Stack',
    emoji: '🛡️',
    balance: 125.0,
    totalShares: 125000,
    memberCount: 8,
    tradeCount: 4,
    totalVolume: 45.2,
    tamagotchiLevel: 2,
    tamagotchiXp: 890,
    isPublic: false,
    yieldStrategy: 1,    // Conservative — 6% APY, 30% in Meteora
    tradeLevel: 3,
    withdrawLevel: 3,
    authority: 'SeedAuth3333333333333333333333333333333333',
    createdAt: Date.now() - 21 * 86400000,
    nextProposalId: 2,
    holdings: [
      { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'JitoSOL', icon: '🔥', amount: 62.5, decimals: 9 },
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC',    icon: '💵', amount: 5400, decimals: 6 },
    ],
    meteoraLpBalance: 37.5,
    totalYieldEarned: 0.24,
    lastYieldAccrualAt: Date.now(),
    mode: 'virtual',
    tokenTicker: '',
    navPerShareBps: 10019,
  },
  {
    pubkey: 'DemoPoT4444444444444444444444444444444444444',
    name: 'Alpha Hunters',
    emoji: '🦅',
    balance: 87.3,
    totalShares: 87300,
    memberCount: 11,
    tradeCount: 47,
    totalVolume: 892.4,
    tamagotchiLevel: 5,
    tamagotchiXp: 15200,
    isPublic: true,
    yieldStrategy: 2,    // Balanced
    tradeLevel: 2,
    withdrawLevel: 2,
    authority: 'SeedAuth4444444444444444444444444444444444',
    createdAt: Date.now() - 30 * 86400000,
    nextProposalId: 12,
    holdings: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', icon: '💵', amount: 3200,        decimals: 6 },
      { mint: 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7', symbol: 'JUP',  icon: '🪐', amount: 8500,        decimals: 6 },
      { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u', symbol: 'BONK', icon: '🐕', amount: 450_000_000, decimals: 5 },
    ],
    meteoraLpBalance: 52.4,
    totalYieldEarned: 1.84,
    lastYieldAccrualAt: Date.now(),
    // Tokenized! This pot has gone through the full lifecycle
    mode: 'tokenized',
    tokenTicker: 'ALPHA',
    navPerShareBps: 10840,   // +8.4% total return
  },
  {
    pubkey: 'DemoPoT5555555555555555555555555555555555555',
    name: 'Moon Frogs',
    emoji: '🌙',
    balance: 19.8,
    totalShares: 19800,
    memberCount: 4,
    tradeCount: 63,
    totalVolume: 445.1,
    tamagotchiLevel: 4,
    tamagotchiXp: 11000,
    isPublic: true,
    yieldStrategy: 3,    // Aggressive
    tradeLevel: 1,
    withdrawLevel: 1,
    authority: 'SeedAuth5555555555555555555555555555555555',
    createdAt: Date.now() - 10 * 86400000,
    nextProposalId: 8,
    holdings: [
      { mint: 'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ', symbol: 'WIF',  icon: '🐶', amount: 2100,        decimals: 6 },
      { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u', symbol: 'BONK', icon: '🐕', amount: 900_000_000, decimals: 5 },
    ],
    meteoraLpBalance: 15.84,
    totalYieldEarned: 0.55,
    lastYieldAccrualAt: Date.now(),
    mode: 'virtual',
    tokenTicker: '',
    navPerShareBps: 10278,
  },
  {
    pubkey: 'DemoPoT6666666666666666666666666666666666666',
    name: 'Yield Farmers',
    emoji: '🌾',
    balance: 210.0,
    totalShares: 210000,
    memberCount: 15,
    tradeCount: 8,
    totalVolume: 67.5,
    tamagotchiLevel: 2,
    tamagotchiXp: 1200,
    isPublic: true,
    yieldStrategy: 1,    // Conservative
    tradeLevel: 3,
    withdrawLevel: 3,
    authority: 'SeedAuth6666666666666666666666666666666666',
    createdAt: Date.now() - 45 * 86400000,
    nextProposalId: 4,
    holdings: [
      { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'JitoSOL', icon: '🔥', amount: 98.5,  decimals: 9 },
      { mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL',    icon: '💎', amount: 45.2,  decimals: 9 },
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC',    icon: '💵', amount: 12000, decimals: 6 },
    ],
    meteoraLpBalance: 63.0,
    totalYieldEarned: 2.31,
    lastYieldAccrualAt: Date.now(),
    mode: 'virtual',
    tokenTicker: '',
    navPerShareBps: 10110,
  },
  {
    pubkey: 'DemoPoT7777777777777777777777777777777777777',
    name: 'JLP Hedged Vault',
    emoji: '⚡',
    balance: 48.0,
    totalShares: 48000,
    memberCount: 7,
    tradeCount: 22,
    totalVolume: 384.5,
    tamagotchiLevel: 3,
    tamagotchiXp: 3800,
    isPublic: true,
    yieldStrategy: 4,    // JLP — 40% APY, delta-hedged via Drift
    tradeLevel: 2,
    withdrawLevel: 2,
    authority: 'SeedAuth7777777777777777777777777777777777',
    createdAt: Date.now() - 12 * 86400000,
    nextProposalId: 3,
    holdings: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC',  icon: '💵', amount: 2400, decimals: 6 },
      { mint: 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7', symbol: 'JUP',   icon: '🪐', amount: 3200, decimals: 6 },
      { mint: 'So11111111111111111111111111111111111111112',  symbol: 'SOL',   icon: '◎',  amount: 9.6,  decimals: 9 },
    ],
    meteoraLpBalance: 38.4,   // 80% in JLP
    totalYieldEarned: 1.28,
    lastYieldAccrualAt: Date.now(),
    mode: 'virtual',
    tokenTicker: '',
    navPerShareBps: 10342,   // +3.42% in 12 days (40% APY is ~0.11%/day)
  },
]

const SEED_MEMBERS: MockMember[] = [
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'SeedAuth1111111111111111111111111111111111', shares: 20000, depositTotal: 20.0, withdrawTotal: 0, joinedAt: Date.now() - 7 * 86400000 },
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'Member1A1111111111111111111111111111111111', shares: 10000, depositTotal: 10.0, withdrawTotal: 0, joinedAt: Date.now() - 6 * 86400000 },
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'Member1B1111111111111111111111111111111111', shares: 5000,  depositTotal: 5.0,  withdrawTotal: 0, joinedAt: Date.now() - 5 * 86400000 },
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'Member1C1111111111111111111111111111111111', shares: 4500,  depositTotal: 4.5,  withdrawTotal: 0, joinedAt: Date.now() - 3 * 86400000 },
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'Member1D1111111111111111111111111111111111', shares: 3000,  depositTotal: 3.0,  withdrawTotal: 0, joinedAt: Date.now() - 1 * 86400000 },
  { potPubkey: 'DemoPoT4444444444444444444444444444444444444', wallet: 'SeedAuth4444444444444444444444444444444444', shares: 40000, depositTotal: 40.0, withdrawTotal: 0, joinedAt: Date.now() - 30 * 86400000 },
  { potPubkey: 'DemoPoT4444444444444444444444444444444444444', wallet: 'Member4A1111111111111111111111111111111111', shares: 25000, depositTotal: 25.0, withdrawTotal: 0, joinedAt: Date.now() - 25 * 86400000 },
  { potPubkey: 'DemoPoT4444444444444444444444444444444444444', wallet: 'Member4B1111111111111111111111111111111111', shares: 22300, depositTotal: 22.3, withdrawTotal: 0, joinedAt: Date.now() - 20 * 86400000 },
  { potPubkey: 'DemoPoT7777777777777777777777777777777777777', wallet: 'SeedAuth7777777777777777777777777777777777', shares: 20000, depositTotal: 20.0, withdrawTotal: 0, joinedAt: Date.now() - 12 * 86400000 },
  { potPubkey: 'DemoPoT7777777777777777777777777777777777777', wallet: 'Member7A1111111111111111111111111111111111', shares: 12000, depositTotal: 12.0, withdrawTotal: 0, joinedAt: Date.now() - 11 * 86400000 },
  { potPubkey: 'DemoPoT7777777777777777777777777777777777777', wallet: 'Member7B1111111111111111111111111111111111', shares: 8000,  depositTotal: 8.0,  withdrawTotal: 0, joinedAt: Date.now() - 10 * 86400000 },
  { potPubkey: 'DemoPoT7777777777777777777777777777777777777', wallet: 'Member7C1111111111111111111111111111111111', shares: 4800,  depositTotal: 4.8,  withdrawTotal: 0, joinedAt: Date.now() - 8 * 86400000 },
  { potPubkey: 'DemoPoT7777777777777777777777777777777777777', wallet: 'Member7D1111111111111111111111111111111111', shares: 2400,  depositTotal: 2.4,  withdrawTotal: 0, joinedAt: Date.now() - 5 * 86400000 },
]

const SEED_PROPOSALS: MockProposal[] = [
  {
    pubkey: 'DemoProp111111111111111111111111111111111111',
    potPubkey: 'DemoPoT1111111111111111111111111111111111111',
    proposalId: 1,
    proposer: 'SeedAuth1111111111111111111111111111111111',
    type: 'swap',
    description: 'Swap 5 SOL → USDC (protect gains)',
    status: 'executed',
    yesShares: 35000,
    noShares: 5000,
    totalSharesSnapshot: 42500,
    createdAt: new Date(Date.now() - 3 * 86400000),
    voters: [],
  },
  {
    pubkey: 'DemoProp222222222222222222222222222222222222',
    potPubkey: 'DemoPoT1111111111111111111111111111111111111',
    proposalId: 2,
    proposer: 'Member1A1111111111111111111111111111111111',
    type: 'swap',
    description: 'Swap 10 SOL → JUP (ecosystem bet)',
    status: 'active',
    yesShares: 20000,
    noShares: 5000,
    totalSharesSnapshot: 42500,
    createdAt: new Date(Date.now() - 86400000),
    voters: ['SeedAuth1111111111111111111111111111111111', 'Member1B1111111111111111111111111111111111'],
  },
  {
    pubkey: 'DemoProp444111111111111111111111111111111111',
    potPubkey: 'DemoPoT4444444444444444444444444444444444444',
    proposalId: 10,
    proposer: 'SeedAuth4444444444444444444444444444444444',
    type: 'tokenizePot',
    description: 'Tokenize Alpha Hunters as $ALPHA — make shares transferable on Jupiter',
    status: 'executed',
    yesShares: 80000,
    noShares: 7300,
    totalSharesSnapshot: 87300,
    createdAt: new Date(Date.now() - 5 * 86400000),
    voters: [],
  },
  {
    pubkey: 'DemoProp444222222222222222222222222222222222',
    potPubkey: 'DemoPoT4444444444444444444444444444444444444',
    proposalId: 11,
    proposer: 'Member4A1111111111111111111111111111111111',
    type: 'depositToYield',
    description: 'Deposit 50 SOL into Meteora SOL vault (Balanced strategy)',
    status: 'executed',
    yesShares: 85000,
    noShares: 2300,
    totalSharesSnapshot: 87300,
    createdAt: new Date(Date.now() - 3 * 86400000),
    voters: [],
  },
]

/* ── Store ──────────────────────────────────────────────────────────────────── */

interface MockState {
  pots: MockPot[]
  members: MockMember[]
  proposals: MockProposal[]

  // Selectors
  getMembers: (potPubkey: string) => MockMember[]
  getProposals: (potPubkey: string) => MockProposal[]

  // Actions
  createPot: (params: {
    authority: string
    name: string
    emoji: string
    isPublic: boolean
    minDeposit: number
    yieldStrategy: number
    tradeLevel: number
    withdrawLevel: number
    maxTradeSizeBps?: number
    maxMembers?: number
  }) => string

  deposit: (potPubkey: string, wallet: string, amountSol: number) => void
  withdraw: (potPubkey: string, wallet: string, shares: number) => void

  createProposal: (params: {
    potPubkey: string
    proposer: string
    type: string
    description: string
  }) => string

  vote: (proposalPubkey: string, voter: string, approve: boolean) => void
  executeProposal: (proposalPubkey: string) => void

  /** Accrue yield for all pots — called by the yield keeper interval */
  accrueYield: () => void
}

function mockPubkey(): string {
  return Keypair.generate().publicKey.toBase58()
}

/* ── Yield accrual helper ────────────────────────────────────────────────────── */

function computeYieldTick(pot: MockPot): { yieldAmount: number; newNavBps: number } {
  const apy = YIELD_APY[pot.yieldStrategy] ?? 0
  if (apy === 0 || pot.totalShares === 0) return { yieldAmount: 0, newNavBps: pot.navPerShareBps }

  const reservePct = YIELD_RESERVE_PCT[pot.yieldStrategy] ?? 1
  const earningPct = 1 - reservePct
  const earningSol = pot.balance * earningPct + pot.meteoraLpBalance

  // How many seconds elapsed since last accrual
  const nowMs = Date.now()
  const elapsedSecs = Math.max(0, (nowMs - pot.lastYieldAccrualAt) / 1000)
  if (elapsedSecs <= 0) return { yieldAmount: 0, newNavBps: pot.navPerShareBps }

  const yieldAmount = earningSol * apy * (elapsedSecs / SECS_PER_YEAR)

  // Update NAV: nav_bps * (1 + yield/totalValue)
  const totalValue = pot.balance + pot.meteoraLpBalance
  if (totalValue <= 0) return { yieldAmount: 0, newNavBps: pot.navPerShareBps }
  const growthFactor = 1 + yieldAmount / totalValue
  const newNavBps = Math.floor(pot.navPerShareBps * growthFactor)

  return { yieldAmount, newNavBps }
}

/* ── Store implementation ────────────────────────────────────────────────────── */

export const useMockStore = create<MockState>((set, get) => ({
  pots: [...SEED_POTS],
  members: [...SEED_MEMBERS],
  proposals: [...SEED_PROPOSALS],

  getMembers: (potPubkey) => {
    return get().members.filter((m) => m.potPubkey === potPubkey)
  },

  getProposals: (potPubkey) => {
    return get().proposals.filter((p) => p.potPubkey === potPubkey)
  },

  createPot: (params) => {
    const pubkey = mockPubkey()
    const reservePct = YIELD_RESERVE_PCT[params.yieldStrategy] ?? 1
    const pot: MockPot = {
      pubkey,
      name: params.name,
      emoji: params.emoji,
      balance: 0,
      totalShares: 0,
      memberCount: 0,
      tradeCount: 0,
      totalVolume: 0,
      tamagotchiLevel: 0,
      tamagotchiXp: 0,
      isPublic: params.isPublic,
      yieldStrategy: params.yieldStrategy,
      tradeLevel: params.tradeLevel,
      withdrawLevel: params.withdrawLevel,
      authority: params.authority,
      createdAt: Date.now(),
      nextProposalId: 0,
      meteoraLpBalance: 0,
      totalYieldEarned: 0,
      lastYieldAccrualAt: Date.now(),
      mode: 'virtual',
      tokenTicker: '',
      navPerShareBps: 10000,
    }
    set((s) => ({ pots: [...s.pots, pot] }))
    return pubkey
  },

  deposit: (potPubkey, wallet, amountSol) => {
    set((s) => {
      const pot = s.pots.find((p) => p.pubkey === potPubkey)
      if (!pot) return s

      // Shares = proportional to current NAV
      const currentValue = pot.balance + pot.meteoraLpBalance
      const sharesToMint = pot.totalShares === 0
        ? Math.floor(amountSol * 1000)
        : Math.floor((amountSol / Math.max(currentValue, amountSol)) * pot.totalShares)

      // Auto-split deposit: reserve stays liquid, rest goes to Meteora
      const reservePct = YIELD_RESERVE_PCT[pot.yieldStrategy] ?? 1
      const liquidAmount = amountSol * reservePct
      const yieldAmount  = amountSol * (1 - reservePct)

      const pots = s.pots.map((p) =>
        p.pubkey === potPubkey
          ? {
              ...p,
              balance: p.balance + liquidAmount,
              meteoraLpBalance: p.meteoraLpBalance + yieldAmount,
              totalShares: p.totalShares + sharesToMint,
              memberCount: s.members.some((m) => m.potPubkey === potPubkey && m.wallet === wallet)
                ? p.memberCount
                : p.memberCount + 1,
            }
          : p
      )

      const existingIdx = s.members.findIndex(
        (m) => m.potPubkey === potPubkey && m.wallet === wallet
      )
      const members: MockMember[] = existingIdx >= 0
        ? s.members.map((m, i) =>
            i === existingIdx
              ? { ...m, shares: m.shares + sharesToMint, depositTotal: m.depositTotal + amountSol }
              : m
          )
        : [
            ...s.members,
            { potPubkey, wallet, shares: sharesToMint, depositTotal: amountSol, withdrawTotal: 0, joinedAt: Date.now() },
          ]

      return { pots, members }
    })
  },

  withdraw: (potPubkey, wallet, shares) => {
    set((s) => {
      const pot = s.pots.find((p) => p.pubkey === potPubkey)
      const member = s.members.find((m) => m.potPubkey === potPubkey && m.wallet === wallet)
      if (!pot || !member || member.shares < shares) return s

      const totalValue = pot.balance + pot.meteoraLpBalance
      const solAmount = pot.totalShares > 0 ? (shares / pot.totalShares) * totalValue : 0

      // Pull from Meteora first if needed, then liquid
      const fromLiquid = Math.min(solAmount, pot.balance)
      const fromMeteora = Math.max(0, solAmount - fromLiquid)

      const pots = s.pots.map((p) =>
        p.pubkey === potPubkey
          ? {
              ...p,
              balance: Math.max(0, p.balance - fromLiquid),
              meteoraLpBalance: Math.max(0, p.meteoraLpBalance - fromMeteora),
              totalShares: p.totalShares - shares,
            }
          : p
      )

      const members = s.members.map((m) =>
        m.potPubkey === potPubkey && m.wallet === wallet
          ? { ...m, shares: m.shares - shares, withdrawTotal: m.withdrawTotal + solAmount }
          : m
      )

      return { pots, members }
    })
  },

  createProposal: (params) => {
    const pubkey = mockPubkey()
    const pot = get().pots.find((p) => p.pubkey === params.potPubkey)
    if (!pot) return pubkey

    const proposal: MockProposal = {
      pubkey,
      potPubkey: params.potPubkey,
      proposalId: pot.nextProposalId,
      proposer: params.proposer,
      type: params.type,
      description: params.description,
      status: 'active',
      yesShares: 0,
      noShares: 0,
      totalSharesSnapshot: pot.totalShares,
      createdAt: new Date(),
      voters: [],
    }

    set((s) => ({
      proposals: [...s.proposals, proposal],
      pots: s.pots.map((p) =>
        p.pubkey === params.potPubkey ? { ...p, nextProposalId: p.nextProposalId + 1 } : p
      ),
    }))

    return pubkey
  },

  vote: (proposalPubkey, voter, approve) => {
    set((s) => {
      const proposal = s.proposals.find((p) => p.pubkey === proposalPubkey)
      if (!proposal || proposal.status !== 'active') return s
      if (proposal.voters.includes(voter)) return s

      const member = s.members.find((m) => m.potPubkey === proposal.potPubkey && m.wallet === voter)
      const voterShares = member?.shares ?? 1000  // give connected wallet some shares for demo

      const proposals = s.proposals.map((p) => {
        if (p.pubkey !== proposalPubkey) return p
        const newYes = approve ? p.yesShares + voterShares : p.yesShares
        const newNo  = !approve ? p.noShares + voterShares : p.noShares

        let newStatus = p.status
        if (newYes > p.totalSharesSnapshot * 0.5) newStatus = 'passed'
        else if (newNo >= p.totalSharesSnapshot * 0.5) newStatus = 'rejected'

        return { ...p, yesShares: newYes, noShares: newNo, status: newStatus as MockProposal['status'], voters: [...p.voters, voter] }
      })

      return { proposals }
    })
  },

  executeProposal: (proposalPubkey) => {
    set((s) => {
      const proposal = s.proposals.find((p) => p.pubkey === proposalPubkey)
      if (!proposal || proposal.status !== 'passed') return s

      const proposals = s.proposals.map((p) =>
        p.pubkey === proposalPubkey ? { ...p, status: 'executed' as const } : p
      )

      // Simulate effects based on proposal type
      const pots = s.pots.map((p) => {
        if (p.pubkey !== proposal.potPubkey) return p
        if (proposal.type === 'swap') {
          // Swap: increment trade count + simulate 5% profit
          const tradeValue = p.balance * 0.2  // assume 20% of vault traded
          return {
            ...p,
            tradeCount: p.tradeCount + 1,
            totalVolume: p.totalVolume + tradeValue,
            // 5% profit on trade
            balance: p.balance * 1.05,
            navPerShareBps: Math.floor(p.navPerShareBps * 1.05),
          }
        }
        if (proposal.type === 'tokenizePot') {
          // Extract ticker from description
          const tickerMatch = proposal.description.match(/\$([A-Z]+)/)
          const ticker = tickerMatch?.[1] ?? p.name.slice(0, 5).toUpperCase().replace(/\s/g, '')
          return { ...p, mode: 'tokenized' as const, tokenTicker: ticker }
        }
        if (proposal.type === 'depositToYield') {
          // Move 60% of liquid balance to Meteora
          const toDeposit = p.balance * 0.6
          return { ...p, balance: p.balance - toDeposit, meteoraLpBalance: p.meteoraLpBalance + toDeposit }
        }
        if (proposal.type === 'withdrawFromYield') {
          const toWithdraw = p.meteoraLpBalance * 0.5
          return { ...p, balance: p.balance + toWithdraw, meteoraLpBalance: p.meteoraLpBalance - toWithdraw }
        }
        return p
      })

      return { proposals, pots }
    })
  },

  accrueYield: () => {
    const now = Date.now()
    set((s) => ({
      pots: s.pots.map((pot) => {
        const { yieldAmount, newNavBps } = computeYieldTick(pot)
        if (yieldAmount <= 0) return pot
        return {
          ...pot,
          // Yield adds to Meteora LP balance (it compounds inside the vault)
          meteoraLpBalance: pot.meteoraLpBalance + yieldAmount,
          totalYieldEarned: pot.totalYieldEarned + yieldAmount,
          lastYieldAccrualAt: now,
          navPerShareBps: newNavBps,
        }
      }),
    }))
  },
}))

/* ── Yield Keeper — runs in background ───────────────────────────────────────── */

// Only start the interval in the browser (not during SSR)
if (typeof window !== 'undefined') {
  setInterval(() => {
    useMockStore.getState().accrueYield()
  }, YIELD_TICK_MS)
}
