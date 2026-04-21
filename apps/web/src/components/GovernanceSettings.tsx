'use client'

import { useState, useEffect } from 'react'
import { withTxToast } from '@/components/TxToast'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/* ── Types ── */

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive'

export interface GovSettings {
  quorumPct: number
  approvalPct: number
  votingWindowHours: number
  riskLevel: RiskLevel
  maxSwapPct: number
  maxBudgetGrantPct: number
  requireAdminCoSign: boolean
  coSignThresholdPct: number
}

const RISK_PROFILES: Record<RiskLevel, { label: string; icon: string; desc: string; color: string; defaults: Partial<GovSettings> }> = {
  conservative: {
    label: 'Conservative',
    icon: '🛡️',
    desc: 'High quorum, strict limits. Designed for community treasuries or long-term holding vaults.',
    color: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    defaults: { quorumPct: 51, approvalPct: 66, maxSwapPct: 10, maxBudgetGrantPct: 5 },
  },
  moderate: {
    label: 'Moderate',
    icon: '⚖️',
    desc: 'Balanced governance. Good default for most group trading pots.',
    color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
    defaults: { quorumPct: 33, approvalPct: 51, maxSwapPct: 30, maxBudgetGrantPct: 20 },
  },
  aggressive: {
    label: 'Aggressive',
    icon: '⚡',
    desc: 'Fast decisions, high allocation limits. For active trading groups with strong trust.',
    color: 'text-red-400 border-red-500/40 bg-red-500/10',
    defaults: { quorumPct: 20, approvalPct: 51, maxSwapPct: 100, maxBudgetGrantPct: 50 },
  },
}

const DEFAULT_SETTINGS: GovSettings = {
  quorumPct: 33,
  approvalPct: 51,
  votingWindowHours: 48,
  riskLevel: 'moderate',
  maxSwapPct: 30,
  maxBudgetGrantPct: 20,
  requireAdminCoSign: false,
  coSignThresholdPct: 50,
}

/* ── Helpers ── */

function Slider({
  label, hint, value, min, max, step = 1, suffix = '%', onChange,
}: {
  label: string; hint?: string; value: number; min: number; max: number; step?: number; suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <div>
          <span className="text-sm text-white">{label}</span>
          {hint && <span className="text-[10px] text-pot-muted ml-2">{hint}</span>}
        </div>
        <span className="text-sm font-semibold text-pot-accent">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-violet-500"
      />
      <div className="flex justify-between text-[10px] text-pot-muted mt-0.5">
        <span>{min}{suffix}</span><span>{max}{suffix}</span>
      </div>
    </div>
  )
}

/* ── Main component ── */

interface Props {
  isAdmin: boolean
  potPubkey: string
}

export function GovernanceSettings({ isAdmin, potPubkey }: Props) {
  const [settings, setSettingsState] = useState<GovSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<'democracy' | 'risk' | 'budgets'>('democracy')

  // Load governance settings from Supabase on mount (replaces localStorage)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    supabase
      .from('governance_settings')
      .select('*')
      .eq('pot_pubkey', potPubkey)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettingsState({
            quorumPct:          data.quorum_pct          ?? DEFAULT_SETTINGS.quorumPct,
            approvalPct:        data.approval_pct        ?? DEFAULT_SETTINGS.approvalPct,
            votingWindowHours:  data.voting_window_hours ?? DEFAULT_SETTINGS.votingWindowHours,
            riskLevel:          (data.risk_level as RiskLevel) ?? DEFAULT_SETTINGS.riskLevel,
            maxSwapPct:         data.max_swap_pct        ?? DEFAULT_SETTINGS.maxSwapPct,
            maxBudgetGrantPct:  data.max_budget_grant_pct ?? DEFAULT_SETTINGS.maxBudgetGrantPct,
            requireAdminCoSign: data.require_admin_cosign ?? DEFAULT_SETTINGS.requireAdminCoSign,
            coSignThresholdPct: data.cosign_threshold_pct ?? DEFAULT_SETTINGS.coSignThresholdPct,
          })
        }
      })
      .catch(() => { /* no existing config — use defaults */ })
      .finally(() => setLoading(false))
  }, [potPubkey])

  function setSettings(s: GovSettings) {
    setSettingsState(s)
    setSaved(false)
  }

  function applyRiskProfile(level: RiskLevel) {
    const profile = RISK_PROFILES[level]
    setSettings({ ...settings, ...profile.defaults, riskLevel: level })
  }

  async function saveSettings() {
    await withTxToast(
      async () => {
        if (!isSupabaseConfigured) return
        const { error } = await supabase.from('governance_settings').upsert({
          pot_pubkey:           potPubkey,
          quorum_pct:           settings.quorumPct,
          approval_pct:         settings.approvalPct,
          voting_window_hours:  settings.votingWindowHours,
          risk_level:           settings.riskLevel,
          max_swap_pct:         settings.maxSwapPct,
          max_budget_grant_pct: settings.maxBudgetGrantPct,
          require_admin_cosign: settings.requireAdminCoSign,
          cosign_threshold_pct: settings.coSignThresholdPct,
          updated_at:           new Date().toISOString(),
        }, { onConflict: 'pot_pubkey' })
        if (error) throw new Error(error.message)
      },
      'Saving governance settings…',
      'Governance settings updated ✅',
    )
    setSaved(true)
  }

  const readOnly = !isAdmin

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-pot-accent/30 border-t-pot-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🏛️</span>
          <div>
            <h2 className="text-lg font-bold text-white">Governance Settings</h2>
            <p className="text-xs text-pot-muted">
              {isAdmin
                ? 'Configure voting rules and risk limits for this pot'
                : 'View governance rules for this pot (admin-only to edit)'}
            </p>
          </div>
        </div>

        {/* Current snapshot */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-pot-dark rounded-xl p-3">
            <div className="text-[10px] text-pot-muted mb-1">Quorum</div>
            <div className="text-lg font-bold text-white">{settings.quorumPct}%</div>
            <div className="text-[10px] text-pot-muted">of shares must vote</div>
          </div>
          <div className="bg-pot-dark rounded-xl p-3">
            <div className="text-[10px] text-pot-muted mb-1">Approval</div>
            <div className="text-lg font-bold text-white">{settings.approvalPct}%</div>
            <div className="text-[10px] text-pot-muted">YES to pass</div>
          </div>
          <div className="bg-pot-dark rounded-xl p-3">
            <div className="text-[10px] text-pot-muted mb-1">Risk</div>
            <div className={`text-sm font-bold ${RISK_PROFILES[settings.riskLevel].color.split(' ')[0]}`}>
              {RISK_PROFILES[settings.riskLevel].icon} {RISK_PROFILES[settings.riskLevel].label}
            </div>
            <div className="text-[10px] text-pot-muted">profile</div>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 bg-pot-dark rounded-xl p-1 border border-pot-border">
        {([
          { key: 'democracy', label: '🗳 Democracy' },
          { key: 'risk', label: '⚠️ Risk' },
          { key: 'budgets', label: '💰 Budgets' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
              activeSection === key
                ? 'bg-pot-card text-white shadow'
                : 'text-pot-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Democracy section */}
      {activeSection === 'democracy' && (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-5">
          <h3 className="text-sm font-semibold text-white">Voting Rules</h3>
          <Slider
            label="Quorum"
            hint="minimum % of total shares that must participate"
            value={settings.quorumPct}
            min={10} max={75}
            onChange={(v) => !readOnly && setSettings({ ...settings, quorumPct: v })}
          />
          <Slider
            label="Approval Threshold"
            hint="% of YES votes (of those cast) needed to pass"
            value={settings.approvalPct}
            min={51} max={90}
            onChange={(v) => !readOnly && setSettings({ ...settings, approvalPct: v })}
          />
          <Slider
            label="Voting Window"
            hint="hours members have to vote before a proposal expires"
            value={settings.votingWindowHours}
            min={1} max={168} suffix="h"
            onChange={(v) => !readOnly && setSettings({ ...settings, votingWindowHours: v })}
          />
          {isAdmin && (
            <div>
              <div className="text-xs text-pot-muted mb-2">Quick presets</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Simple majority', quorum: 20, approval: 51 },
                  { label: 'Supermajority', quorum: 33, approval: 66 },
                  { label: 'Unanimous', quorum: 90, approval: 90 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setSettings({ ...settings, quorumPct: p.quorum, approvalPct: p.approval })}
                    className="text-[10px] text-center py-2 px-2 rounded-lg border border-pot-border text-pot-muted hover:text-white hover:border-pot-accent/50 transition"
                  >
                    {p.label}
                    <br />
                    <span className="text-pot-accent">{p.quorum}% / {p.approval}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk section */}
      {activeSection === 'risk' && (
        <div className="space-y-4">
          <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Risk Profile</h3>
            <div className="space-y-2">
              {(Object.entries(RISK_PROFILES) as [RiskLevel, typeof RISK_PROFILES[RiskLevel]][]).map(([level, p]) => (
                <button
                  key={level}
                  disabled={readOnly}
                  onClick={() => applyRiskProfile(level)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${
                    settings.riskLevel === level
                      ? p.color
                      : 'border-pot-border bg-pot-dark hover:border-pot-border/60'
                  } ${readOnly ? 'cursor-default' : ''}`}
                >
                  <span className="text-xl mt-0.5">{p.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{p.label}</div>
                    <div className="text-[11px] text-pot-muted mt-0.5">{p.desc}</div>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-pot-muted">
                      <span>Quorum: {p.defaults.quorumPct}%</span>
                      <span>Max swap: {p.defaults.maxSwapPct}%</span>
                    </div>
                  </div>
                  {settings.riskLevel === level && <span className="text-pot-accent text-lg ml-auto">✓</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-semibold text-white">Proposal Limits</h3>
            <Slider
              label="Max Single Swap"
              hint="of vault balance per proposal"
              value={settings.maxSwapPct}
              min={1} max={100}
              onChange={(v) => !readOnly && setSettings({ ...settings, maxSwapPct: v })}
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-white">Require Admin Co-Sign</div>
                  <div className="text-[11px] text-pot-muted">
                    Large swaps need extra admin approval before execution
                  </div>
                </div>
                <button
                  disabled={readOnly}
                  onClick={() => setSettings({ ...settings, requireAdminCoSign: !settings.requireAdminCoSign })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.requireAdminCoSign ? 'bg-pot-accent' : 'bg-pot-border'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    settings.requireAdminCoSign ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
              {settings.requireAdminCoSign && (
                <Slider
                  label="Co-sign threshold"
                  hint="swaps above this % require admin co-sign"
                  value={settings.coSignThresholdPct}
                  min={10} max={100}
                  onChange={(v) => !readOnly && setSettings({ ...settings, coSignThresholdPct: v })}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Budgets section */}
      {activeSection === 'budgets' && (
        <div className="space-y-4">
          <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Budget Grant Limits</h3>
              <p className="text-xs text-pot-muted mt-1">
                A "budget grant" proposal allocates a portion of the vault to a specific member for active trading.
                They can swap freely within their budget, and unspent funds return to the vault.
              </p>
            </div>
            <Slider
              label="Max Budget Per Grant"
              hint="of vault per proposal"
              value={settings.maxBudgetGrantPct}
              min={1} max={100}
              onChange={(v) => !readOnly && setSettings({ ...settings, maxBudgetGrantPct: v })}
            />
            <div className="bg-pot-dark rounded-xl p-4 border border-pot-border/50">
              <div className="text-xs font-medium text-white mb-3">📋 Budget Grant Template</div>
              <div className="space-y-2 text-xs text-pot-muted">
                <div className="flex justify-between">
                  <span>Proposal type</span>
                  <span className="text-white">Budget Allocation</span>
                </div>
                <div className="flex justify-between">
                  <span>Max grant size</span>
                  <span className="text-pot-accent">{settings.maxBudgetGrantPct}% of vault</span>
                </div>
                <div className="flex justify-between">
                  <span>Required approval</span>
                  <span className="text-white">{settings.approvalPct}% YES</span>
                </div>
                <div className="flex justify-between">
                  <span>Voting window</span>
                  <span className="text-white">{settings.votingWindowHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Recipient can</span>
                  <span className="text-white">Swap freely within budget</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-pot-muted bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
              💡 Example: Propose to allocate 20% of vault (~2.4 SOL) to Alice for 7 days of active trading.
              Alice can swap in and out within that budget. After 7 days, unused SOL returns automatically.
            </div>
          </div>
        </div>
      )}

      {/* Save button (admin only) */}
      {isAdmin && (
        <button
          onClick={saveSettings}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
            saved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-pot-accent hover:bg-pot-accent/90 text-white'
          }`}
        >
          {saved ? '✅ Saved' : 'Save Governance Settings'}
        </button>
      )}
    </div>
  )
}

export { DEFAULT_SETTINGS }
