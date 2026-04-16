#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// Types
// ============================================================================

type StrategyType = 'ai_dca' | 'trend_following' | 'mean_reversion' | 'hodl' | 'degen' | 'yield';
type RiskLevel = 'conservative' | 'balanced' | 'degen';
type TamagotchiLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface StrategyVault {
  pubkey: string;
  potPubkey: string;
  creator: string;
  creatorType: string;
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

interface MyVaultPosition {
  vaultPubkey: string;
  depositedUsd: number;
  currentValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
  entryNavPerShare: number;
  currentNavPerShare: number;
  joinedAt: string;
}

interface NAVHistoryPoint {
  date: string;
  navPerShare: number;
}

interface PerformanceMetrics {
  vaultPubkey: string;
  period: string;
  navHistory: NAVHistoryPoint[];
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgGain: number;
  avgLoss: number;
}

// ============================================================================
// Mock Vaults (seeded from store)
// ============================================================================

const mockVaults: StrategyVault[] = [
  { pubkey: 'alpha_dca_001', potPubkey: 'pot_alpha_dca_001', creator: '5XYZ...ABC', creatorType: 'influencer', creatorHandle: '@CryptoYDao', name: 'Alpha Squad DCA', emoji: '🎯', description: 'Professional dollar-cost averaging strategy with AI timing signals for consistent gains', strategyType: 'ai_dca', riskLevel: 'balanced', isActive: true, entryFeeLamports: 0, entryFeeUsd: 5, performanceFeeBps: 1000, managementFeeBps: 100, referralBps: 500, tamagotchiLevel: 2, memberCount: 127, aumUsd: 48200, navPerShare: 1.058, pnl30d: 12.4, pnl7d: 3.2, pnlAllTime: 45.8, createdAt: '2024-06-15T10:30:00Z', allowedTokens: ['SOL', 'USDC', 'USDT'], maxSwapPct: 25, isAiAgent: false },
  { pubkey: 'sol_bull_002', potPubkey: 'pot_sol_bull_002', creator: '6ABC...DEF', creatorType: 'trader', creatorHandle: 'Sensei', name: 'SOL Bull Market Fund', emoji: '🐂', description: 'Trend-following strategy riding SOL momentum during bull markets', strategyType: 'trend_following', riskLevel: 'degen', isActive: true, entryFeeLamports: 0, entryFeeUsd: 10, performanceFeeBps: 1500, managementFeeBps: 150, referralBps: 750, tamagotchiLevel: 1, memberCount: 89, aumUsd: 31400, navPerShare: 1.042, pnl30d: 8.7, pnl7d: 2.1, pnlAllTime: 28.5, createdAt: '2024-09-20T14:45:00Z', allowedTokens: ['SOL', 'USDC'], maxSwapPct: 40, isAiAgent: false },
  { pubkey: 'ai_dca_bot_003', potPubkey: 'pot_ai_dca_bot_003', creator: 'AI_Agent_7', creatorType: 'ai_agent', creatorHandle: 'DCA-Bot-7', name: 'Autonomous DCA Engine', emoji: '🤖', description: 'Fully autonomous AI-powered DCA engine with real-time market analysis and allocation optimization', strategyType: 'ai_dca', riskLevel: 'conservative', isActive: true, entryFeeLamports: 0, entryFeeUsd: 0, performanceFeeBps: 500, managementFeeBps: 50, referralBps: 250, tamagotchiLevel: 3, memberCount: 312, aumUsd: 127000, navPerShare: 1.156, pnl30d: 6.2, pnl7d: 1.8, pnlAllTime: 78.2, createdAt: '2024-03-01T08:00:00Z', allowedTokens: ['SOL', 'USDC', 'USDT', 'ORCA'], maxSwapPct: 20, mcpEndpoint: 'https://mcp.potbot.fun/agent/dca-bot-7', isAiAgent: true },
  { pubkey: 'degen_mode_004', potPubkey: 'pot_degen_mode_004', creator: '7DEF...GHI', creatorType: 'trader', creatorHandle: 'Moon_Bro', name: 'Degen Mode', emoji: '🎰', description: 'High-risk high-reward plays on emerging tokens with 100x+ moonshot potential', strategyType: 'degen', riskLevel: 'degen', isActive: true, entryFeeLamports: 0, entryFeeUsd: 20, performanceFeeBps: 2000, managementFeeBps: 200, referralBps: 1000, tamagotchiLevel: 1, memberCount: 45, aumUsd: 12800, navPerShare: 1.624, pnl30d: 34.1, pnl7d: 18.5, pnlAllTime: 62.4, createdAt: '2024-11-10T16:20:00Z', allowedTokens: ['SOL', 'USDC'], maxSwapPct: 60, isAiAgent: false },
  { pubkey: 'yield_dao_005', potPubkey: 'pot_yield_dao_005', creator: 'YieldCo.sol', creatorType: 'community', creatorHandle: 'Yield Farmers DAO', name: 'Yield Farmers DAO', emoji: '🌾', description: 'Community-governed yield farming strategy across multiple lending and LP protocols', strategyType: 'yield', riskLevel: 'conservative', isActive: true, entryFeeLamports: 0, entryFeeUsd: 0, performanceFeeBps: 800, managementFeeBps: 80, referralBps: 400, tamagotchiLevel: 3, memberCount: 203, aumUsd: 89500, navPerShare: 1.038, pnl30d: 4.1, pnl7d: 0.9, pnlAllTime: 35.6, createdAt: '2024-05-22T12:00:00Z', allowedTokens: ['SOL', 'USDC', 'USDT'], maxSwapPct: 15, isAiAgent: false },
  { pubkey: 'ai_treasury_006', potPubkey: 'pot_ai_treasury_006', creator: 'AI_Agent_1', creatorType: 'ai_agent', creatorHandle: 'Treasury-Mgr-1', name: 'AI Treasury Manager', emoji: '🤖', description: 'Advanced AI treasury management with predictive rebalancing and multi-asset optimization', strategyType: 'ai_dca', riskLevel: 'balanced', isActive: true, entryFeeLamports: 0, entryFeeUsd: 0, performanceFeeBps: 700, managementFeeBps: 70, referralBps: 350, tamagotchiLevel: 4, memberCount: 567, aumUsd: 234000, navPerShare: 1.284, pnl30d: 9.8, pnl7d: 2.5, pnlAllTime: 125.3, createdAt: '2024-01-15T09:30:00Z', allowedTokens: ['SOL', 'USDC', 'USDT', 'ORCA', 'MARINADE'], maxSwapPct: 22, mcpEndpoint: 'https://mcp.potbot.fun/agent/treasury-1', isAiAgent: true },
  { pubkey: 'contra_007', potPubkey: 'pot_contra_007', creator: '8GHI...JKL', creatorType: 'trader', creatorHandle: 'Zig_Zag', name: 'Contrarian Club', emoji: '🔄', description: 'Mean reversion strategy that fades extremes and profits from price normalization', strategyType: 'mean_reversion', riskLevel: 'balanced', isActive: true, entryFeeLamports: 0, entryFeeUsd: 5, performanceFeeBps: 1200, managementFeeBps: 120, referralBps: 600, tamagotchiLevel: 1, memberCount: 67, aumUsd: 22100, navPerShare: 1.051, pnl30d: 5.3, pnl7d: 1.2, pnlAllTime: 19.8, createdAt: '2024-08-05T11:15:00Z', allowedTokens: ['SOL', 'USDC'], maxSwapPct: 30, isAiAgent: false },
  { pubkey: 'diamond_008', potPubkey: 'pot_diamond_008', creator: 'DiamondDAO.sol', creatorType: 'community', creatorHandle: 'Diamond Hands DAO', name: 'Diamond Hands DAO', emoji: '💎', description: 'Pure conviction hold strategy for long-term believers in Solana and Web3 fundamentals', strategyType: 'hodl', riskLevel: 'conservative', isActive: true, entryFeeLamports: 0, entryFeeUsd: 0, performanceFeeBps: 300, managementFeeBps: 30, referralBps: 150, tamagotchiLevel: 4, memberCount: 891, aumUsd: 445000, navPerShare: 1.312, pnl30d: 18.2, pnl7d: 5.1, pnlAllTime: 195.7, createdAt: '2023-12-01T07:00:00Z', allowedTokens: ['SOL', 'USDC'], maxSwapPct: 10, isAiAgent: false }
];

const mockPositions: MyVaultPosition[] = [
  { vaultPubkey: 'alpha_dca_001', depositedUsd: 84, currentValueUsd: 88.2, pnlUsd: 4.2, pnlPct: 5.0, entryNavPerShare: 1.0, currentNavPerShare: 1.05, joinedAt: '2025-03-01T14:30:00Z' },
  { vaultPubkey: 'ai_dca_bot_003', depositedUsd: 500, currentValueUsd: 611.05, pnlUsd: 111.05, pnlPct: 22.21, entryNavPerShare: 1.0, currentNavPerShare: 1.222, joinedAt: '2025-01-15T09:00:00Z' }
];

// ============================================================================
// Tool Handlers
// ============================================================================

function listStrategyVaults(args: { strategy_type?: string; risk_level?: string; min_pnl_30d?: number; ai_agents_only?: boolean; sort_by?: 'pnl_30d' | 'aum' | 'members'; }): object {
  let filtered = [...mockVaults];
  if (args.strategy_type) { filtered = filtered.filter((v) => v.strategyType === args.strategy_type); }
  if (args.risk_level) { filtered = filtered.filter((v) => v.riskLevel === args.risk_level); }
  if (args.min_pnl_30d !== undefined) { filtered = filtered.filter((v) => v.pnl30d >= args.min_pnl_30d); }
  if (args.ai_agents_only) { filtered = filtered.filter((v) => v.isAiAgent); }
  if (args.sort_by === 'pnl_30d') { filtered.sort((a, b) => b.pnl30d - a.pnl30d); } else if (args.sort_by === 'aum') { filtered.sort((a, b) => b.aumUsd - a.aumUsd); } else if (args.sort_by === 'members') { filtered.sort((a, b) => b.memberCount - a.memberCount); }
  return { count: filtered.length, vaults: filtered.map((v) => ({ pubkey: v.pubkey, name: v.name, emoji: v.emoji, creator: v.creatorHandle, strategy: v.strategyType, risk: v.riskLevel, members: v.memberCount, aum_usd: v.aumUsd, pnl_30d: v.pnl30d, nav_per_share: v.navPerShare, entry_fee_usd: v.entryFeeUsd, is_ai_agent: v.isAiAgent })) };
}

function getVaultDetails(args: { vault_pubkey: string }): object {
  const vault = mockVaults.find((v) => v.pubkey === args.vault_pubkey);
  if (!vault) { return { error: `Vault ${args.vault_pubkey} not found` }; }
  return { pubkey: vault.pubkey, name: vault.name, emoji: vault.emoji, description: vault.description, creator: vault.creatorHandle, creator_type: vault.creatorType, strategy_type: vault.strategyType, risk_level: vault.riskLevel, is_active: vault.isActive, is_ai_agent: vault.isAiAgent, tamagotchi_level: vault.tamagotchiLevel, members: vault.memberCount, aum_usd: vault.aumUsd, nav_per_share: vault.navPerShare, pnl: { pnl_7d: vault.pnl7d, pnl_30d: vault.pnl30d, pnl_all_time: vault.pnlAllTime }, fees: { entry_fee_usd: vault.entryFeeUsd, performance_fee_bps: vault.performanceFeeBps, management_fee_bps: vault.managementFeeBps, referral_bps: vault.referralBps }, allowed_tokens: vault.allowedTokens, max_swap_pct: vault.maxSwapPct, created_at: vault.createdAt, join_url: `https://potbot.fun/vault/${vault.pubkey}`, mcp_endpoint: vault.mcpEndpoint };
}

function getMyPositions(args: { wallet_address: string }): object {
  const positions = mockPositions.map((p) => { const vault = mockVaults.find((v) => v.pubkey === p.vaultPubkey); return { vault_pubkey: p.vaultPubkey, vault_name: vault?.name, deposited_usd: p.depositedUsd, current_value_usd: p.currentValueUsd, pnl_usd: p.pnlUsd, pnl_pct: p.pnlPct, entry_nav_per_share: p.entryNavPerShare, current_nav_per_share: p.currentNavPerShare, joined_at: p.joinedAt }; });
  const totalDeposited = positions.reduce((sum, p) => sum + p.deposited_usd, 0);
  const totalCurrent = positions.reduce((sum, p) => sum + p.current_value_usd, 0);
  const totalPnlUsd = totalCurrent - totalDeposited;
  const totalPnlPct = totalDeposited > 0 ? (totalPnlUsd / totalDeposited) * 100 : 0;
  return { wallet_address: args.wallet_address, positions, portfolio_summary: { total_deposited_usd: totalDeposited, total_current_value_usd: totalCurrent, total_pnl_usd: totalPnlUsd, total_pnl_pct: totalPnlPct, position_count: positions.length } };
}

function calculateAllocation(args: { total_budget_usd: number; risk_profile: 'conservative' | 'balanced' | 'degen'; max_vaults?: number; }): object {
  let candidates = mockVaults.filter((v) => v.riskLevel === args.risk_profile);
  const maxVaults = args.max_vaults || 3;
  candidates = candidates.sort((a, b) => b.pnl30d - a.pnl30d).slice(0, maxVaults);
  if (candidates.length === 0) { candidates = mockVaults.slice(0, maxVaults); }
  const allocation = candidates.map((vault) => { const weight = 1 / candidates.length; const allocation_usd = args.total_budget_usd * weight; const shares = allocation_usd / vault.navPerShare; return { vault_pubkey: vault.pubkey, vault_name: vault.name, weight_pct: Math.round(weight * 100), allocation_usd: Math.round(allocation_usd), shares: shares.toFixed(4), entry_fee_usd: vault.entryFeeUsd, expected_30d_gain_usd: (allocation_usd * vault.pnl30d) / 100 }; });
  return { risk_profile: args.risk_profile, total_budget_usd: args.total_budget_usd, allocation, rationale: `Allocated ${allocation.length} vaults with ${args.risk_profile} risk profile. Top performers selected by 30d PnL.` };
}

function simulateJoinVault(args: { vault_pubkey: string; amount_usd: number; referrer_wallet?: string; }): object {
  const vault = mockVaults.find((v) => v.pubkey === args.vault_pubkey);
  if (!vault) { return { error: `Vault ${args.vault_pubkey} not found` }; }
  const entryFeeUsd = vault.entryFeeUsd;
  const netDepositUsd = args.amount_usd - entryFeeUsd;
  const shares = netDepositUsd / vault.navPerShare;
  const projected30dGain = (netDepositUsd * vault.pnl30d) / 100;
  const projectedValueAfter30d = netDepositUsd + projected30dGain;
  let referralBonus = 0;
  if (args.referrer_wallet) { referralBonus = (args.amount_usd * vault.referralBps) / 10000; }
  return { vault_pubkey: vault.pubkey, vault_name: vault.name, entry_simulation: { deposit_amount_usd: args.amount_usd, entry_fee_usd: entryFeeUsd, net_deposit_usd: netDepositUsd, shares_minted: shares.toFixed(6), nav_per_share: vault.navPerShare }, projection_30d: { vault_pnl_30d_pct: vault.pnl30d, projected_gain_usd: projected30dGain.toFixed(2), projected_value_usd: projectedValueAfter30d.toFixed(2) }, fees: { entry_fee_usd: entryFeeUsd, performance_fee_bps: vault.performanceFeeBps, management_fee_bps: vault.managementFeeBps, referral_bonus_usd: referralBonus } };
}

function getLeaderboard(args: { metric?: 'pnl_30d' | 'aum' | 'members'; limit?: number; }): object {
  const metric = args.metric || 'pnl_30d';
  const limit = args.limit || 5;
  let sorted = [...mockVaults];
  if (metric === 'pnl_30d') { sorted.sort((a, b) => b.pnl30d - a.pnl30d); } else if (metric === 'aum') { sorted.sort((a, b) => b.aumUsd - a.aumUsd); } else if (metric === 'members') { sorted.sort((a, b) => b.memberCount - a.memberCount); }
  const leaderboard = sorted.slice(0, limit).map((vault, index) => ({ rank: index + 1, pubkey: vault.pubkey, name: vault.name, emoji: vault.emoji, creator: vault.creatorHandle, metric_value: metric === 'pnl_30d' ? `${vault.pnl30d.toFixed(2)}%` : metric === 'aum' ? `$${vault.aumUsd.toLocaleString()}` : vault.memberCount }));
  return { metric, leaderboard };
}

function getVaultPerformance(args: { vault_pubkey: string; period?: '7d' | '30d' | '90d' | 'all'; }): object {
  const vault = mockVaults.find((v) => v.pubkey === args.vault_pubkey);
  if (!vault) { return { error: `Vault ${args.vault_pubkey} not found` }; }
  const period = args.period || '30d';
  const navHistory: NAVHistoryPoint[] = [];
  const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  for (let i = daysBack; i >= 0; i--) { const date = new Date(); date.setDate(date.getDate() - i); const trend = Math.sin(i / 10) * 0.05 + 0.001 * i; const navPerShare = 1.0 + trend; navHistory.push({ date: date.toISOString().split('T')[0], navPerShare: parseFloat(navPerShare.toFixed(4)) }); }
  const returns = navHistory.map((p, i) => (i > 0 ? (p.navPerShare - navHistory[i - 1].navPerShare) / navHistory[i - 1].navPerShare : 0));
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev * Math.sqrt(252) : 0;
  const maxNav = Math.max(...navHistory.map((p) => p.navPerShare));
  const navAtMaxDrawdown = navHistory.map((p) => { const maxUpToHere = Math.max(...navHistory.slice(0, navHistory.indexOf(p) + 1).map((x) => x.navPerShare)); return (p.navPerShare - maxUpToHere) / maxUpToHere; });
  const maxDrawdown = Math.min(...navAtMaxDrawdown) * -1;
  const wins = returns.filter((r) => r > 0).length;
  const winRate = (wins / returns.length) * 100;
  const gains = returns.filter((r) => r > 0);
  const losses = returns.filter((r) => r < 0);
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  return { vault_pubkey: vault.pubkey, vault_name: vault.name, period, nav_history: navHistory, metrics: { sharpe_ratio: sharpeRatio.toFixed(2), max_drawdown_pct: (maxDrawdown * 100).toFixed(2), win_rate_pct: winRate.toFixed(2), avg_gain_pct: (avgGain * 100).toFixed(3), avg_loss_pct: (avgLoss * 100).toFixed(3), total_return_pct: ((navHistory[navHistory.length - 1].navPerShare - 1) * 100).toFixed(2) } };
}

// ============================================================================
// Server Setup
// ============================================================================

const server = new Server({ name: 'potbot-mcp', version: '1.0.0' });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      { name: 'list_strategy_vaults', description: 'List all available strategy vaults with filtering and sorting options', inputSchema: { type: 'object', properties: { strategy_type: { type: 'string', enum: ['ai_dca', 'trend_following', 'mean_reversion', 'hodl', 'degen', 'yield'], description: 'Filter by strategy type' }, risk_level: { type: 'string', enum: ['conservative', 'balanced', 'degen'], description: 'Filter by risk level' }, min_pnl_30d: { type: 'number', description: 'Minimum 30-day PnL percentage to include' }, ai_agents_only: { type: 'boolean', description: 'Return only AI agent-managed vaults' }, sort_by: { type: 'string', enum: ['pnl_30d', 'aum', 'members'], description: 'Sort results by metric' } } } },
      { name: 'get_vault_details', description: 'Get full details for a specific vault including fees and performance', inputSchema: { type: 'object', properties: { vault_pubkey: { type: 'string', description: 'The vault public key' } }, required: ['vault_pubkey'] } },
      { name: 'get_my_positions', description: 'Get all my vault positions and portfolio summary', inputSchema: { type: 'object', properties: { wallet_address: { type: 'string', description: 'Your Solana wallet address' } }, required: ['wallet_address'] } },
      { name: 'calculate_allocation', description: 'Calculate optimal allocation across vaults for a given budget and risk profile', inputSchema: { type: 'object', properties: { total_budget_usd: { type: 'number', description: 'Total budget to allocate in USD' }, risk_profile: { type: 'string', enum: ['conservative', 'balanced', 'degen'], description: 'Your risk profile' }, max_vaults: { type: 'number', description: 'Maximum number of vaults to allocate to (default: 3)' } }, required: ['total_budget_usd', 'risk_profile'] } },
      { name: 'simulate_join_vault', description: 'Simulate joining a vault before committing to see fees and projected returns', inputSchema: { type: 'object', properties: { vault_pubkey: { type: 'string', description: 'The vault public key' }, amount_usd: { type: 'number', description: 'Amount to deposit in USD' }, referrer_wallet: { type: 'string', description: 'Optional referrer wallet for bonus' } }, required: ['vault_pubkey', 'amount_usd'] } },
      { name: 'get_leaderboard', description: 'Get top performing vaults ranked by a specific metric', inputSchema: { type: 'object', properties: { metric: { type: 'string', enum: ['pnl_30d', 'aum', 'members'], description: 'Ranking metric (default: pnl_30d)' }, limit: { type: 'number', description: 'Number of top vaults to return (default: 5)' } } } },
      { name: 'get_vault_performance', description: 'Get detailed performance metrics for a vault including Sharpe ratio and drawdown', inputSchema: { type: 'object', properties: { vault_pubkey: { type: 'string', description: 'The vault public key' }, period: { type: 'string', enum: ['7d', '30d', '90d', 'all'], description: 'Performance analysis period (default: 30d)' } }, required: ['vault_pubkey'] } }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments as Record<string, unknown>;
  try {
    let result;
    switch (toolName) {
      case 'list_strategy_vaults':
        result = listStrategyVaults(args as Parameters<typeof listStrategyVaults>[0]);
        break;
      case 'get_vault_details':
        result = getVaultDetails(args as Parameters<typeof getVaultDetails>[0]);
        break;
      case 'get_my_positions':
        result = getMyPositions(args as Parameters<typeof getMyPositions>[0]);
        break;
      case 'calculate_allocation':
        result = calculateAllocation(args as Parameters<typeof calculateAllocation>[0]);
        break;
      case 'simulate_join_vault':
        result = simulateJoinVault(args as Parameters<typeof simulateJoinVault>[0]);
        break;
      case 'get_leaderboard':
        result = getLeaderboard(args as Parameters<typeof getLeaderboard>[0]);
        break;
      case 'get_vault_performance':
        result = getVaultPerformance(args as Parameters<typeof getVaultPerformance>[0]);
        break;
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PotBot MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
