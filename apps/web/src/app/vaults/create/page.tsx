'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useStrategyVaultStore,
  STRATEGY_META,
  TAMAGOTCHI_META,
  type StrategyType,
  type RiskLevel,
} from '@/lib/strategy-vault-store';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Fees' },
  { id: 3, label: 'Strategy' },
  { id: 4, label: 'Preview' },
  { id: 5, label: 'Deploy' },
];

const EMOJI_OPTIONS = ['📊', '🎯', '🚀', '💎', '🔥', '🤖', '🌊', '⚡', '🎰', '🦅', '🐉', '🌾', '🐂', '🔄', '⚔️', '🏆'];

const RISK_META: Record<RiskLevel, { label: string; color: string; description: string }> = {
  conservative: { label: 'Conservative', color: '#10B981', description: 'Lower risk, steady returns. Max 25% per swap.' },
  balanced:     { label: 'Balanced',     color: '#F59E0B', description: 'Moderate risk/reward. Up to 40% per swap.' },
  degen:        { label: 'Degen',        color: '#EF4444', description: 'High-risk plays. Up to 60% per swap.' },
};

const TOKEN_LIST = ['SOL', 'USDC', 'USDT', 'JUP', 'ORCA', 'BONK', 'MARINADE', 'RAY', 'WIF', 'PYTH'];

interface WizardState {
  name: string;
  emoji: string;
  description: string;
  strategyType: StrategyType;
  riskLevel: RiskLevel;
  entryFeeUsd: number;
  performanceFeeBps: number;
  managementFeeBps: number;
  referralBps: number;
  maxSwapPct: number;
  allowedTokens: string[];
  aiRulesEnabled: boolean;
  aiRulesJson: string;
}

const DEFAULT_STATE: WizardState = {
  name: '',
  emoji: '📊',
  description: '',
  strategyType: 'ai_dca',
  riskLevel: 'balanced',
  entryFeeUsd: 5,
  performanceFeeBps: 1000,
  managementFeeBps: 100,
  referralBps: 500,
  maxSwapPct: 25,
  allowedTokens: ['SOL', 'USDC'],
  aiRulesEnabled: false,
  aiRulesJson: JSON.stringify(
    { trigger: 'price_below', threshold: -5, action: 'propose_swap', amount_pct: 10, token: 'SOL' },
    null, 2
  ),
};

const bpsToPercent = (bps: number) => (bps / 100).toFixed(1);

const css = {
  bg: '#0D1117',
  card: '#111827',
  border: '#1A2332',
  green: '#14F195',
  purple: '#9945FF',
  muted: '#8B9BB4',
  text: '#F9FAFB',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: '#0D1117',
  border: `1px solid ${css.border}`,
  borderRadius: '6px',
  color: css.text,
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: css.muted,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function Step1({ form, setForm }: { form: WizardState; setForm: (f: WizardState) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Icon</label>
          <select
            value={form.emoji}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            style={{ ...inputStyle, width: '70px', padding: '10px 8px', cursor: 'pointer', fontSize: '20px' }}
          >
            {EMOJI_OPTIONS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Vault Name</label>
          <input
            style={inputStyle}
            placeholder="e.g. Alpha Squad DCA"
            value={form.name}
            maxLength={40}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Description <span style={{ color: css.muted, fontWeight: 400 }}>(max 200 chars)</span></label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' } as React.CSSProperties}
          placeholder="Describe your strategy and what makes it unique..."
          value={form.description}
          maxLength={200}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div style={{ fontSize: '12px', color: css.muted, textAlign: 'right', marginTop: '4px' }}>
          {form.description.length}/200
        </div>
      </div>

      <div>
        <label style={labelStyle}>Strategy Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {(Object.entries(STRATEGY_META) as [StrategyType, (typeof STRATEGY_META)[StrategyType]][]).map(([type, meta]) => (
            <button
              key={type}
              onClick={() => setForm({ ...form, strategyType: type })}
              style={{
                padding: '14px 12px',
                borderRadius: '8px',
                border: `2px solid ${form.strategyType === type ? meta.color : css.border}`,
                backgroundColor: form.strategyType === type ? `${meta.color}15` : css.card,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{meta.emoji}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: form.strategyType === type ? meta.color : css.text }}>
                {meta.label}
              </div>
              <div style={{ fontSize: '11px', color: css.muted, marginTop: '2px', lineHeight: 1.3 }}>
                {meta.description.split(' — ')[0]}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Risk Level</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {(Object.entries(RISK_META) as [RiskLevel, (typeof RISK_META)[RiskLevel]][]).map(([level, meta]) => (
            <button
              key={level}
              onClick={() => setForm({ ...form, riskLevel: level })}
              style={{
                padding: '14px 12px',
                borderRadius: '8px',
                border: `2px solid ${form.riskLevel === level ? meta.color : css.border}`,
                backgroundColor: form.riskLevel === level ? `${meta.color}15` : css.card,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '700', color: form.riskLevel === level ? meta.color : css.text, marginBottom: '4px' }}>
                {meta.label}
              </div>
              <div style={{ fontSize: '11px', color: css.muted, lineHeight: 1.3 }}>{meta.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label, hint, value, min, max, step, onChange, format, accentColor,
}: {
  label: string; hint?: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string; accentColor: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor }}
        />
        <div style={{
          minWidth: '72px', padding: '8px 12px', backgroundColor: '#0D1117',
          border: `1px solid ${css.border}`, borderRadius: '6px',
          fontSize: '14px', fontWeight: '700', textAlign: 'center', color: accentColor,
        }}>
          {format(value)}
        </div>
      </div>
      {hint && <div style={{ fontSize: '12px', color: css.muted, marginTop: '4px' }}>{hint}</div>}
    </div>
  );
}

function Step2({ form, setForm }: { form: WizardState; setForm: (f: WizardState) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{
        backgroundColor: '#0D1117', border: `1px solid ${css.purple}30`,
        borderRadius: '8px', padding: '16px', fontSize: '13px', color: css.muted, lineHeight: 1.6,
      }}>
        <span style={{ color: css.purple, fontWeight: '700' }}>Fee splits on Join:</span>{' '}
        70% to you (creator) · 20% to PotBot reserve · 10% to referrer. Splits happen atomically on-chain.
      </div>

      <Slider
        label="Entry Fee (USD)"
        hint="At Tamagotchi Titan (level 5), members get 50% discount — you still earn 70% of the discounted fee."
        value={form.entryFeeUsd} min={0} max={50} step={1}
        onChange={(v) => setForm({ ...form, entryFeeUsd: v })}
        format={(v) => v === 0 ? 'Free' : `$${v}`}
        accentColor={css.green}
      />
      <Slider
        label="Performance Fee — % of profit on exit"
        hint="Max 50%. Charged on profit when a member exits."
        value={form.performanceFeeBps} min={0} max={5000} step={100}
        onChange={(v) => setForm({ ...form, performanceFeeBps: v })}
        format={(v) => `${bpsToPercent(v)}%`}
        accentColor={css.green}
      />
      <Slider
        label="Management Fee (annual % of AUM)"
        hint="Max 5%. Charged annually via crank."
        value={form.managementFeeBps} min={0} max={500} step={10}
        onChange={(v) => setForm({ ...form, managementFeeBps: v })}
        format={(v) => `${bpsToPercent(v)}%`}
        accentColor={css.green}
      />
      <Slider
        label="Referral Bonus — % of entry fee to referrer"
        hint="Max 30%. Referrer receives this at join time."
        value={form.referralBps} min={0} max={3000} step={100}
        onChange={(v) => setForm({ ...form, referralBps: v })}
        format={(v) => `${bpsToPercent(v)}%`}
        accentColor={css.green}
      />

      <div style={{ backgroundColor: '#0D1117', border: `1px solid ${css.border}`, borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: css.muted, marginBottom: '12px' }}>Fee Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
          {[
            ['Entry fee', form.entryFeeUsd === 0 ? 'Free' : `$${form.entryFeeUsd}`],
            ['Performance', `${bpsToPercent(form.performanceFeeBps)}% of profit`],
            ['Management', `${bpsToPercent(form.managementFeeBps)}% / year`],
            ['Referral bonus', `${bpsToPercent(form.referralBps)}% of entry`],
          ].map(([label, value]) => (
            <React.Fragment key={label}>
              <div style={{ color: css.muted }}>{label}</div>
              <div style={{ color: css.green, fontWeight: '700', textAlign: 'right' }}>{value}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({ form, setForm }: { form: WizardState; setForm: (f: WizardState) => void }) {
  const toggleToken = (token: string) => {
    if (form.allowedTokens.includes(token)) {
      if (form.allowedTokens.length <= 1) return;
      setForm({ ...form, allowedTokens: form.allowedTokens.filter((t) => t !== token) });
    } else {
      setForm({ ...form, allowedTokens: [...form.allowedTokens, token] });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <Slider
        label="Max Swap % per Trade"
        hint="Maximum share of vault capital per individual swap. Enforced on-chain."
        value={form.maxSwapPct} min={5} max={100} step={5}
        onChange={(v) => setForm({ ...form, maxSwapPct: v })}
        format={(v) => `${v}%`}
        accentColor={css.purple}
      />

      <div>
        <label style={labelStyle}>Allowed Tokens <span style={{ color: css.muted, fontWeight: 400 }}>({form.allowedTokens.length} selected)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {TOKEN_LIST.map((token) => {
            const selected = form.allowedTokens.includes(token);
            return (
              <button
                key={token}
                onClick={() => toggleToken(token)}
                style={{
                  padding: '8px 16px', borderRadius: '20px',
                  border: `1px solid ${selected ? css.purple : css.border}`,
                  backgroundColor: selected ? `${css.purple}20` : css.card,
                  color: selected ? css.purple : css.muted,
                  fontSize: '13px', fontWeight: selected ? '700' : '400', cursor: 'pointer',
                }}
              >
                {token}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: '12px', color: css.muted, marginTop: '8px' }}>
          Vault can only propose swaps between these tokens. Enforced at the governance proposal layer.
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>AI Automation Rules</label>
          <button
            onClick={() => setForm({ ...form, aiRulesEnabled: !form.aiRulesEnabled })}
            style={{
              padding: '4px 12px', borderRadius: '20px',
              border: `1px solid ${form.aiRulesEnabled ? css.green : css.border}`,
              backgroundColor: form.aiRulesEnabled ? `${css.green}20` : 'transparent',
              color: form.aiRulesEnabled ? css.green : css.muted,
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            {form.aiRulesEnabled ? '✓ Enabled' : 'Optional'}
          </button>
        </div>

        {form.aiRulesEnabled ? (
          <div>
            <div style={{ fontSize: '12px', color: css.muted, marginBottom: '8px' }}>
              JSON rules for the AI agent. Hash stored on-chain via SHA-256; full rules stored off-chain.
            </div>
            <textarea
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', minHeight: '140px', lineHeight: 1.5 } as React.CSSProperties}
              value={form.aiRulesJson}
              onChange={(e) => setForm({ ...form, aiRulesJson: e.target.value })}
              spellCheck={false}
            />
            <div style={{ fontSize: '11px', color: css.muted, marginTop: '6px' }}>
              Schema: trigger (price_above | price_below | time_interval) · threshold · action (propose_swap | vote_yes) · amount_pct · token
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#0D1117', border: `1px dashed ${css.border}`,
            borderRadius: '8px', padding: '24px', textAlign: 'center', color: css.muted, fontSize: '13px',
          }}>
            Enable AI rules to automate your vault strategy.<br />
            AI proposals still go through governance voting.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: css.muted }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: '600', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

function Step4({ form }: { form: WizardState }) {
  const stratMeta = STRATEGY_META[form.strategyType];
  const riskMeta = RISK_META[form.riskLevel];
  const tama = TAMAGOTCHI_META[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        border: `2px solid ${stratMeta.color}40`, borderRadius: '12px', padding: '24px',
        display: 'flex', alignItems: 'center', gap: '20px',
      }}>
        <div style={{ fontSize: '48px' }}>{form.emoji}</div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>{form.name || 'Unnamed Vault'}</div>
          <div style={{ fontSize: '14px', color: css.muted }}>{form.description || 'No description.'}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[
              { bg: `${stratMeta.color}20`, color: stratMeta.color, label: `${stratMeta.emoji} ${stratMeta.label}` },
              { bg: `${riskMeta.color}20`, color: riskMeta.color, label: riskMeta.label },
              { bg: '#ffffff10', color: '#fff', label: `${tama.emoji} ${tama.title} (starts here)` },
            ].map((badge) => (
              <span key={badge.label} style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                backgroundColor: badge.bg, color: badge.color,
              }}>{badge.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: css.muted, marginBottom: '12px' }}>💸 Fees</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <Row label="Entry" value={form.entryFeeUsd === 0 ? 'Free' : `$${form.entryFeeUsd}`} />
            <Row label="Performance" value={`${bpsToPercent(form.performanceFeeBps)}% of profit`} />
            <Row label="Management" value={`${bpsToPercent(form.managementFeeBps)}% / year`} />
            <Row label="Referral" value={`${bpsToPercent(form.referralBps)}% of entry`} />
          </div>
        </div>
        <div style={{ backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: css.muted, marginBottom: '12px' }}>⚙️ Strategy</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <Row label="Max swap" value={`${form.maxSwapPct}% per trade`} />
            <Row label="Tokens" value={form.allowedTokens.join(', ')} />
            <Row label="AI rules" value={form.aiRulesEnabled ? '✓ Configured' : '—'} />
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#0D1117', border: `1px solid ${css.green}30`,
        borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: css.muted, lineHeight: 1.6,
      }}>
        <span style={{ color: css.green, fontWeight: '700' }}>On-chain deployment:</span>{' '}
        Creates a <code style={{ color: '#D1D5DB', backgroundColor: '#1A2332', padding: '1px 5px', borderRadius: '3px' }}>StrategyVaultAccount</code> PDA
        linked to your pot. Seeds: <code style={{ color: '#D1D5DB', backgroundColor: '#1A2332', padding: '1px 5px', borderRadius: '3px' }}>[b&quot;strategy_vault&quot;, pot.key()]</code>.
        Estimated cost: ~0.002 SOL.
      </div>
    </div>
  );
}

function Step5({ form, vaultPubkey }: { form: WizardState; vaultPubkey: string }) {
  const stratMeta = STRATEGY_META[form.strategyType];
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
      <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Vault Created!</h2>
      <p style={{ color: css.muted, fontSize: '14px', marginBottom: '28px' }}>
        Your Strategy Vault is live on Solana. You start as a{' '}
        <span style={{ color: '#fff', fontWeight: '600' }}>🥚 Hatchling (Egg)</span>.
        Grow your vault to unlock lower fees.
      </p>

      <div style={{
        backgroundColor: css.card, border: `2px solid ${stratMeta.color}40`,
        borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '36px' }}>{form.emoji}</div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px' }}>{form.name}</div>
            <div style={{ color: css.muted, fontSize: '13px' }}>{stratMeta.emoji} {stratMeta.label} · 1 member</div>
          </div>
        </div>
        <div style={{
          backgroundColor: '#0D1117', borderRadius: '6px', padding: '10px 14px',
          fontFamily: 'monospace', fontSize: '12px', color: css.green, wordBreak: 'break-all',
        }}>
          {vaultPubkey}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        {[
          { icon: '📣', title: 'Share', desc: 'Share your vault link to attract members' },
          { icon: '🤖', title: 'Add AI Rules', desc: 'Configure MCP agent to auto-propose swaps' },
          { icon: '📈', title: 'First Deposit', desc: 'Deposit to your vault to start trading' },
        ].map((card) => (
          <div key={card.title} style={{ backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>{card.title}</div>
            <div style={{ fontSize: '11px', color: css.muted }}>{card.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreateVaultPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const createVault = useStrategyVaultStore((s) => s.createVault);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(DEFAULT_STATE);
  const [deploying, setDeploying] = useState(false);
  const [createdPubkey, setCreatedPubkey] = useState<string>('');

  const canGoNext = (): boolean => {
    if (step === 1) return form.name.trim().length >= 2;
    return true;
  };

  const handleNext = async () => {
    if (step < 4) { setStep(step + 1); return; }
    setDeploying(true);
    await new Promise((r) => setTimeout(r, 1800));
    const pubkey = `vault_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    createVault({
      name: form.name, emoji: form.emoji, description: form.description,
      strategyType: form.strategyType, riskLevel: form.riskLevel,
      entryFeeUsd: form.entryFeeUsd, performanceFeeBps: form.performanceFeeBps,
      managementFeeBps: form.managementFeeBps, referralBps: form.referralBps,
      maxSwapPct: form.maxSwapPct, allowedTokens: form.allowedTokens, isAiAgent: form.aiRulesEnabled,
    });
    setCreatedPubkey(pubkey);
    setDeploying(false);
    setStep(5);
  };

  return (
    <div style={{ backgroundColor: css.bg, minHeight: '100vh', color: '#fff', fontFamily: 'Geist, sans-serif' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${css.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/vaults" style={{ color: css.muted, textDecoration: 'none', fontSize: '14px' }}>← Back to Vaults</Link>
        <span style={{ fontSize: '14px', color: css.muted }}>{step < 5 ? `Step ${step} of 4` : 'Done!'}</span>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Create Strategy Vault</h1>
        <p style={{ color: css.muted, fontSize: '14px', marginBottom: '36px' }}>
          Deploy your trading strategy on-chain. Members join, govern, and share returns together.
        </p>

        {step < 5 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '36px' }}>
            {STEPS.slice(0, 4).map((s, idx) => (
              <React.Fragment key={s.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: step > s.id ? css.green : step === s.id ? css.purple : '#1A2332',
                    border: `2px solid ${step > s.id ? css.green : step === s.id ? css.purple : css.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '800', color: step >= s.id ? '#fff' : css.muted,
                  }}>
                    {step > s.id ? '✓' : s.id}
                  </div>
                  <div style={{ fontSize: '11px', color: step === s.id ? '#fff' : css.muted, marginTop: '6px', fontWeight: step === s.id ? '700' : '400', textAlign: 'center' }}>
                    {s.label}
                  </div>
                </div>
                {idx < 3 && (
                  <div style={{ flex: 1, height: '2px', marginTop: '15px', backgroundColor: step > s.id ? css.green : css.border }} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div style={{ backgroundColor: css.card, border: `1px solid ${css.border}`, borderRadius: '12px', padding: '32px', marginBottom: '24px' }}>
          {step === 1 && <Step1 form={form} setForm={setForm} />}
          {step === 2 && <Step2 form={form} setForm={setForm} />}
          {step === 3 && <Step3 form={form} setForm={setForm} />}
          {step === 4 && <Step4 form={form} />}
          {step === 5 && <Step5 form={form} vaultPubkey={createdPubkey} />}
        </div>

        {step < 5 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              style={{
                padding: '12px 24px', backgroundColor: 'transparent',
                border: `1px solid ${step === 1 ? css.border : css.muted}`,
                borderRadius: '8px', color: step === 1 ? css.border : css.muted,
                fontSize: '14px', fontWeight: '600', cursor: step === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canGoNext() || deploying}
              style={{
                padding: '12px 32px',
                backgroundColor: canGoNext() && !deploying ? css.purple : '#2D2D4E',
                border: 'none', borderRadius: '8px', color: '#fff',
                fontSize: '14px', fontWeight: '700',
                cursor: canGoNext() && !deploying ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {deploying ? '⟳ Deploying...' : step === 4 ? '🚀 Deploy Vault' : 'Next →'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/vaults" style={{
              padding: '12px 32px', backgroundColor: 'transparent',
              border: `1px solid ${css.border}`, borderRadius: '8px',
              color: css.muted, fontSize: '14px', fontWeight: '600', textDecoration: 'none',
            }}>
              View All Vaults
            </Link>
            <Link href="/vaults" style={{
              padding: '12px 32px', backgroundColor: css.green,
              border: 'none', borderRadius: '8px', color: '#0D1117',
              fontSize: '14px', fontWeight: '700', textDecoration: 'none',
            }}>
              Share My Vault →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
