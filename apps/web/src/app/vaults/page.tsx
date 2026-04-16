'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

const VAULTS = [
  { pubkey: 'alpha_dca_001', name: 'Alpha Squad DCA', emoji: '🎯', strategyType: 'ai_dca', riskLevel: 'balanced', creatorType: 'influencer', creatorHandle: '@CryptoYDao', memberCount: 127, aumUsd: 48200, pnl30d: 12.4, tamagotchiLevel: 2, tamagotchiEmoji: '🐥', entryFeeUsd: 5, performanceFeeBps: 1000, isAiAgent: false, },
  { pubkey: 'sol_bull_002', name: 'SOL Bull Market Fund', emoji: '🐂', strategyType: 'trend_following', riskLevel: 'degen', creatorType: 'trader', creatorHandle: 'Sensei', memberCount: 89, aumUsd: 31400, pnl30d: 8.7, tamagotchiLevel: 1, tamagotchiEmoji: '🐣', entryFeeUsd: 10, performanceFeeBps: 1500, isAiAgent: false, },
  { pubkey: 'ai_dca_bot_003', name: 'Autonomous DCA Engine', emoji: '🤖', strategyType: 'ai_dca', riskLevel: 'conservative', creatorType: 'ai_agent', creatorHandle: 'DCA Bot #7', memberCount: 312, aumUsd: 127000, pnl30d: 6.2, tamagotchiLevel: 3, tamagotchiEmoji: '🦅', entryFeeUsd: 0, performanceFeeBps: 500, isAiAgent: true, },
  { pubkey: 'degen_mode_004', name: 'Degen Mode', emoji: '🎰', strategyType: 'degen', riskLevel: 'degen', creatorType: 'trader', creatorHandle: 'Moon_Bro', memberCount: 45, aumUsd: 12800, pnl30d: 34.1, tamagotchiLevel: 1, tamagotchiEmoji: '🐣', entryFeeUsd: 20, performanceFeeBps: 2000, isAiAgent: false, },
  { pubkey: 'yield_dao_005', name: 'Yield Farmers DAO', emoji: '🌾', strategyType: 'yield', riskLevel: 'conservative', creatorType: 'community', creatorHandle: 'Y-DAO', memberCount: 203, aumUsd: 89500, pnl30d: 4.1, tamagotchiLevel: 3, tamagotchiEmoji: '🦅', entryFeeUsd: 0, performanceFeeBps: 800, isAiAgent: false, },
  { pubkey: 'ai_treasury_006', name: 'AI Treasury Manager', emoji: '🤖', strategyType: 'ai_dca', riskLevel: 'balanced', creatorType: 'ai_agent', creatorHandle: 'Treasury AI v1', memberCount: 567, aumUsd: 234000, pnl30d: 9.8, tamagotchiLevel: 4, tamagotchiEmoji: '🐉', entryFeeUsd: 0, performanceFeeBps: 700, isAiAgent: true, },
  { pubkey: 'contra_007', name: 'Contrarian Club', emoji: '🔄', strategyType: 'mean_reversion', riskLevel: 'balanced', creatorType: 'trader', creatorHandle: 'Zig_Zag', memberCount: 67, aumUsd: 22100, pnl30d: 5.3, tamagotchiLevel: 1, tamagotchiEmoji: '🐣', entryFeeUsd: 5, performanceFeeBps: 1200, isAiAgent: false, },
  { pubkey: 'diamond_008', name: 'Diamond Hands DAO', emoji: '💎', strategyType: 'hodl', riskLevel: 'conservative', creatorType: 'community', creatorHandle: 'Diamond DAO', memberCount: 891, aumUsd: 445000, pnl30d: 18.2, tamagotchiLevel: 4, tamagotchiEmoji: '🐉', entryFeeUsd: 0, performanceFeeBps: 300, isAiAgent: false, },
];

const STRATEGY_COLORS = { ai_dca: '#9945FF', trend_following: '#14F195', mean_reversion: '#F59E0B', hodl: '#3B82F6', degen: '#EF4444', yield: '#10B981', };
const STRATEGY_LABELS = { ai_dca: '🤖 AI DCA', trend_following: '📈 Trend', mean_reversion: '🔄 Mean Rev', hodl: '💎 HODL', degen: '🎰 Degen', yield: '🌾 Yield', };

export default function VaultsPage() {
  const [selectedStrategy, setSelectedStrategy] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('returns');
  const [searchQuery, setSearchQuery] = useState('');
  const [joinedVaults, setJoinedVaults] = useState(new Set());

  const filteredAndSortedVaults = useMemo(() => {
    let filtered = VAULTS.filter((vault) => {
      const matchesStrategy = selectedStrategy === 'all' || vault.strategyType === selectedStrategy;
      const matchesCreator = creatorFilter === 'all' || (creatorFilter === 'ai_agents' && vault.isAiAgent) || (creatorFilter === 'human' && !vault.isAiAgent);
      const matchesSearch = vault.name.toLowerCase().includes(searchQuery.toLowerCase()) || vault.creatorHandle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStrategy && matchesCreator && matchesSearch;
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'returns') return b.pnl30d - a.pnl30d;
      if (sortBy === 'aum') return b.aumUsd - a.aumUsd;
      if (sortBy === 'members') return b.memberCount - a.memberCount;
      return 0;
    });
  }, [selectedStrategy, creatorFilter, sortBy, searchQuery]);

  const totalAum = VAULTS.reduce((sum, v) => sum + v.aumUsd, 0);
  const avgReturn = (VAULTS.reduce((sum, v) => sum + v.pnl30d, 0) / VAULTS.length).toFixed(1);
  const totalMembers = VAULTS.reduce((sum, v) => sum + v.memberCount, 0);

  const handleJoinVault = (pubkey) => {
    const newSet = new Set(joinedVaults);
    if (newSet.has(pubkey)) { newSet.delete(pubkey); } else { newSet.add(pubkey); }
    setJoinedVaults(newSet);
  };

  return (
    <div style={{ backgroundColor: '#0D1117', color: 'white', minHeight: '100vh', fontFamily: 'Geist, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#0D1117', borderBottom: '1px solid #1A2332', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: '#8B9BB4', textDecoration: 'none', fontSize: '14px' }}>← Back</Link>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>⚡ PotBot Vaults</h1>
        </div>
        <button style={{ backgroundColor: '#14F195', color: '#0D1117', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', }}>+ Create Vault</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '24px', borderBottom: '1px solid #1A2332', maxWidth: '1400px', margin: '0 auto', }}>
        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1A2332' }}><div style={{ fontSize: '12px', color: '#8B9BB4', marginBottom: '8px' }}>Total AUM</div><div style={{ fontSize: '20px', fontWeight: '700' }}>${(totalAum / 1000).toFixed(0)}K</div></div>
        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1A2332' }}><div style={{ fontSize: '12px', color: '#8B9BB4', marginBottom: '8px' }}>Active Vaults</div><div style={{ fontSize: '20px', fontWeight: '700' }}>8</div></div>
        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1A2332' }}><div style={{ fontSize: '12px', color: '#8B9BB4', marginBottom: '8px' }}>Total Members</div><div style={{ fontSize: '20px', fontWeight: '700' }}>{totalMembers.toLocaleString()}</div></div>
        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1A2332' }}><div style={{ fontSize: '12px', color: '#8B9BB4', marginBottom: '8px' }}>Avg 30d Return</div><div style={{ fontSize: '20px', fontWeight: '700', color: '#14F195' }}>+{avgReturn}%</div></div>
      </div>

      <div style={{ margin: '24px auto', maxWidth: '1400px', padding: '20px 24px', backgroundColor: '#9945FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', }}>
        <div style={{ fontSize: '14px' }}>🤖 PotBot is MCP-native — AI agents can autonomously allocate treasury across vaults</div>
        <Link href="/for-agents" style={{ color: '#0D1117', textDecoration: 'none', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', }}>For AI Agents →</Link>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'ai_dca', 'trend_following', 'mean_reversion', 'hodl', 'degen', 'yield'].map((strategy) => (
            <button key={strategy} onClick={() => setSelectedStrategy(strategy)} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #1A2332', backgroundColor: selectedStrategy === strategy ? '#14F195' : 'transparent', color: selectedStrategy === strategy ? '#0D1117' : 'white', fontSize: '13px', cursor: 'pointer', fontWeight: selectedStrategy === strategy ? '600' : '400', }}>
              {strategy === 'all' ? 'All' : STRATEGY_LABELS[strategy]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
          <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} style={{ backgroundColor: '#111827', border: '1px solid #1A2332', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', }}>
            <option value="all">All Types</option>
            <option value="ai_agents">AI Agents Only</option>
            <option value="human">Human Traders</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ backgroundColor: '#111827', border: '1px solid #1A2332', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', }}>
            <option value="returns">Best Returns</option>
            <option value="aum">Biggest AUM</option>
            <option value="members">Most Members</option>
          </select>
          <input type="text" placeholder="Search vaults..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ backgroundColor: '#111827', border: '1px solid #1A2332', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', minWidth: '200px', }} />
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', }}>
        {filteredAndSortedVaults.map((vault) => (
          <div key={vault.pubkey} style={{ backgroundColor: '#111827', border: '1px solid #1A2332', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>{vault.emoji}</span>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{vault.name}</div>
              </div>
              <span style={{ fontSize: '20px' }}>{vault.tamagotchiEmoji}</span>
            </div>
            <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', backgroundColor: STRATEGY_COLORS[vault.strategyType], color: '#0D1117', fontSize: '12px', fontWeight: '600', width: 'fit-content', }}>
              {STRATEGY_LABELS[vault.strategyType]}
            </div>
            <div style={{ fontSize: '13px', color: '#8B9BB4' }}>
              {vault.isAiAgent ? '🤖 ' : '@'}
              {vault.creatorHandle}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div><div style={{ color: '#8B9BB4', marginBottom: '4px' }}>Members</div><div style={{ fontWeight: '600' }}>{vault.memberCount}</div></div>
              <div><div style={{ color: '#8B9BB4', marginBottom: '4px' }}>AUM</div><div style={{ fontWeight: '600' }}>${(vault.aumUsd / 1000).toFixed(1)}K</div></div>
              <div><div style={{ color: '#8B9BB4', marginBottom: '4px' }}>30d PnL</div><div style={{ fontWeight: '600', color: vault.pnl30d >= 0 ? '#14F195' : '#EF4444' }}>
                {vault.pnl30d >= 0 ? '+' : ''}
                {vault.pnl30d}%
              </div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '24px', marginTop: '4px' }}>
              {[40, 60, 35].map((height, i) => (
                <div key={i} style={{ flex: 1, height: `${height}%`, backgroundColor: '#14F195', borderRadius: '2px', opacity: 0.7, }} />
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#8B9BB4', marginTop: '8px' }}>
              <div>{vault.entryFeeUsd === 0 ? 'Free' : `$${vault.entryFeeUsd}`} entry</div>
              <div>{(vault.performanceFeeBps / 100).toFixed(1)}% perf fee</div>
            </div>
            <button onClick={() => handleJoinVault(vault.pubkey)} style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', backgroundColor: joinedVaults.has(vault.pubkey) ? '#6B7280' : '#14F195', color: joinedVaults.has(vault.pubkey) ? 'white' : '#0D1117', }}>
              {joinedVaults.has(vault.pubkey) ? 'Joined ✓' : 'Join Vault'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px', borderTop: '1px solid #1A2332', }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Strategy Types</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {[{ key: 'ai_dca', label: '🤖 AI DCA', desc: 'Automated dollar-cost averaging using AI signals' }, { key: 'trend_following', label: '📈 Trend Following', desc: 'Ride momentum based on technical indicators' }, { key: 'mean_reversion', label: '🔄 Mean Reversion', desc: 'Capitalize on price swings back to average' }, { key: 'hodl', label: '💎 HODL', desc: 'Long-term buy and hold strategy' }, { key: 'degen', label: '🎰 Degen', desc: 'High-risk, high-reward experimental strategies' }, { key: 'yield', label: '🌾 Yield Farming', desc: 'Maximize yield through DeFi protocols' }].map((strategy) => (
            <div key={strategy.key} style={{ backgroundColor: '#111827', border: `1px solid ${STRATEGY_COLORS[strategy.key]}`, borderRadius: '8px', padding: '16px', }}>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>{strategy.label}</div>
              <div style={{ fontSize: '13px', color: '#8B9BB4' }}>{strategy.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
