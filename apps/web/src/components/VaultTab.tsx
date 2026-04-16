'use client';

/**
 * VaultTab — shown inside the pot detail page under the "Vault" tab.
 *
 * Displays:
 * - Linked Strategy Vault (if exists): tamagotchi level, fees, PnL
 * - Tamagotchi progression bar & unlock milestones
 * - Performance summary (7d / 30d / all-time)
 * - Fee breakdown (entry, performance, management, referral)
 * - CTA to create a vault if none exists
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  useStrategyVaultStore,
  TAMAGOTCHI_META,
  STRATEGY_META,
  type StrategyVault,
} from '@/lib/strategy-vault-store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VaultTabProps {
  potPubkey: string;
  isCreator: boolean;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const css = {
  card: '#111827',
  border: '#1A2332',
  green: '#14F195',
  purple: '#9945FF',
  muted: '#8B9BB4',
  red: '#EF4444',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${fmt(n / 1_000_000, 1)}M`;
  if (n >= 1_000) return `$${fmt(n / 1_000, 1)}K`;
  return `$${fmt(n)}`;
}

function pnlColor(pct: number) {
  return pct >= 0 ? css.green : css.red;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ backgroundColor: '#0D1117', border: `1px solid ${css.border}`, borderRadius: '8px', padding: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: css.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: '800' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: css.muted, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function TamagotchiProgress({ vault }: { vault: StrategyVault }) {
  const level = vault.tamagotchiLevel;
  const current = TAMAGOTCHI_META[level];
  const next = TAMAGOTCHI_META[level + 1];

  // Progress within current level (mock: use member count)
  const memberReqs = [0, 10, 50, 200, 500, 1000];
  const currentReq = memberReqs[level] ?? 0;
  const nextReq = memberReqs[level + 1] ?? memberReqs[level];
  const progressPct = level >= 5 ? 100 : Math.min(100, ((vault.memberCount - currentReq) / (nextReq - currentReq)) * 100);

  return (
    <div style={{ backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '12px', padding: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: css.muted, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        🐾 Tamagotchi
      </div>

      {/* Current level display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          backgroundColor: `${css.purple}20`,
          border: `3px solid ${css.purple}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px',
        }}>
          {current.emoji}
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '2px' }}>
            {current.title}
            <span style={{ fontSize: '13px', fontWeight: '400', color: css.muted, marginLeft: '8px' }}>
              Level {level}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: css.muted }}>{current.name}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px' }}>
            <span style={{ color: css.green, fontWeight: '700' }}>
              Swap fee: {(current.swapFeeBps / 100).toFixed(2)}%
            </span>
            {current.entryDiscountBps > 0 && (
              <span style={{ color: css.purple, fontWeight: '700' }}>
                Entry discount: {current.entryDiscountBps / 100}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {level < 5 && next && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: css.muted, marginBottom: '8px' }}>
            <span>Progress to {next.emoji} {next.title}</span>
            <span style={{ color: css.purple, fontWeight: '700' }}>{Math.round(progressPct)}%</span>
          </div>
          <div style={{ backgroundColor: '#1A2332', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${css.purple}, ${css.green})`,
              borderRadius: '4px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: '11px', color: css.muted, marginTop: '6px' }}>
            {next.requirement}
          </div>
        </div>
      )}

      {level >= 5 && (
        <div style={{
          backgroundColor: `${css.green}10`, border: `1px solid ${css.green}30`,
          borderRadius: '8px', padding: '12px', textAlign: 'center',
          fontSize: '13px', color: css.green, fontWeight: '700',
        }}>
          ⚡ Max level reached — Titan status achieved!
        </div>
      )}

      {/* All level milestones */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'center' }}>
        {TAMAGOTCHI_META.map((t, i) => (
          <div
            key={i}
            title={`${t.title} — ${t.requirement}`}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: i <= level ? `${css.purple}30` : '#0D1117',
              border: `2px solid ${i === level ? css.purple : i < level ? `${css.purple}50` : css.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
              opacity: i > level ? 0.4 : 1,
            }}
          >
            {t.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceSection({ vault }: { vault: StrategyVault }) {
  const stratMeta = STRATEGY_META[vault.strategyType];

  return (
    <div style={{ backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '12px', padding: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: css.muted, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        📊 Performance
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <StatCard
          label="7d Return"
          value={<span style={{ color: pnlColor(vault.pnl7d) }}>{vault.pnl7d > 0 ? '+' : ''}{fmt(vault.pnl7d)}%</span>}
        />
        <StatCard
          label="30d Return"
          value={<span style={{ color: pnlColor(vault.pnl30d) }}>{vault.pnl30d > 0 ? '+' : ''}{fmt(vault.pnl30d)}%</span>}
        />
        <StatCard
          label="All-Time"
          value={<span style={{ color: pnlColor(vault.pnlAllTime) }}>{vault.pnlAllTime > 0 ? '+' : ''}{fmt(vault.pnlAllTime)}%</span>}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <StatCard label="AUM" value={fmtUsd(vault.aumUsd)} sub={`${vault.memberCount} members`} />
        <StatCard
          label="NAV / Share"
          value={<span style={{ color: css.green }}>${fmt(vault.navPerShare, 4)}</span>}
          sub="Started at $1.0000"
        />
      </div>

      <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#0D1117', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>{stratMeta.emoji}</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: stratMeta.color }}>{stratMeta.label}</div>
          <div style={{ fontSize: '12px', color: css.muted }}>{stratMeta.description}</div>
        </div>
      </div>
    </div>
  );
}

function FeeSection({ vault }: { vault: StrategyVault }) {
  const bps = (n: number) => `${(n / 100).toFixed(1)}%`;
  const current = TAMAGOTCHI_META[vault.tamagotchiLevel];

  const rows = [
    {
      label: 'Entry Fee',
      value: vault.entryFeeUsd === 0 ? 'Free' : `$${vault.entryFeeUsd}`,
      note: current.entryDiscountBps > 0
        ? `${current.entryDiscountBps / 100}% discount at this Tamagotchi level`
        : 'No discount yet — grow your vault!',
    },
    {
      label: 'Performance Fee',
      value: bps(vault.performanceFeeBps),
      note: 'Charged on profit when member exits',
    },
    {
      label: 'Management Fee',
      value: bps(vault.managementFeeBps),
      note: 'Annual, charged via crank',
    },
    {
      label: 'Referral Bonus',
      value: bps(vault.referralBps),
      note: 'Referrer receives this from entry fee',
    },
    {
      label: 'Swap Fee',
      value: `${(current.swapFeeBps / 100).toFixed(2)}%`,
      note: `${current.emoji} ${current.title} level rate — drops as vault grows`,
    },
  ];

  return (
    <div style={{ backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '12px', padding: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: css.muted, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        💸 Fee Structure
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0',
            borderBottom: i < rows.length - 1 ? `1px solid ${css.border}` : 'none',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{row.label}</div>
              <div style={{ fontSize: '12px', color: css.muted, marginTop: '2px' }}>{row.note}</div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: css.green, minWidth: '64px', textAlign: 'right' }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '16px', backgroundColor: '#0D1117', border: `1px solid ${css.purple}30`,
        borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: css.muted, lineHeight: 1.6,
      }}>
        <span style={{ color: css.purple, fontWeight: '700' }}>Fee split on join:</span>{' '}
        70% → vault creator · 20% → PotBot reserve · 10% → referrer. Executed atomically on-chain.
      </div>
    </div>
  );
}

// ─── No vault state ───────────────────────────────────────────────────────────

function NoVaultState({ potPubkey, isCreator }: { potPubkey: string; isCreator: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥚</div>
      <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>No Strategy Vault Yet</h3>
      <p style={{ color: css.muted, fontSize: '14px', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
        {isCreator
          ? 'Create a Strategy Vault for this pot to unlock performance fees, tamagotchi levels, and AI agent integration.'
          : 'The creator of this pot hasn\'t set up a Strategy Vault yet.'}
      </p>

      {isCreator && (
        <Link
          href="/vaults/create"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            backgroundColor: css.purple,
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '700',
          }}
        >
          🚀 Create Strategy Vault
        </Link>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '40px', maxWidth: '500px', margin: '40px auto 0' }}>
        {[
          { icon: '💸', title: 'Earn Fees', desc: 'Performance + management fees from members' },
          { icon: '🐾', title: 'Tamagotchi', desc: 'Grow your vault for lower swap fees' },
          { icon: '🤖', title: 'AI Agent', desc: 'MCP-ready for autonomous treasury management' },
        ].map((f) => (
          <div key={f.title} style={{ backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>{f.title}</div>
            <div style={{ fontSize: '11px', color: css.muted }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VaultTab({ potPubkey, isCreator }: VaultTabProps) {
  const vaults = useStrategyVaultStore((s) => s.vaults);

  const vault: StrategyVault | undefined = useMemo(
    () => vaults.find((v) => v.potPubkey === potPubkey || v.pubkey === potPubkey),
    [vaults, potPubkey]
  );

  if (!vault) {
    return <NoVaultState potPubkey={potPubkey} isCreator={isCreator} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '12px', padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '28px' }}>{vault.emoji}</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px' }}>{vault.name}</div>
            <div style={{ fontSize: '12px', color: css.muted }}>
              {vault.isAiAgent ? '🤖 AI Agent · ' : ''}{STRATEGY_META[vault.strategyType].label} · {vault.riskLevel}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{
            padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
            backgroundColor: `${css.green}20`, color: css.green,
          }}>
            {vault.isActive ? '● Active' : '○ Paused'}
          </span>
          <Link
            href="/vaults"
            style={{
              padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
              backgroundColor: `${css.purple}20`, color: css.purple, textDecoration: 'none',
            }}
          >
            View →
          </Link>
        </div>
      </div>

      {/* Tamagotchi */}
      <TamagotchiProgress vault={vault} />

      {/* Performance */}
      <PerformanceSection vault={vault} />

      {/* Fees */}
      <FeeSection vault={vault} />
    </div>
  );
}
