import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type StrategyType = 'ai_dca' | 'trend_following' | 'mean_reversion' | 'hodl' | 'degen' | 'yield';
export type RiskLevel = 'conservative' | 'balanced' | 'degen';
export type VaultCreatorType = 'influencer' | 'community' | 'ai_agent' | 'trader';
export type TamagotchiLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface StrategyVault {
  pubkey: string;
  potPubkey: string;
  creator: string;
  creatorType: VaultCreatorType;
  creatorHandle: string;
  name: string;
  emoji: string;
  description: string;
  strategyType: StrategyType;
  riskLevel: RiskLevel;
  isActive: boolean;
  entryFeeLamports: number;
  entryFeeUsd: number;
  performanceFeeBps: number;
  managementFeeBps: number;
  referralBps: number;
  tamagotchiLevel: TamagotchiLevel;
  memberCount: number;
  aumUsd: number;
  navPerShare: number;
  pnl30d: number;
  pnl7d: number;
  pnlAllTime: number;
  createdAt: string;
  allowedTokens: string[];
  maxSwapPct: number;
  mcpEndpoint?: string;
  isAiAgent: boolean;
}

export interface MyVaultPosition {
  vaultPubkey: string;
  depositedUsd: number;
  currentValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
  entryNavPerShare: number;
  currentNavPerShare: number;
  joinedAt: string;
}

export interface StrategyVaultState {
  vaults: StrategyVault[];
  myPositions: MyVaultPosition[];
  loading: boolean;
  createVault: (vault: Partial<StrategyVault>) => void;
  joinVault: (pubkey: string, amountUsd: number) => void;
  exitVault: (pubkey: string) => void;
  getVaultByPubkey: (pubkey: string) => StrategyVault | undefined;
  getMyPositionForVault: (pubkey: string) => MyVaultPosition | undefined;
}

// ============================================================================
// Constants
// ============================================================================

export const TAMAGOTCHI_META = [
  { level: 0, name: 'Hatchling', emoji: '🥚', title: 'Egg',       swapFeeBps: 50, entryDiscountBps: 0,    requirement: 'Vault created' },
  { level: 1, name: 'Sprout',    emoji: '🐣', title: 'Chick',     swapFeeBps: 45, entryDiscountBps: 500,  requirement: '10+ members or $5K AUM' },
  { level: 2, name: 'Trailblazer',emoji:'🐥', title: 'Fledgling', swapFeeBps: 40, entryDiscountBps: 1000, requirement: '50+ members or $25K AUM' },
  { level: 3, name: 'Apex',      emoji: '🦅', title: 'Eagle',     swapFeeBps: 30, entryDiscountBps: 2000, requirement: '200+ members or $100K AUM' },
  { level: 4, name: 'Legend',    emoji: '🐉', title: 'Dragon',    swapFeeBps: 20, entryDiscountBps: 3500, requirement: '500+ members or $250K AUM' },
  { level: 5, name: 'Immortal',  emoji: '⚡', title: 'Titan',     swapFeeBps: 10, entryDiscountBps: 5000, requirement: 'Top 3 Leaderboard (30d)' },
];

export const STRATEGY_META: Record<StrategyType, { label: string; emoji: string; color: string; description: string }> = {
  ai_dca:          { label: 'AI DCA',    emoji: '🤖', color: '#9945FF', description: 'Dollar-cost averaging powered by AI timing signals' },
  trend_following: { label: 'Trend',     emoji: '📈', color: '#14F195', description: 'Rides momentum — buys breakouts, sells breakdowns' },
  mean_reversion:  { label: 'Mean Rev',  emoji: '🔄', color: '#F59E0B', description: 'Fades extremes, profits when price reverts to mean' },
  hodl:            { label: 'HODL',      emoji: '💎', color: '#3B82F6', description: 'Pure conviction hold — no active trading' },
  degen:           { label: 'Degen',     emoji: '🎰', color: '#EF4444', description: 'High-risk high-reward plays on new tokens' },
  yield:           { label: 'Yield',     emoji: '🌾', color: '#10B981', description: 'Stable yield through LP positions and lending' },
};

// ============================================================================
// Seed Data
// ============================================================================

const seedVaults: StrategyVault[] = [
  {
    pubkey: 'alpha_dca_001', potPubkey: 'pot_alpha_dca_001', creator: '5XYZ...ABC',
    creatorType: 'influencer', creatorHandle: '@CryptoYDao',
    name: 'Alpha Squad DCA', emoji: '🎯',
    description: 'Professional DCA strategy with AI timing signals',
    strategyType: 'ai_dca', riskLevel: 'balanced', isActive: true,
    entryFeeLamports: 0, entryFeeUsd: 5, performanceFeeBps: 1000, managementFeeBps: 100, referralBps: 500,
    tamagotchiLevel: 2, memberCount: 127, aumUsd: 48200, navPerShare: 1.058,
    pnl30d: 12.4, pnl7d: 3.2, pnlAllTime: 45.8,
    createdAt: '2024-06-15T10:30:00Z', allowedTokens: ['SOL', 'USDC', 'USDT'], maxSwapPct: 25, isAiAgent: false,
  },
  {
    pubkey: 'sol_bull_002', potPubkey: 'pot_sol_bull_002', creator: '6ABC...DEF',
    creatorType: 'trader', creatorHandle: 'Sensei',
    name: 'SOL Bull Market Fund', emoji: '🐂',
    description: 'Trend-following strategy riding SOL momentum',
    strategyType: 'trend_following', riskLevel: 'degen', isActive: true,
    entryFeeLamports: 0, entryFeeUsd: 10, performanceFeeBps: 1500, managementFeeBps: 150, referralBps: 750,
    tamagotchiLevel: 1, memberCount: 89, aumUsd: 31400, navPerShare: 1.042,
    pnl30d: 8.7, pnl7d: 2.1, pnlAllTime: 28.5,
    createdAt: '2024-09-20T14:45:00Z', allowedTokens: ['SOL', 'USDC'], maxSwapPct: 40, isAiAgent: false,
  },
  {
    pubkey: 'ai_dca_bot_003', potPubkey: 'pot_ai_dca_bot_003', creator: 'AI_Agent_7',
    creatorType: 'ai_agent', creatorHandle: 'DCA-Bot-7',
    name: 'Autonomous DCA Engine', emoji: '🤖',
    description: 'Fully autonomous AI-powered DCA engine with real-time market analysis',
    strategyType: 'ai_dca', riskLevel: 'conservative', isActive: true,
    entryFeeLamports: 0, entryFeeUsd: 0, performanceFeeBps: 500, managementFeeBps: 50, referralBps: 250,
    tamagotchiLevel: 3, memberCount: 312, aumUsd: 127000, navPerShare: 1.156,
    pnl30d: 6.2, pnl7d: 1.8, pnlAllTime: 78.2,
    createdAt: '2024-03-01T08:00:00Z', allowedTokens: ['SOL', 'USDC', 'USDT', 'ORCA'], maxSwapPct: 20,
    mcpEndpoint: 'https://mcp.potbot.fun/agent/dca-bot-7', isAiAgent: true,
  },
  {
    pubkey: 'degen_mode_004', potPubkey: 'pot_degen_mode_004', creator: '7DEF...GHI',
    creatorType: 'trader', creatorHandle: 'Moon_Bro',
    name: 'Degen Mode', emoji: '🎰',
    description: 'High-risk high-reward plays on emerging tokens with 100x+ potential',
    strategyType: 'degen', riskLevel: 'degen', isActive: true,
    entryFeeLamports: 0, entryFeeUsd: 20, performanceFeeBps: 2000, managementFeeBps: 200, referralBps: 1000,
    tamagotchiLevel: 1, memberCount: 45, aumUsd: 12800, navPerShare: 1.624,
    pnl30d: 34.1, pnl7d: 18.5, pnlAllTime: 62.4,
    createdAt: '2024-11-10T16:20:00Z', allowedTokens: ['SOL', 'USDC'], maxSwapPct: 60, isAiAgent: false,
  },
  {
    pubkey: 'yield_dao_005', potPubkey: 'pot_yield_dao_005', creator: 'YieldCo.sol',
    creatorType: 'community', creatorHandle: 'Yield Farmers DAO',
    name: 'Yield Farmers DAO', emoji: '🌾',
    description: 'Community-governed yield farming across lending and LP protocols',
    strategyType: 'yield', riskLevel: 'conservative', isActive: true,
    entryFeeLamports: 0, entryFeeUsd: 0, performanceFeeBps: 800, managementFeeBps: 80, referralBps: 400,
    tamagotchiLevel: 3, memberCount: 203, aumUsd: 89500, navPerShare: 1.038,
    pnl30d: 4.1, pnl7d: 0.9, pnlAllTime: 35.6,
    createdAt: '2024-05-22T12:00:00Z', allowedTokens: ['SOL', 'USDC', 'USDT'], maxSwapPct: 15, isAiAgent: false,
  },
  {
    pubkey: 'ai_treasury_006', potPubkey: 'pot_ai_treasury_006', creator: 'AI_Agent_1',
    creatorType: 'ai_agent', creatorHandle: 'Treasury-Mgr-1',
    name: 'AI Treasury Manager', emoji: '🤖',
    description: 'Advanced AI treasury management with predictive rebalancing',
    strategyType: 'ai_dca', riskLevel: 'balanced', isActive: true,
    entryFeeLamports: 0, entryFeeUsd: 0, performanceFeeBps: 700, managementFeeBps: 70, referralBps: 350,
    tamagotchiLevel: 4, memberCount: 567, aumUsd: 234000, navPerShare: 1.284,
    pnl30d: 9.8, pnl7d: 2.5, pnlAllTime: 125.3,
    createdAt: '2024-01-15T09:30:00Z', allowedTokens: ['SOL', 'USDC', 'USDT', 'ORCA', 'MARINADE'], maxSwapPct: 22,
    mcpEndpoint: 'https://mcp.potbot.fun/agent/treasury-1', isAiAgent: true,
  },
  {
    pubkey: 'contra_007', potPubkey: 'pot_contra_007', creator: '8GHI...JKL',
    creatorType: 'trader', creatorHandle: 'Zig_Zag',
    name: 'Contrarian Club', emoji: '🔄',
    description: 'Mean reversion strategy that fades extremes and profits from normalization',
    strategyType: 'mean_reversion', riskLevel: 'balanced', isActive: true,
    entryFeeLamports: 0, entryFeeUsd: 5, performanceFeeBps: 1200, managementFeeBps: 120, referralBps: 600,
    tamagotchiLevel: 1, memberCount: 67, aumUsd: 22100, navPerShare: 1.051,
    pnl30d: 5.3, pnl7d: 1.2, pnlAllTime: 19.8,
    createdAt: '2024-08-05T11:15:00Z', allowedTokens: ['SOL', 'USDC'], maxSwapPct: 30, isAiAgent: false,
  },
  {
    pubkey: 'diamond_008', potPubkey: 'pot_diamond_008', creator: 'DiamondDAO.sol',
    creatorType: 'community', creatorHandle: 'Diamond Hands DAO',
    name: 'Diamond Hands DAO', emoji: '💎',
    description: 'Pure conviction hold for long-term believers in Solana and Web3',
    strategyType: 'hodl', riskLevel: 'conservative', isActive: true,
    entryFeeLamports: 0, entryFeeUsd: 0, performanceFeeBps: 300, managementFeeBps: 30, referralBps: 150,
    tamagotchiLevel: 4, memberCount: 891, aumUsd: 445000, navPerShare: 1.312,
    pnl30d: 18.2, pnl7d: 5.1, pnlAllTime: 195.7,
    createdAt: '2023-12-01T07:00:00Z', allowedTokens: ['SOL', 'USDC'], maxSwapPct: 10, isAiAgent: false,
  },
];

const seedPositions: MyVaultPosition[] = [
  {
    vaultPubkey: 'alpha_dca_001', depositedUsd: 84, currentValueUsd: 88.20,
    pnlUsd: 4.20, pnlPct: 5.0, entryNavPerShare: 1.0, currentNavPerShare: 1.05,
    joinedAt: '2025-03-01T14:30:00Z',
  },
  {
    vaultPubkey: 'ai_dca_bot_003', depositedUsd: 500, currentValueUsd: 611.05,
    pnlUsd: 111.05, pnlPct: 22.21, entryNavPerShare: 1.0, currentNavPerShare: 1.222,
    joinedAt: '2025-01-15T09:00:00Z',
  },
];

// ============================================================================
// Zustand Store
// ============================================================================

export const useStrategyVaultStore = create<StrategyVaultState>((set, get) => ({
  vaults: seedVaults,
  myPositions: seedPositions,
  loading: false,

  createVault: (vault: Partial<StrategyVault>) => {
    const newVault: StrategyVault = {
      pubkey: `vault_${Date.now()}`,
      potPubkey: `pot_${Date.now()}`,
      creator: vault.creator || 'unknown',
      creatorType: vault.creatorType || 'trader',
      creatorHandle: vault.creatorHandle || '',
      name: vault.name || 'New Vault',
      emoji: vault.emoji || '📊',
      description: vault.description || '',
      strategyType: vault.strategyType || 'hodl',
      riskLevel: vault.riskLevel || 'balanced',
      isActive: vault.isActive !== undefined ? vault.isActive : true,
      entryFeeLamports: vault.entryFeeLamports || 0,
      entryFeeUsd: vault.entryFeeUsd || 0,
      performanceFeeBps: vault.performanceFeeBps || 1000,
      managementFeeBps: vault.managementFeeBps || 100,
      referralBps: vault.referralBps || 500,
      tamagotchiLevel: vault.tamagotchiLevel || 0,
      memberCount: vault.memberCount || 1,
      aumUsd: vault.aumUsd || 0,
      navPerShare: vault.navPerShare || 1.0,
      pnl30d: vault.pnl30d || 0,
      pnl7d: vault.pnl7d || 0,
      pnlAllTime: vault.pnlAllTime || 0,
      createdAt: vault.createdAt || new Date().toISOString(),
      allowedTokens: vault.allowedTokens || ['SOL', 'USDC'],
      maxSwapPct: vault.maxSwapPct || 25,
      mcpEndpoint: vault.mcpEndpoint,
      isAiAgent: vault.isAiAgent || false,
    };
    set((state) => ({ vaults: [...state.vaults, newVault] }));
  },

  joinVault: (pubkey: string, amountUsd: number) => {
    const vault = get().vaults.find((v) => v.pubkey === pubkey);
    if (!vault) return;
    const position: MyVaultPosition = {
      vaultPubkey: pubkey, depositedUsd: amountUsd, currentValueUsd: amountUsd,
      pnlUsd: 0, pnlPct: 0, entryNavPerShare: vault.navPerShare,
      currentNavPerShare: vault.navPerShare, joinedAt: new Date().toISOString(),
    };
    set((state) => ({
      myPositions: [...state.myPositions, position],
      vaults: state.vaults.map((v) => v.pubkey === pubkey ? { ...v, memberCount: v.memberCount + 1 } : v),
    }));
  },

  exitVault: (pubkey: string) => {
    set((state) => ({
      myPositions: state.myPositions.filter((p) => p.vaultPubkey !== pubkey),
      vaults: state.vaults.map((v) => v.pubkey === pubkey ? { ...v, memberCount: Math.max(0, v.memberCount - 1) } : v),
    }));
  },

  getVaultByPubkey: (pubkey: string) => get().vaults.find((v) => v.pubkey === pubkey),
  getMyPositionForVault: (pubkey: string) => get().myPositions.find((p) => p.vaultPubkey === pubkey),
}));