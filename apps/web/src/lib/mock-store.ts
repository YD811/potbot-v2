/**
 * In-memory mock store for demo mode.
 * Simulates on-chain state so the full flow is clickable without deploying the program.
 * When the program is deployed on devnet, the hooks switch to real Anchor calls automatically.
 */

import { create } from 'zustand'
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

/* ── Types ── */

export interface TokenHolding {
  mint: string
  symbol: string
  icon: string
  amount: number   // raw token amount in UI units (e.g. USDC in dollars, BONK in bonk)
  decimals: number
}

export interface MockPot {
  pubkey: string
  name: string
  emoji: string
  balance: number // SOL held directly
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
  createdAt: number // unix ms
  nextProposalId: number
  holdings?: TokenHolding[]  // non-SOL token positions
}

export interface MockMember {
  potPubkey: string
  wallet: string
  shares: number
  depositTotal: number // SOL
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
  createdAt: number
  voters: string[] // wallet addresses that already voted
}

/* ── Store ── */

interface MockState {
  pots: MockPot[]
  members: MockMember[]
  proposals: MockProposal[]

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
  }) => string // returns potPubkey

  deposit: (potPubkey: string, wallet: string, amountSol: number) => void
  withdraw: (potPubkey: string, wallet: string, shares: number) => void

  createProposal: (params: {
    potPubkey: string
    proposer: string
    type: string
    description: string
  }) => string // returns proposalPubkey

  vote: (proposalPubkey: string, voter: string, approve: boolean) => void
  executeProposal: (proposalPubkey: string) => void
}

// Generate deterministic-looking pubkey
function mockPubkey(): string {
  return Keypair.generate().publicKey.toBase58()
}

// Seed data for empty state
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
    yieldStrategy: 2,
    tradeLevel: 2,
    withdrawLevel: 0,
    authority: 'SeedAuth1111111111111111111111111111111111',
    createdAt: Date.now() - 7 * 86400000,
    nextProposalId: 3,
    holdings: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC',    icon: '💵', amount: 820,         decimals: 6 },
      { mint: 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7', symbol: 'JUP',     icon: '🪐', amount: 1200,        decimals: 6 },
    ],
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
    yieldStrategy: 3,
    tradeLevel: 1,
    withdrawLevel: 0,
    authority: 'SeedAuth2222222222222222222222222222222222',
    createdAt: Date.now() - 14 * 86400000,
    nextProposalId: 5,
    holdings: [
      { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u', symbol: 'BONK', icon: '🐕', amount: 125_000_000, decimals: 5 },
      { mint: 'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ', symbol: 'WIF',  icon: '🐶', amount: 480,        decimals: 6 },
    ],
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
    yieldStrategy: 1,
    tradeLevel: 3,
    withdrawLevel: 2,
    authority: 'SeedAuth3333333333333333333333333333333333',
    createdAt: Date.now() - 21 * 86400000,
    nextProposalId: 2,
    holdings: [
      { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'JitoSOL', icon: '🔥', amount: 62.5, decimals: 9 },
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC',    icon: '💵', amount: 5400, decimals: 6 },
    ],
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
    yieldStrategy: 2,
    tradeLevel: 2,
    withdrawLevel: 1,
    authority: 'SeedAuth4444444444444444444444444444444444',
    createdAt: Date.now() - 30 * 86400000,
    nextProposalId: 12,
    holdings: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', icon: '💵', amount: 3200, decimals: 6 },
      { mint: 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7', symbol: 'JUP',  icon: '🪐', amount: 8500, decimals: 6 },
      { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u', symbol: 'BONK', icon: '🐕', amount: 450_000_000, decimals: 5 },
    ],
  },
  {
    pubkey: 'DemoPoT5555555555555555555555555555555555555',
    name: 'Moon Frogs 🐸',
    emoji: '🌙',
    balance: 19.8,
    totalShares: 19800,
    memberCount: 4,
    tradeCount: 63,
    totalVolume: 445.1,
    tamagotchiLevel: 4,
    tamagotchiXp: 11000,
    isPublic: true,
    yieldStrategy: 3,
    tradeLevel: 1,
    withdrawLevel: 0,
    authority: 'SeedAuth5555555555555555555555555555555555',
    createdAt: Date.now() - 10 * 86400000,
    nextProposalId: 8,
    holdings: [
      { mint: 'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ', symbol: 'WIF',  icon: '🐶', amount: 2100,  decimals: 6 },
      { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u', symbol: 'BONK', icon: '🐕', amount: 900_000_000, decimals: 5 },
    ],
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
    yieldStrategy: 1,
    tradeLevel: 3,
    withdrawLevel: 2,
    authority: 'SeedAuth6666666666666666666666666666666666',
    createdAt: Date.now() - 45 * 86400000,
    nextProposalId: 4,
    holdings: [
      { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'JitoSOL', icon: '🔥', amount: 98.5,  decimals: 9 },
      { mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL',    icon: '💎', amount: 45.2,  decimals: 9 },
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC',    icon: '💵', amount: 12000, decimals: 6 },
    ],
  },
]

const SEED_MEMBERS: MockMember[] = [
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'SeedAuth1111111111111111111111111111111111', shares: 20000, depositTotal: 20.0, withdrawTotal: 0, joinedAt: Date.now() - 7 * 86400000 },
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'Member1A1111111111111111111111111111111111', shares: 10000, depositTotal: 10.0, withdrawTotal: 0, joinedAt: Date.now() - 6 * 86400000 },
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'Member1B1111111111111111111111111111111111', shares: 5000, depositTotal: 5.0, withdrawTotal: 0, joinedAt: Date.now() - 5 * 86400000 },
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'Member1C1111111111111111111111111111111111', shares: 4500, depositTotal: 4.5, withdrawTotal: 0, joinedAt: Date.now() - 3 * 86400000 },
  { potPubkey: 'DemoPoT1111111111111111111111111111111111111', wallet: 'Member1D1111111111111111111111111111111111', shares: 3000, depositTotal: 3.0, withdrawTotal: 0, joinedAt: Date.now() - 1 * 86400000 },
]

const SEED_PROPOSALS: MockProposal[] = [
  {
    pubkey: 'DemoProp111111111111111111111111111111111111',
    potPubkey: 'DemoPoT1111111111111111111111111111111111111',
    proposalId: 1,
    proposer: 'SeedAuth1111111111111111111111111111111111',
    type: 'swap',
    description: 'Swap 5 SOL → USDC',
    status: 'executed',
    yesShares: 35000,
    noShares: 5000,
    totalSharesSnapshot: 42500,
    createdAt: Date.now() - 3 * 86400000,
    voters: [],
  },
  {
    pubkey: 'DemoProp222222222222222222222222222222222222',
    potPubkey: 'DemoPoT1111111111111111111111111111111111111',
    proposalId: 2,
    proposer: 'Member1A1111111111111111111111111111111111',
    type: 'swap',
    description: 'Swap 10 SOL → BONK',
    status: 'active',
    yesShares: 20000,
    noShares: 5000,
    totalSharesSnapshot: 42500,
    createdAt: Date.now() - 86400000,
    voters: ['SeedAuth1111111111111111111111111111111111', 'Member1B1111111111111111111111111111111111'],
  },
]

export const useMockStore = create<MockState>((set, get) => ({
  pots: [...SEED_POTS],
  members: [...SEED_MEMBERS],
  proposals: [...SEED_PROPOSALS],

  createPot: (params) => {
    const pubkey = mockPubkey()
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
    }
    set((s) => ({ pots: [...s.pots, pot] }))
    return pubkey
  },

  deposit: (potPubkey, wallet, amountSol) => {
    const sharesToMint = Math.floor(amountSol * 1000) // 1 SOL = 1000 shares

    set((s) => {
      // Update pot
      const pots = s.pots.map((p) =>
        p.pubkey === potPubkey
          ? {
              ...p,
              balance: p.balance + amountSol,
              totalShares: p.totalShares + sharesToMint,
              memberCount: s.members.some(
                (m) => m.potPubkey === potPubkey && m.wallet === wallet
              )
                ? p.memberCount
                : p.memberCount + 1,
            }
          : p
      )

      // Update or create member
      const existingIdx = s.members.findIndex(
        (m) => m.potPubkey === potPubkey && m.wallet === wallet
      )
      let members: MockMember[]
      if (existingIdx >= 0) {
        members = s.members.map((m, i) =>
          i === existingIdx
            ? { ...m, shares: m.shares + sharesToMint, depositTotal: m.depositTotal + amountSol }
            : m
        )
      } else {
        members = [
          ...s.members,
          {
            potPubkey,
            wallet,
            shares: sharesToMint,
            depositTotal: amountSol,
            withdrawTotal: 0,
            joinedAt: Date.now(),
          },
        ]
      }

      return { pots, members }
    })
  },

  withdraw: (potPubkey, wallet, shares) => {
    set((s) => {
      const pot = s.pots.find((p) => p.pubkey === potPubkey)
      const member = s.members.find(
        (m) => m.potPubkey === potPubkey && m.wallet === wallet
      )
      if (!pot || !member || member.shares < shares) return s

      const solAmount = pot.totalShares > 0 ? (shares / pot.totalShares) * pot.balance : 0

      const pots = s.pots.map((p) =>
        p.pubkey === potPubkey
          ? { ...p, balance: p.balance - solAmount, totalShares: p.totalShares - shares }
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
      createdAt: Date.now(),
      voters: [],
    }

    set((s) => ({
      proposals: [...s.proposals, proposal],
      pots: s.pots.map((p) =>
        p.pubkey === params.potPubkey
          ? { ...p, nextProposalId: p.nextProposalId + 1 }
          : p
      ),
    }))

    return pubkey
  },

  vote: (proposalPubkey, voter, approve) => {
    set((s) => {
      const proposal = s.proposals.find((p) => p.pubkey === proposalPubkey)
      if (!proposal || proposal.status !== 'active') return s
      if (proposal.voters.includes(voter)) return s

      const member = s.members.find(
        (m) => m.potPubkey === proposal.potPubkey && m.wallet === voter
      )
      const voterShares = member?.shares ?? 0

      const updated = s.proposals.map((p) => {
        if (p.pubkey !== proposalPubkey) return p
        const newYes = approve ? p.yesShares + voterShares : p.yesShares
        const newNo = !approve ? p.noShares + voterShares : p.noShares
        const totalVoted = newYes + newNo

        // Auto-resolve: if >50% of snapshot voted yes → passed
        let newStatus = p.status
        if (newYes > p.totalSharesSnapshot * 0.5) newStatus = 'passed'
        else if (newNo >= p.totalSharesSnapshot * 0.5) newStatus = 'rejected'

        return {
          ...p,
          yesShares: newYes,
          noShares: newNo,
          status: newStatus as MockProposal['status'],
          voters: [...p.voters, voter],
        }
      })

      return { proposals: updated }
    })
  },

  executeProposal: (proposalPubkey) => {
    set((s) => {
      const proposal = s.proposals.find((p) => p.pubkey === proposalPubkey)
      if (!proposal || proposal.status !== 'passed') return s

      const proposals = s.proposals.map((p) =>
        p.pubkey === proposalPubkey ? { ...p, status: 'executed' as const } : p
      )

      // Simulate trade effect: increment trade count
      const pots = s.pots.map((p) =>
        p.pubkey === proposal.potPubkey
          ? { ...p, tradeCount: p.tradeCount + 1, totalVolume: p.totalVolume + 5 }
          : p
      )

      return { proposals, pots }
    })
  },
}))
