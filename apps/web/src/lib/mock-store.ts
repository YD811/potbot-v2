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
  yieldEarned?: number
  lastYieldTick?: number
}

export interface MockProposal {
  id: number
  potPubkey: string
  proposer: string
  proposalType: 'swap' | 'limitOrder' | 'dca'
  title: string
  description: string
  status: 'active' | 'passed' | 'rejected' | 'executed'
  yesVotes: number
  noVotes: number
  createdAt: number
  votingDeadline: number
  executed?: boolean
  executedAt?: number

  // ── swap ──────────────────────────────────────────────────────────────────
  inputMint?: string
  outputMint?: string
  inputAmount?: number
  minOutputAmount?: number
  slippage?: number

  // ── limitOrder ────────────────────────────────────────────────────────────
  sourceMint?: string
  targetMint?: string
  sourceAmount?: number
  minTargetAmount?: number
  expiryTime?: number

  // ── dca (Dollar-Cost Averaging) ───────────────────────────────────────────
  baseMint?: string
  quoteMint?: string
  amountPerInterval?: number
  intervalSeconds?: number
  maxIntervals?: number
  startTime?: number
  totalAmount?: number
}

export interface MockMember {
  pubkey: string
  shares: number
  joinedAt: number
}

/* ── Store State ─────────────────────────────────────────────────────────────── */

interface MockStoreState {
  // Collections
  pots: MockPot[]
  proposals: Map<string, MockProposal[]>  // potPubkey => proposals
  members: Map<string, MockMember[]>      // potPubkey => members
  votes: Map<string, Record<string, 'yes' | 'no'>>  // proposalId => (voter => vote)

  // User vault (multi-asset holding)
  userVault: TokenHolding[]
  userSolBalance: number

  // Temp trading (Jupiter swap data)
  lastSwapQuote: any | null
  lastSwapRoutes: any[] | null

  // Actions
  setPots: (pots: MockPot[]) => void
  addPot: (pot: MockPot) => void
  updatePot: (pubkey: string, updates: Partial<MockPot>) => void
  getPot: (pubkey: string) => MockPot | undefined
  getProposals: (potPubkey: string) => MockProposal[]
  addProposal: (potPubkey: string, proposal: MockProposal) => void
  executeProposal: (proposalId: string, potPubkey: string) => void
  voteOnProposal: (proposalId: string, voter: string, vote: 'yes' | 'no') => void
  getMembers: (potPubkey: string) => MockMember[]
  setMembers: (potPubkey: string, members: MockMember[]) => void
  addMember: (potPubkey: string, member: MockMember) => void
  setUserVault: (holdings: TokenHolding[]) => void
  addUserHolding: (holding: TokenHolding) => void
  setUserSolBalance: (balance: number) => void
  setLastSwapQuote: (quote: any) => void
  setLastSwapRoutes: (routes: any[]) => void
  accrueYield: () => void
}

/* ── Store Creation ──────────────────────────────────────────────────────────── */

export const useMockStore = create<MockStoreState>((set, get) => ({
  pots: [],
  proposals: new Map(),
  members: new Map(),
  votes: new Map(),
  userVault: [],
  userSolBalance: 1000,
  lastSwapQuote: null,
  lastSwapRoutes: null,

  setPots: (pots) => set({ pots }),

  addPot: (pot) => {
    const state = get()
    set({ pots: [...state.pots, pot] })
    if (!state.proposals.has(pot.pubkey)) {
      state.proposals.set(pot.pubkey, [])
    }
    if (!state.members.has(pot.pubkey)) {
      state.members.set(pot.pubkey, [])
    }
  },

  updatePot: (pubkey, updates) => {
    const state = get()
    const potIndex = state.pots.findIndex(p => p.pubkey === pubkey)
    if (potIndex >= 0) {
      const newPots = [...state.pots]
      newPots[potIndex] = { ...newPots[potIndex], ...updates }
      set({ pots: newPots })
    }
  },

  getPot: (pubkey) => {
    const state = get()
    return state.pots.find(p => p.pubkey === pubkey)
  },

  getProposals: (potPubkey) => {
    const state = get()
    return state.proposals.get(potPubkey) || []
  },

  addProposal: (potPubkey, proposal) => {
    const state = get()
    const proposals = state.proposals.get(potPubkey) || []
    state.proposals.set(potPubkey, [...proposals, proposal])
    set({ proposals: new Map(state.proposals) })
  },

  executeProposal: (proposalId, potPubkey) => {
    const state = get()
    const proposals = state.proposals.get(potPubkey) || []
    const proposal = proposals.find(p => p.id.toString() === proposalId)
    if (!proposal) return

    // Update proposal status
    proposal.executed = true
    proposal.executedAt = Date.now()
    state.proposals.set(potPubkey, [...proposals])

    const pot = state.getPot(potPubkey)
    if (!pot) return

    // Execute based on type
    if (proposal.proposalType === 'swap') {
      if (proposal.inputMint && proposal.outputMint && proposal.inputAmount) {
        // Simulate swap (reduce input, add output)
        pot.balance -= proposal.inputAmount * 0.05  // Simulate fee
        pot.tradeCount += 1
        pot.totalVolume += proposal.inputAmount
      }
    } else if (proposal.proposalType === 'limitOrder') {
      // Execute limit order
      if (proposal.sourceMint && proposal.targetMint && proposal.sourceAmount) {
        // Simulate execution: reduce source, increase target
        pot.balance -= proposal.sourceAmount * 0.02  // Simulate fee
        pot.tradeCount += 1
        pot.totalVolume += proposal.sourceAmount
      }
    } else if (proposal.proposalType === 'dca') {
      // Execute DCA (Dollar-Cost Averaging)
      if (proposal.baseMint && proposal.quoteMint && proposal.amountPerInterval) {
        // Simulate first interval execution
        pot.balance -= proposal.amountPerInterval * 0.01  // Simulate fee
        pot.tradeCount += 1
        pot.totalVolume += proposal.amountPerInterval
      }
    }

    state.updatePot(potPubkey, pot)
    set({ proposals: new Map(state.proposals) })
  },

  voteOnProposal: (proposalId, voter, vote) => {
    const state = get()
    const voteKey = `${proposalId}:${voter}`
    const votes = state.votes.get(proposalId) || {}
    votes[voter] = vote
    state.votes.set(proposalId, votes)
    set({ votes: new Map(state.votes) })
  },

  getMembers: (potPubkey) => {
    const state = get()
    return state.members.get(potPubkey) || []
  },

  setMembers: (potPubkey, members) => {
    const state = get()
    state.members.set(potPubkey, members)
    set({ members: new Map(state.members) })
  },

  addMember: (potPubkey, member) => {
    const state = get()
    const members = state.members.get(potPubkey) || []
    state.members.set(potPubkey, [...members, member])
    set({ members: new Map(state.members) })
  },

  setUserVault: (holdings) => set({ userVault: holdings }),

  addUserHolding: (holding) => {
    const state = get()
    const existing = state.userVault.find(h => h.mint === holding.mint)
    if (existing) {
      existing.amount += holding.amount
      set({ userVault: [...state.userVault] })
    } else {
      set({ userVault: [...state.userVault, holding] })
    }
  },

  setUserSolBalance: (balance) => set({ userSolBalance: balance }),

  setLastSwapQuote: (quote) => set({ lastSwapQuote: quote }),

  setLastSwapRoutes: (routes) => set({ lastSwapRoutes: routes }),

  accrueYield: () => {
    const state = get()
    const now = Date.now()
    state.pots.forEach(pot => {
      const lastTick = pot.lastYieldTick || now
      const elapsedSecs = (now - lastTick) / 1000
      const apy = YIELD_APY[pot.yieldStrategy] || 0
      const reserve = YIELD_RESERVE_PCT[pot.yieldStrategy] || 1
      const earning = pot.balance * (1 - reserve)
      const yieldAccrued = (earning * apy * elapsedSecs) / SECS_PER_YEAR
      pot.balance += yieldAccrued
      pot.yieldEarned = (pot.yieldEarned || 0) + yieldAccrued
      pot.lastYieldTick = now
    })
    set({ pots: [...state.pots] })
  },
}))

/* ── Yield Accrual Loop ──────────────────────────────────────────────────────── */

if (typeof window !== 'undefined') {
  setInterval(() => {
    useMockStore.getState().accrueYield()
  }, YIELD_TICK_MS)
}
