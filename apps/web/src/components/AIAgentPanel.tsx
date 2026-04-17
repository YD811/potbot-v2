'use client'

import { useState } from 'react'
import {
  STRATEGY_DESCRIPTIONS,
  createDefaultConfig,
  type StrategyPreset,
  type AgentConfig,
  type AgentRule,
  type AgentLogEntry,
} from '@/lib/ai-agent'
import { useAIAgent } from '@/hooks/useAIAgent'

/* ── Log level styles ── */
const LOG_STYLES: Record<AgentLogEntry['level'], { bg: string; text: string; icon: string }> = {
  info:    { bg: 'bg-blue-500/10',   text: 'text-blue-300',   icon: 'ℹ️' },
  success: { bg: 'bg-green-500/10',  text: 'text-green-300',  icon: '✅' },
  warn:    { bg: 'bg-yellow-500/10', text: 'text-yellow-300', icon: '⚠️' },
  error:   { bg: 'bg-red-500/10',    text: 'text-red-300',    icon: '❌' },
}

const STRATEGY_ICONS: Record<StrategyPreset, string> = {
  dca: '📅',
  trend: '📈',
  reversion: '🔄',
  yield: '🌾',
  custom: '🛠️',
}

const PRESETS: StrategyPreset[] = ['dca', 'trend', 'reversion', 'yield', 'custom']

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

/* ── Main component ── */

interface Props {
  potPubkey: string
  pot: any
}

export function AIAgentPanel({ potPubkey, pot }: Props) {
  const { config, log, isRunning, lastCheck, setConfig, toggleEnabled, clearLog, triggerManualCheck } =
    useAIAgent(potPubkey, pot)

  const [tab, setTab] = useState<'overview' | 'rules' | 'log'>('overview')
  const [editingRule, setEditingRule] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
              config?.enabled ? 'bg-pot-accent/20 animate-pulse' : 'bg-pot-border/50'
            }`}>
              🤖
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Automation Agent</h2>
              <p className="text-xs text-pot-muted">
                {config?.enabled
                  ? `Running · Last check: ${lastCheck ? timeAgo(lastCheck.getTime()) : 'never'}`
                  : 'Inactive · Configure rules and enable to start'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config?.enabled && (
              <button
                onClick={triggerManualCheck}
                disabled={isRunning}
                className="text-xs px-3 py-1.5 rounded-lg border border-pot-border text-pot-muted hover:text-white hover:border-pot-accent/50 transition disabled:opacity-40"
              >
                {isRunning ? '⏳ Running…' : '▶ Run Now'}
              </button>
            )}

            {/* Toggle switch */}
            <button
              onClick={toggleEnabled}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                config?.enabled ? 'bg-pot-accent' : 'bg-pot-border'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${
                config?.enabled ? 'left-8' : 'left-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        {config && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Strategy', value: `${STRATEGY_ICONS[config.strategy]} ${config.strategy.toUpperCase()}` },
              { label: 'Rules', value: `${config.rules.filter(r => r.enabled).length}/${config.rules.length} active` },
              { label: 'Max proposals/day', value: config.maxProposalsPerDay },
              { label: 'Propose only', value: config.proposeOnly ? '✅ Safe' : '⚡ Full auto' },
            ].map((stat) => (
              <div key={stat.label} className="bg-pot-dark rounded-xl p-3">
                <div className="text-[10px] text-pot-muted mb-1">{stat.label}</div>
                <div className="text-sm font-semibold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-pot-dark rounded-xl p-1 border border-pot-border">
        {(['overview', 'rules', 'log'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize transition ${
              tab === t
                ? 'bg-pot-card text-white shadow'
                : 'text-pot-muted hover:text-white'
            }`}
          >
            {t === 'overview' ? '🎛 Strategy' : t === 'rules' ? '📋 Rules' : `📜 Log ${log.length > 0 ? `(${log.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Strategy tab */}
      {tab === 'overview' && (
        <StrategyTab config={config} potPubkey={potPubkey} setConfig={setConfig} />
      )}

      {/* Rules tab */}
      {tab === 'rules' && (
        <RulesTab
          config={config}
          setConfig={setConfig}
          editingRule={editingRule}
          setEditingRule={setEditingRule}
        />
      )}

      {/* Log tab */}
      {tab === 'log' && (
        <LogTab log={log} clearLog={clearLog} />
      )}
    </div>
  )
}

/* ── Strategy tab ── */

function StrategyTab({
  config,
  potPubkey,
  setConfig,
}: {
  config: AgentConfig | null
  potPubkey: string
  setConfig: (c: AgentConfig) => void
}) {
  function selectPreset(preset: StrategyPreset) {
    const base = createDefaultConfig(potPubkey, preset)
    if (config) {
      setConfig({ ...base, enabled: config.enabled })
    } else {
      setConfig(base)
    }
  }

  return (
    <div className="space-y-4">
      {/* Preset picker */}
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Strategy Preset</h3>
        <div className="grid grid-cols-1 gap-2">
          {PRESETS.map((preset) => {
            const active = config?.strategy === preset
            return (
              <button
                key={preset}
                onClick={() => selectPreset(preset)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${
                  active
                    ? 'border-pot-accent bg-pot-accent/10'
                    : 'border-pot-border hover:border-pot-border/60 bg-pot-dark'
                }`}
              >
                <span className="text-xl mt-0.5">{STRATEGY_ICONS[preset]}</span>
                <div>
                  <div className={`text-sm font-semibold capitalize ${active ? 'text-pot-accent' : 'text-white'}`}>
                    {preset}
                  </div>
                  <div className="text-[11px] text-pot-muted mt-0.5">{STRATEGY_DESCRIPTIONS[preset]}</div>
                </div>
                {active && <span className="ml-auto text-pot-accent text-lg">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Global settings */}
      {config && (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Safety Guards</h3>

          {/* Propose-only toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Propose Only Mode</div>
              <div className="text-xs text-pot-muted">Create proposals, never auto-vote</div>
            </div>
            <button
              onClick={() => setConfig({ ...config, proposeOnly: !config.proposeOnly })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.proposeOnly ? 'bg-pot-accent' : 'bg-pot-border'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                config.proposeOnly ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Max proposals/day */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm text-white">Max Proposals / Day</span>
              <span className="text-sm text-pot-accent font-semibold">{config.maxProposalsPerDay}</span>
            </div>
            <input
              type="range" min={1} max={20} value={config.maxProposalsPerDay}
              onChange={(e) => setConfig({ ...config, maxProposalsPerDay: +e.target.value })}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-pot-muted mt-0.5">
              <span>1</span><span>20</span>
            </div>
          </div>

          {/* Max votes/day */}
          {!config.proposeOnly && (
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-white">Max Auto-Votes / Day</span>
                <span className="text-sm text-pot-accent font-semibold">{config.maxVotesPerDay}</span>
              </div>
              <input
                type="range" min={1} max={50} value={config.maxVotesPerDay}
                onChange={(e) => setConfig({ ...config, maxVotesPerDay: +e.target.value })}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-[10px] text-pot-muted mt-0.5">
                <span>1</span><span>50</span>
              </div>
            </div>
          )}

          {/* Max price impact */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm text-white">Max Price Impact</span>
              <span className="text-sm text-pot-accent font-semibold">{config.globalMaxPriceImpactPct}%</span>
            </div>
            <input
              type="range" min={0.1} max={10} step={0.1} value={config.globalMaxPriceImpactPct}
              onChange={(e) => setConfig({ ...config, globalMaxPriceImpactPct: +e.target.value })}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-pot-muted mt-0.5">
              <span>0.1%</span><span>10%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Rules tab ── */

function RulesTab({
  config,
  setConfig,
  editingRule,
  setEditingRule,
}: {
  config: AgentConfig | null
  setConfig: (c: AgentConfig) => void
  editingRule: string | null
  setEditingRule: (id: string | null) => void
}) {
  if (!config) {
    return (
      <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center text-pot-muted text-sm">
        Select a strategy above to generate rules
      </div>
    )
  }

  function toggleRule(id: string) {
    setConfig({
      ...config!,
      rules: config!.rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r),
    })
  }

  function updateRuleThreshold(id: string, threshold: number) {
    setConfig({
      ...config!,
      rules: config!.rules.map((r) =>
        r.id === id ? { ...r, trigger: { ...r.trigger, threshold } } : r
      ),
    })
  }

  function updateRuleCooldown(id: string, cooldownMinutes: number) {
    setConfig({
      ...config!,
      rules: config!.rules.map((r) => r.id === id ? { ...r, cooldownMinutes } : r),
    })
  }

  function updateRuleAmountPct(id: string, amountPct: number) {
    setConfig({
      ...config!,
      rules: config!.rules.map((r) =>
        r.id === id ? { ...r, action: { ...r.action, amountPct } } : r
      ),
    })
  }

  const TRIGGER_LABELS: Record<string, string> = {
    price_below: 'Price below $',
    price_above: 'Price above $',
    price_drop_pct: 'Price drops',
    price_rise_pct: 'Price rises',
    time_interval: 'Every',
    vault_idle: 'Vault idle for',
    proposal_created: 'New proposal',
    price_impact_ok: 'Impact ok',
  }

  const ACTION_LABELS: Record<string, string> = {
    propose_swap: '📝 Propose Swap',
    vote_yes: '✅ Auto-vote YES',
    vote_no: '❌ Auto-vote NO',
    alert: '⚠️ Alert only',
  }

  return (
    <div className="space-y-3">
      {config.rules.length === 0 ? (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-8 text-center text-pot-muted text-sm">
          No rules configured. Switch to "Custom" strategy to build rules.
        </div>
      ) : (
        config.rules.map((rule) => {
          const isExpanded = editingRule === rule.id
          return (
            <div
              key={rule.id}
              className={`bg-pot-card border rounded-2xl overflow-hidden transition-colors ${
                rule.enabled ? 'border-pot-border' : 'border-pot-border/40 opacity-60'
              }`}
            >
              {/* Rule header */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-9 h-5 rounded-full shrink-0 transition-colors ${
                    rule.enabled ? 'bg-pot-accent' : 'bg-pot-border'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow mx-auto transition-all ${
                    rule.enabled ? 'translate-x-2' : '-translate-x-2'
                  }`} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{rule.name}</div>
                  <div className="text-[10px] text-pot-muted mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="text-pot-accent/80">
                      IF {TRIGGER_LABELS[rule.trigger.type] ?? rule.trigger.type}
                      {rule.trigger.threshold !== undefined && ` ${rule.trigger.threshold}${rule.trigger.type.includes('pct') ? '%' : rule.trigger.type === 'time_interval' ? 'm' : ''}`}
                    </span>
                    <span className="text-pot-muted">→</span>
                    <span>{ACTION_LABELS[rule.action.type] ?? rule.action.type}</span>
                    {rule.action.amountPct && <span className="text-green-400">({rule.action.amountPct}% vault)</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rule.fireCount > 0 && (
                    <span className="text-[10px] text-pot-muted bg-pot-dark px-2 py-0.5 rounded-full">
                      fired {rule.fireCount}×
                    </span>
                  )}
                  <button
                    onClick={() => setEditingRule(isExpanded ? null : rule.id)}
                    className="text-pot-muted hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition"
                  >
                    {isExpanded ? '▲' : '⚙️'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-pot-border px-4 py-4 bg-pot-dark space-y-4">
                  {rule.trigger.threshold !== undefined && rule.trigger.type !== 'time_interval' && (
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-pot-muted">
                          {rule.trigger.type.includes('pct') ? 'Threshold (%)' : 'Price threshold ($)'}
                        </span>
                        <span className="text-xs text-white font-medium">{rule.trigger.threshold}{rule.trigger.type.includes('pct') ? '%' : ''}</span>
                      </div>
                      <input
                        type="range"
                        min={rule.trigger.type.includes('pct') ? 0.5 : 0.000001}
                        max={rule.trigger.type.includes('pct') ? 50 : 1000}
                        step={rule.trigger.type.includes('pct') ? 0.5 : 0.01}
                        value={rule.trigger.threshold}
                        onChange={(e) => updateRuleThreshold(rule.id, +e.target.value)}
                        className="w-full accent-violet-500"
                      />
                    </div>
                  )}

                  {rule.trigger.type === 'time_interval' && rule.trigger.threshold !== undefined && (
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-pot-muted">Interval (minutes)</span>
                        <span className="text-xs text-white font-medium">
                          {rule.trigger.threshold >= 60 ? `${rule.trigger.threshold / 60}h` : `${rule.trigger.threshold}m`}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {[60, 120, 240, 480, 1440].map((m) => (
                          <button
                            key={m}
                            onClick={() => updateRuleThreshold(rule.id, m)}
                            className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
                              rule.trigger.threshold === m
                                ? 'border-pot-accent bg-pot-accent/10 text-white'
                                : 'border-pot-border text-pot-muted hover:border-pot-border/60'
                            }`}
                          >
                            {m < 60 ? `${m}m` : `${m / 60}h`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.action.amountPct !== undefined && (
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-pot-muted">Vault amount to use</span>
                        <span className="text-xs text-white font-medium">{rule.action.amountPct}%</span>
                      </div>
                      <input
                        type="range" min={1} max={100} value={rule.action.amountPct}
                        onChange={(e) => updateRuleAmountPct(rule.id, +e.target.value)}
                        className="w-full accent-violet-500"
                      />
                      <div className="flex gap-1 mt-1.5">
                        {[5, 10, 25, 50].map((p) => (
                          <button
                            key={p}
                            onClick={() => updateRuleAmountPct(rule.id, p)}
                            className={`flex-1 text-[10px] py-1 rounded border transition ${
                              rule.action.amountPct === p
                                ? 'border-pot-accent bg-pot-accent/10 text-white'
                                : 'border-pot-border text-pot-muted'
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-pot-muted">Cooldown between firings</span>
                      <span className="text-xs text-white font-medium">
                        {rule.cooldownMinutes >= 60
                          ? `${(rule.cooldownMinutes / 60).toFixed(1)}h`
                          : `${rule.cooldownMinutes}m`}
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={1440} step={15} value={rule.cooldownMinutes}
                      onChange={(e) => updateRuleCooldown(rule.id, +e.target.value)}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-[10px] text-pot-muted mt-0.5">
                      <span>No cooldown</span><span>24h</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

/* ── Activity Log tab ── */

function LogTab({ log, clearLog }: { log: AgentLogEntry[]; clearLog: () => void }) {
  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-pot-border">
        <span className="text-sm font-semibold text-white">Activity Log</span>
        {log.length > 0 && (
          <button onClick={clearLog} className="text-xs text-pot-muted hover:text-red-400 transition">
            Clear
          </button>
        )}
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        {log.length === 0 ? (
          <div className="py-12 text-center text-pot-muted text-sm">
            <div className="text-3xl mb-2">📭</div>
            No activity yet. Enable the agent to start logging.
          </div>
        ) : (
          <div className="divide-y divide-pot-border/30">
            {log.map((entry) => {
              const style = LOG_STYLES[entry.level]
              return (
                <div key={entry.id} className={`flex gap-3 px-4 py-3 ${style.bg}`}>
                  <span className="text-sm shrink-0 mt-0.5">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${style.text}`}>{entry.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-pot-muted">{timeAgo(entry.timestamp)}</span>
                      {entry.ruleName && (
                        <span className="text-[10px] text-pot-muted bg-pot-dark px-1.5 py-0.5 rounded">
                          {entry.ruleName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
