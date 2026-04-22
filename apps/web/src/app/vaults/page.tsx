'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePots } from '@/hooks/usePots';
import { useSolPrice } from '@/lib/prices';
import { useVaultAnalyticsBatch } from '@/hooks/useAnalytics';

// ─────────────────────────────────────────────────────────────────
// Demo data — shown when the on-chain program isn't deployed yet
// ─────────────────────────────────────────────────────────────────
const DEMO_VAULTS = [
  { pubkey: 'alpha_dca_001', name: 'Alpha Squad DCA', emoji: '🎯', strategyType: 'ai_dca', riskLevel: 'balanced', creatorType: 'influencer', creatorHandle: '@CryptoYDao', memberCount: 127, aumUsd: 48200, pnl30d: 12.4, tamagotchiLevel: 2, tamagotchiEmoji: '🐥', entryFeeUsd: 5, performanceFeeBps: 1000, isAiAgent: false, apy30d: 0, isDemo: true },
  { pubkey: 'sol_bull_002', name: 'SOL Bull Market Fund', emoji: '🐂', strategyType: 'trend_following', riskLevel: 'degen', creatorType: 'trader', creatorHandle: 'Sensei', memberCount: 89, aumUsd: 31400, pnl30d: 8.7, tamagotchiLevel: 1, tamagotchiEmoji: '🐣', entryFeeUsd: 10, performanceFeeBps: 1500, isAiAgent: false, apy30d: 0, isDemo: true },
  { pubkey: 'ai_dca_bot_003', name: 'Autonomous DCA Engine', emoji: '🤖', strategyType: 'ai_dca', riskLevel: 'conservative', creatorType: 'ai_agent', creatorHandle: 'DCA Bot #7', memberCount: 312, aumUsd: 127000, pnl30d: 6.2, tamagotchiLevel: 3, tamagotchiEmoji: '🦅', entryFeeUsd: 0, performanceFeeBps: 500, isAiAgent: true, apy30d: 0, isDemo: true },
  { pubkey: 'degen_mode_004', name: 'Degen Mode', emoji: '🎰', strategyType: 'degen', riskLevel: 'degen', creatorType: 'trader', creatorHandle: 'Moon_Bro', memberCount: 45, aumUsd: 12800, pnl30d: 34.1, tamagotchiLevel: 1, tamagotchiEmoji: '🐣', entryFeeUsd: 20, performanceFeeBps: 2000, isAiAgent: false, apy30d: 0, isDemo: true },
  { pubkey: 'yield_dao_005', name: 'Yield Farmers DAO', emoji: '🌾', strategyType: 'yield', riskLevel: 'conservative', creatorType: 'community', creatorHandle: 'Y-DAO', memberCount: 203, aumUsd: 89500, pnl30d: 4.1, tamagotchiLevel: 3, tamagotchiEmoji: '🦅', entryFeeUsd: 0, performanceFeeBps: 800, isAiAgent: false, apy30d: 0, isDemo: true },
  { pubkey: 'ai_treasury_006', name: 'AI Treasury Manager', emoji: '🤖', strategyType: 'ai_dca', riskLevel: 'balanced', creatorType: 'ai_agent', creatorHandle: 'Treasury AI v1', memberCount: 567, aumUsd: 234000, pnl30d: 9.8, tamagotchiLevel: 4, tamagotchiEmoji: '🐉', entryFeeUsd: 0, performanceFeeBps: 700, isAiAgent: true, apy30d: 0, isDemo: true },
  { pubkey: 'contra_007', name: 'Contrarian Club', emoji: '🔄', strategyType: 'mean_reversion', riskLevel: 'balanced', creatorType: 'trader', creatorHandle: 'Zig_Zag', memberCount: 67, aumUsd: 22100, pnl30d: 5.3, tamagotchiLevel: 1, tamagotchiEmoji: '🐣', entryFeeUsd: 5, performanceFeeBps: 1200, isAiAgent: false, apy30d: 0, isDemo: true },
  { pubkey: 'diamond_008', name: 'Diamond Hands DAO', emoji: '💎', strategyType: 'hodl', riskLevel: 'conservative', creatorType: 'community', creatorHandle: 'Diamond DAO', memberCount: 891, aumUsd: 445000, pnl30d: 18.2, tamagotchiLevel: 4, tamagotchiEmoji: '🐉', entryFeeUsd: 0, performanceFeeBps: 300, isAiAgent: false, apy30d: 0, isDemo: true },
];

// Map on-chain yieldStrategy → display strategyType
const YIELD_TO_STRATEGY: Record<string | number, string> = {
  0: 'hodl',            none: 'hodl',
  1: 'yield',           conservative: 'yield',
  2: 'ai_dca',          balanced: 'ai_dca',
  3: 'trend_following', aggressive: 'trend_following',
  4: 'degen',           jlp: 'degen',
}

const STRATEGY_COLORS: Record<string, string> = {
  ai_dca: '#9945FF',
  trend_following: '#14F195',
  mean_reversion: '#F59E0B',
  hodl: '#3B82F6',
  degen: '#EF4444',
  yield: '#10B981',
};

const STRATEGY_LABELS: Record<string, string> = {
  ai_dca: '🤖 AI DCA',
  trend_following: '📈 Trend',
  mean_reversion: '🔄 Mean Rev',
  hodl: '💎 HODL',
  degen: '🎰 Degen',
  yield: '🌾 Yield',
};

export default function VaultsPage() {
  const [selectedStrategy, setSelectedStrategy] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('returns');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Live data ────────────────────────────────────────────────────────────
  const { data: pots = [], isLoading: potsLoading } = usePots();
  const { price: solPrice } = useSolPrice();

  // Batch-fetch analytics for all visible pots
  const livePubkeys = useMemo(() => pots.map((p: any) => p.pubkey), [pots]);
  const { dataMap: analyticsMap, isLoading: analyticsLoading } = useVaultAnalyticsBatch(livePubkeys);

  const isLiveData = pots.length > 0;

  // ── Map real pots → vault card shape ─────────────────────────────────────
  const liveVaults = useMemo(() => {
    const solUsd = solPrice ?? 150; // fallback price if not yet loaded
    return pots.map((pot: any) => {
      const analytics = analyticsMap[pot.pubkey];
      const aumUsd = analytics?.navUsd ?? (pot.balance * solUsd);
      const pnl30d = analytics?.pnlPct ?? 0;
      const apy30d = analytics?.apy30d ?? 0;
      return {
        pubkey:           pot.pubkey,
        name:             pot.name,
        emoji:            pot.emoji || '🪴',
        strategyType:     YIELD_TO_STRATEGY[pot.yieldStrategy] ?? 'ai_dca',
        riskLevel:        'balanced',
        creatorType:      'community',
        creatorHandle:    `${pot.pubkey.slice(0, 4)}…${pot.pubkey.slice(-4)}`,
        memberCount:      pot.memberCount,
        aumUsd,
        pnl30d:           Number(pnl30d.toFixed(2)),
        apy30d:           Number(apy30d.toFixed(1)),
        tamagotchiLevel:  pot.tamagotchiLevel,
        tamagotchiEmoji:  pot.tamagotchiEmoji,
        entryFeeUsd:      0,
        performanceFeeBps: 0,
        isAiAgent:        false,
        isDemo:           false,
      };
    });
  }, [pots, analyticsMap, solPrice]);

  // Use live vaults if on-chain program is active, otherwise demo data
  const allVaults = isLiveData ? liveVaults : DEMO_VAULTS;

  // ── Filtering & sorting ──────────────────────────────────────────────────
  const filteredAndSortedVaults = useMemo(() => {
    let filtered = allVaults.filter((vault) => {
      const matchesStrategy = selectedStrategy === 'all' || vault.strategyType === selectedStrategy;
      const matchesCreator = creatorFilter === 'all'
        || (creatorFilter === 'ai_agents' && vault.isAiAgent)
        || (creatorFilter === 'human' && !vault.isAiAgent);
      const matchesSearch =
        vault.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vault.creatorHandle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStrategy && matchesCreator && matchesSearch;
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'returns') return b.pnl30d - a.pnl30d;
      if (sortBy === 'aum')     return b.aumUsd - a.aumUsd;
      if (sortBy === 'members') return b.memberCount - a.memberCount;
      return 0;
    });
  }, [allVaults, selectedStrategy, creatorFilter, sortBy, searchQuery]);

  // ── Aggregate stats ─────────────────────────────────────────────────────
  const totalAum     = allVaults.reduce((s, v) => s + v.aumUsd, 0);
  const avgReturn    = allVaults.length > 0
    ? (allVaults.reduce((s, v) => s + v.pnl30d, 0) / allVaults.length).toFixed(1)
    : '0.0';
  const totalMembers = allVaults.reduce((s, v) => s + v.memberCount, 0);

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Geist, sans-serif', color: 'var(--c-text)' }}>
      {/* Page header — NOT sticky (global <Navbar/> in layout.tsx already is;
          two sticky headers at top:0 caused z-fighting and the global nav
          disappearing on scroll). */}
      <div style={{ borderBottom: '1px solid var(--c-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: 'var(--c-muted)', textDecoration: 'none', fontSize: '14px' }}>← Back</Link>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>⚡ PotBot Vaults</h1>
          {/* Live / Demo badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--c-muted)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isLiveData ? '#14F195' : '#F59E0B', animation: isLiveData ? 'pulse 2s infinite' : 'none' }} />
            <span style={{ color: isLiveData ? '#14F195' : '#F59E0B' }}>{isLiveData ? 'Live data' : 'Demo'}</span>
          </div>
        </div>
        <Link href="/create" style={{ backgroundColor: '#14F195', color: '#0D1117', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>+ Create Vault</Link>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '24px', borderBottom: '1px solid var(--c-border)', maxWidth: '1400px', margin: '0 auto' }}>
        <StatCard label="Total AUM" value={totalAum >= 1_000_000 ? `$${(totalAum/1_000_000).toFixed(1)}M` : `$${(totalAum/1000).toFixed(0)}K`} loading={potsLoading} />
        <StatCard label="Active Vaults" value={String(allVaults.length)} loading={potsLoading} />
        <StatCard label="Total Members" value={totalMembers.toLocaleString()} loading={potsLoading} />
        <StatCard label="Avg PnL" value={`${Number(avgReturn) >= 0 ? '+' : ''}${avgReturn}%`} loading={potsLoading} color="#14F195" />
      </div>

      {/* AI Agents banner */}
      <div style={{ margin: '24px auto', maxWidth: '1400px', padding: '20px 24px', backgroundColor: '#9945FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '14px' }}>🤖 PotBot is MCP-native — AI agents can autonomously allocate treasury across vaults</div>
        <Link href="/for-agents" style={{ color: '#0D1117', textDecoration: 'none', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>For AI Agents →</Link>
      </div>

      {/* Filters */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'ai_dca', 'trend_following', 'mean_reversion', 'hodl', 'degen', 'yield'].map((strategy) => (
            <button key={strategy} onClick={() => setSelectedStrategy(strategy)} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--c-border)', backgroundColor: selectedStrategy === strategy ? '#14F195' : 'transparent', color: selectedStrategy === strategy ? '#0D1117' : 'var(--c-text)', fontSize: '13px', cursor: 'pointer', fontWeight: selectedStrategy === strategy ? '600' : '400' }}>
              {strategy === 'all' ? 'All' : STRATEGY_LABELS[strategy]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
          <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            <option value="all">All Types</option>
            <option value="ai_agents">AI Agents Only</option>
            <option value="human">Human Traders</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            <option value="returns">Best Returns</option>
            <option value="aum">Biggest AUM</option>
            <option value="members">Most Members</option>
          </select>
          <input type="text" placeholder="Search vaults..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', minWidth: '200px' }} />
        </div>
      </div>

      {/* Vault grid */}
      {potsLoading ? (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: '8px', height: '220px', animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredAndSortedVaults.map((vault) => (
            <VaultCard
              key={vault.pubkey}
              vault={vault}
              analyticsLoading={analyticsLoading && !vault.isDemo}
            />
          ))}
        </div>
      )}

      {/* Strategy legend */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px', borderTop: '1px solid var(--c-border)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Strategy Types</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {[
            { key: 'ai_dca',          label: '🤖 AI DCA',           desc: 'Automated dollar-cost averaging using AI signals' },
            { key: 'trend_following', label: '📈 Trend Following',   desc: 'Ride momentum based on technical indicators' },
            { key: 'mean_reversion',  label: '🔄 Mean Reversion',    desc: 'Capitalize on price swings back to average' },
            { key: 'hodl',            label: '💎 HODL',              desc: 'Long-term buy and hold strategy' },
            { key: 'degen',           label: '🎰 Degen',             desc: 'High-risk, high-reward experimental strategies' },
            { key: 'yield',           label: '🌾 Yield Farming',     desc: 'Maximize yield through DeFi protocols' },
          ].map((s) => (
            <div key={s.key} style={{ backgroundColor: 'var(--c-card)', border: `1px solid ${STRATEGY_COLORS[s.key]}`, borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: '13px', color: 'var(--c-muted)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── VaultCard ────────────────────────────────────────────────────────────────

function StatCard({ label, value, loading, color }: { label: string; value: string; loading?: boolean; color?: string }) {
  return (
    <div style={{ backgroundColor: 'var(--c-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
      <div style={{ fontSize: '12px', color: 'var(--c-muted)', marginBottom: '8px' }}>{label}</div>
      {loading ? (
        <div style={{ height: '28px', width: '60px', backgroundColor: 'var(--c-border)', borderRadius: '4px' }} />
      ) : (
        <div style={{ fontSize: '20px', fontWeight: '700', color: color ?? 'var(--c-text)' }}>{value}</div>
      )}
    </div>
  );
}

function VaultCard({ vault, analyticsLoading }: { vault: any; analyticsLoading: boolean }) {
  const pnlColor = vault.pnl30d >= 0 ? '#14F195' : '#EF4444';
  const apyColor = '#9945FF';

  return (
    <Link
      href={vault.isDemo ? '#' : `/pots/${vault.pubkey}`}
      style={{ textDecoration: 'none' }}
    >
      <div style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>{vault.emoji}</span>
            <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--c-text)' }}>{vault.name}</div>
          </div>
          <span style={{ fontSize: '20px' }}>{vault.tamagotchiEmoji}</span>
        </div>

        {/* Strategy badge */}
        <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', backgroundColor: STRATEGY_COLORS[vault.strategyType] ?? '#9945FF', color: '#0D1117', fontSize: '12px', fontWeight: '600', width: 'fit-content' }}>
          {STRATEGY_LABELS[vault.strategyType] ?? vault.strategyType}
        </div>

        {/* Creator */}
        <div style={{ fontSize: '13px', color: 'var(--c-muted)' }}>
          {vault.isAiAgent ? '🤖 ' : '@'}{vault.creatorHandle}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
          <div>
            <div style={{ color: 'var(--c-muted)', marginBottom: '4px' }}>Members</div>
            <div style={{ fontWeight: '600', color: 'var(--c-text)' }}>{vault.memberCount}</div>
          </div>
          <div>
            <div style={{ color: 'var(--c-muted)', marginBottom: '4px' }}>AUM</div>
            {analyticsLoading ? (
              <div style={{ height: '16px', width: '40px', backgroundColor: 'var(--c-border)', borderRadius: '3px' }} />
            ) : (
              <div style={{ fontWeight: '600', color: 'var(--c-text)' }}>
                {vault.aumUsd >= 1_000 ? `$${(vault.aumUsd/1_000).toFixed(1)}K` : `$${vault.aumUsd.toFixed(0)}`}
              </div>
            )}
          </div>
          <div>
            <div style={{ color: 'var(--c-muted)', marginBottom: '4px' }}>PnL</div>
            {analyticsLoading ? (
              <div style={{ height: '16px', width: '40px', backgroundColor: 'var(--c-border)', borderRadius: '3px' }} />
            ) : (
              <div style={{ fontWeight: '600', color: pnlColor }}>
                {vault.pnl30d >= 0 ? '+' : ''}{vault.pnl30d}%
              </div>
            )}
          </div>
        </div>

        {/* APY row (live data only) */}
        {!vault.isDemo && vault.apy30d > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ color: 'var(--c-muted)' }}>APY 30d:</span>
            <span style={{ fontWeight: '700', color: apyColor }}>{vault.apy30d.toFixed(1)}%</span>
          </div>
        )}

        {/* Mini chart bars (decorative) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '24px', marginTop: '4px' }}>
          {[40, 60, 35, 70, 50, 80, 65].map((height, i) => (
            <div
              key={i}
              style={{ flex: 1, height: `${height}%`, backgroundColor: pnlColor, borderRadius: '2px', opacity: 0.6 }}
            />
          ))}
        </div>

        {/* Fee info */}
        <div style={{ fontSize: '12px', color: 'var(--c-muted)', marginTop: '4px' }}>
          {vault.entryFeeUsd === 0 ? 'Free entry' : `$${vault.entryFeeUsd} entry`}
          {vault.performanceFeeBps > 0 && ` · ${(vault.performanceFeeBps / 100).toFixed(1)}% perf fee`}
        </div>

        {/* CTA */}
        {!vault.isDemo && (
          <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px', backgroundColor: '#14F195', color: '#0D1117', textAlign: 'center' }}>
            View Vault →
          </div>
        )}
      </div>
    </Link>
  );
}
