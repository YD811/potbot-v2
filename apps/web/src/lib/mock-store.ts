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
  lastYieldAccrual: number  // ms
  yieldAccrued: number      // SOL accrued from yield strategy
}

export interface MockProposal {
  id: number
  potPubkey: string
  title: string
  description: string
  action: string   // "swap" | "divest" | "governance" etc.
  votesFor: number
  votesAgainst: number
  executed: boolean
  timestamp: number
}

export interface StoreMember {
  pubkey: string
  shares: number
  joinedAt: number
}

export interface StoreState {
  // Pots
  pots: Map<string, MockPot>
  members: Map<string, StoreMember[]>  // pubkey -> array of members in that pot

  // Proposals
  proposals: Map<string, MockProposal[]>  // pot pubkey -> proposals

  // Actions
  createPot: (name: string, emoji: string, yieldStrategy: number) => void
  deposit: (potPubkey: string, amount: number) => void
  withdraw: (potPubkey: string, amount: number) => void
  createProposal: (potPubkey: string, title: string, description: string, action: string) => void
  vote: (potPubkey: string, proposalId: number, voteFor: boolean) => void
  executeProposal: (potPubkey: string, proposalId: number) => void
  accrueYield: () => void  // called by timer
}

/* ── Seed Data ─────────────────────────────────────────────────────────────── */

const SEED_POTS: Array<Omit<MockPot, 'pubkey'>> = [
  {
    name: 'Birthday Fund',
    emoji: '🎂',
    balance: 15.5,
    totalShares: 50,
    memberCount: 8,
    tradeCount: 2,
    totalVolume: 45.3,
    tamagotchiLevel: 3,
    tamagotchiXp: 1200,
    isPublic: true,
    yieldStrategy: 1,  // Conservative
    tradeLevel: 0,
    withdrawLevel: 0,
    authority: Keypair.generate().publicKey.toString(),
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,  // 30 days ago
    nextProposalId: 1,
    lastYieldAccrual: Date.now(),
    yieldAccrued: 0.42,
  },
  {
    name: 'Vacation Pool',
    emoji: '✈️',
    balance: 250,
    totalShares: 100,
    memberCount: 12,
    tradeCount: 5,
    totalVolume: 890.25,
    tamagotchiLevel: 5,
    tamagotchiXp: 3500,
    isPublic: false,
    yieldStrategy: 2,  // Balanced
    tradeLevel: 1,
    withdrawLevel: 0,
    authority: Keypair.generate().publicKey.toString(),
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,  // 60 days ago
    nextProposalId: 3,
    lastYieldAccrual: Date.now(),
    yieldAccrued: 8.75,
  },
  {
    name: 'Gaming Gear Fund',
    emoji: '🎮',
    balance: 48.2,
    totalShares: 120,
    memberCount: 15,
    tradeCount: 8,
    totalVolume: 340.6,
    tamagotchiLevel: 2,
    tamagotchiXp: 890,
    isPublic: true,
    yieldStrategy: 0,  // None
    tradeLevel: 2,
    withdrawLevel: 1,
    authority: Keypair.generate().publicKey.toString(),
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,  // 10 days ago
    nextProposalId: 2,
    lastYieldAccrual: Date.now(),
    yieldAccrued: 0,
  },
  {
    name: 'Project Fund',
    emoji: '🚀',
    balance: 500,
    totalShares: 200,
    memberCount: 20,
    tradeCount: 12,
    totalVolume: 2100.75,
    tamagotchiLevel: 4,
    tamagotchiXp: 2800,
    isPublic: true,
    yieldStrategy: 3,  // Aggressive
    tradeLevel: 3,
    withdrawLevel: 1,
    authority: Keypair.generate().publicKey.toString(),
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,  // 90 days ago
    nextProposalId: 5,
    lastYieldAccrual: Date.now(),
    yieldAccrued: 42.5,
  },
  {
    name: 'Charity Drive',
    emoji: '❤️',
    balance: 75.8,
    totalShares: 75,
    memberCount: 18,
    tradeCount: 3,
    totalVolume: 125.4,
    tamagotchiLevel: 3,
    tamagotchiXp: 1500,
    isPublic: true,
    yieldStrategy: 1,  // Conservative
    tradeLevel: 0,
    withdrawLevel: 0,
    authority: Keypair.generate().publicKey.toString(),
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,  // 45 days ago
    nextProposalId: 1,
    lastYieldAccrual: Date.now(),
    yieldAccrued: 2.1,
  },
  {
    name: 'House Improvement',
    emoji: '🏡',
    balance: 180,
    totalShares: 150,
    memberCount: 6,
    tradeCount: 4,
    totalVolume: 620.3,
    tamagotchiLevel: 2,
    tamagotchiXp: 950,
    isPublic: false,
    yieldStrategy: 2,  // Balanced
    tradeLevel: 1,
    withdrawLevel: 1,
    authority: Keypair.generate().publicKey.toString(),
    createdAt: Date.now() - 75 * 24 * 60 * 60 * 1000,  // 75 days ago
    nextProposalId: 2,
    lastYieldAccrual: Date.now(),
    yieldAccrued: 6.3,
  },
  {
    name: 'Education Fund',
    emoji: '📚',
    balance: 320,
    totalShares: 250,
    memberCount: 25,
    tradeCount: 7,
    totalVolume: 1450.8,
    tamagotchiLevel: 4,
    tamagotchiXp: 2200,
    isPublic: true,
    yieldStrategy: 4,  // JLP
    tradeLevel: 2,
    withdrawLevel: 0,
    authority: Keypair.generate().publicKey.toString(),
    createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,  // 120 days ago
    nextProposalId: 4,
    lastYieldAccrual: Date.now(),
    yieldAccrued: 28.6,
  },
]

/* ── Store ───────────────────────────────────────────────────────────────────── */

export const useMockStore = create<StoreState>((set, get) => {
  // Initialize with seed data
  const initialPots = new Map<string, MockPot>()
  const initialMembers = new Map<string, StoreMember[]>()
  const initialProposals = new Map<string, MockProposal[]>()

  SEED_POTS.forEach((pot, idx) => {
    const pubkey = `seed_pot_${idx}`
    initialPots.set(pubkey, { ...pot, pubkey })
    initialMembers.set(pubkey, [])
    initialProposals.set(pubkey, [])
  })

  return {
    pots: initialPots,
    members: initialMembers,
    proposals: initialProposals,

    createPot: (name: string, emoji: string, yieldStrategy: number) => {
      const newPotKey = `pot_${Date.now()}`
      const newPot: MockPot = {
        pubkey: newPotKey,
        name,
        emoji,
        balance: 0,
        totalShares: 0,
        memberCount: 1,  // creator is member 0
        tradeCount: 0,
        totalVolume: 0,
        tamagotchiLevel: 1,
        tamagotchiXp: 0,
        isPublic: false,
        yieldStrategy,
        tradeLevel: 0,
        withdrawLevel: 0,
        authority: Keypair.generate().publicKey.toString(),
        createdAt: Date.now(),
        nextProposalId: 0,
        lastYieldAccrual: Date.now(),
        yieldAccrued: 0,
      }

      set((state) => {
        const newPots = new Map(state.pots)
        const newMembers = new Map(state.members)
        const newProposals = new Map(state.proposals)

        newPots.set(newPotKey, newPot)
        newMembers.set(newPotKey, [])
        newProposals.set(newPotKey, [])

        return { pots: newPots, members: newMembers, proposals: newProposals }
      })
    },

    deposit: (potPubkey: string, amount: number) => {
      set((state) => {
        const newPots = new Map(state.pots)
        const pot = newPots.get(potPubkey)

        if (pot) {
          pot.balance += amount
          pot.totalVolume += amount
          newPots.set(potPubkey, pot)
        }

        return { pots: newPots }
      })
    },

    withdraw: (potPubkey: string, amount: number) => {
      set((state) => {
        const newPots = new Map(state.pots)
        const pot = newPots.get(potPubkey)

        if (pot && pot.balance >= amount) {
          pot.balance -= amount
          newPots.set(potPubkey, pot)
        }

        return { pots: newPots }
      })
    },

    createProposal: (potPubkey: string, title: string, description: string, action: string) => {
      set((state) => {
        const newProposals = new Map(state.proposals)
        const newPots = new Map(state.pots)
        const pot = newPots.get(potPubkey)

        if (pot) {
          const proposal: MockProposal = {
            id: pot.nextProposalId,
            potPubkey,
            title,
            description,
            action,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            timestamp: Date.now(),
          }

          pot.nextProposalId += 1
          newPots.set(potPubkey, pot)

          const proposals = newProposals.get(potPubkey) || []
          proposals.push(proposal)
          newProposals.set(potPubkey, proposals)
        }

        return { pots: newPots, proposals: newProposals }
      })
    },

    vote: (potPubkey: string, proposalId: number, voteFor: boolean) => {
      set((state) => {
        const newProposals = new Map(state.proposals)
        const proposals = newProposals.get(potPubkey) || []
        const proposal = proposals.find((p) => p.id === proposalId)

        if (proposal) {
          if (voteFor) {
            proposal.votesFor += 1
          } else {
            proposal.votesAgainst += 1
          }
          newProposals.set(potPubkey, proposals)
        }

        return { proposals: newProposals }
      })
    },

    executeProposal: (potPubkey: string, proposalId: number) => {
      set((state) => {
        const newProposals = new Map(state.proposals)
        const proposals = newProposals.get(potPubkey) || []
        const proposal = proposals.find((p) => p.id === proposalId)

        if (proposal && !proposal.executed) {
          proposal.executed = true
          newProposals.set(potPubkey, proposals)
        }

        return { proposals: newProposals }
      })
    },

    accrueYield: () => {
      set((state) => {
        const newPots = new Map(state.pots)
        const now = Date.now()

        newPots.forEach((pot) => {
          if (pot.yieldStrategy === 0) return  // No yield

          const timeDiff = (now - pot.lastYieldAccrual) / 1000  // seconds
          const apy = YIELD_APY[pot.yieldStrategy]
          const reservePct = YIELD_RESERVE_PCT[pot.yieldStrategy]
          const earningBalance = pot.balance * (1 - reservePct)
          const yieldRate = apy / SECS_PER_YEAR
          const accrued = earningBalance * yieldRate * timeDiff

          pot.balance += accrued
          pot.yieldAccrued += accrued
          pot.lastYieldAccrual = now
          pot.totalVolume += accrued
        })

        return { pots: newPots }
      })
    },
  }
})

// Only start the interval in the browser (not during SSR)
if (typeof window !== 'undefined') {
  setInterval(() => {
    useMockStore.getState().accrueYield()
  }, YIELD_TICK_MS)
}