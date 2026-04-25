'use client'

import { useEffect, useState } from 'react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  STRATEGY_DESCRIPTIONS,
  type StrategyPreset,
  type AgentConfig,
  type AgentRule,
  type AgentLogEntry,
} from '@/lib/ai-agent'
import { useAIAgent } from '@/hooks/useAIAgent'
import {
  buildRegisterDelegateIx,
  buildRevokeDelegateIx,
  readMemberDelegate,
  delegatePda,
  type MemberDelegateState,
} from '@/lib/delegate-ix'

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

  const [tab, setTab] = useState<'overview' | 'rules' | 'delegate' | 'log'>('overview')
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
        {(['overview', 'rules', 'delegate', 'log'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize transition ${
              tab === t
                ? 'bg-pot-card text-white shadow'
                : 'text-pot-muted hover:text-white'
            }`}
          >
            {t === 'overview' ? '🎛 Strategy'
              : t === 'rules' ? '📋 Rules'
              : t === 'delegate' ? '🪪 Delegate'
              : `📜 Log ${log.length > 0 ? `(${log.length})` : ''}`}
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

      {/* Delegate tab */}
      {tab === 'delegate' && (
        <DelegateTab potPubkey={potPubkey} />
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
  const { createDefaultConfig } = require('@/lib/ai-agent')

  function selectPreset(preset: StrategyPreset) {
    const base = createDefaultConfig(potPubkey, preset)
    if (config) {
      // Preserve enabled state and global settings
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
                {/* Enable toggle */}
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

              {/* Expanded rule editor */}
              {isExpanded && (
                <div className="border-t border-pot-border px-4 py-4 bg-pot-dark space-y-4">
                  {/* Threshold */}
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

                  {/* Time interval */}
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

                  {/* Amount % */}
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

                  {/* Cooldown */}
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
          <button
            onClick={clearLog}
            className="text-xs text-pot-muted hover:text-red-400 transition"
          >
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

/* ── Delegate tab ──
   Lets a member register an AI-agent wallet as a voting delegate for this pot
   (calls register_delegate on-chain). The user signs with wallet-adapter; the
   delegate's secret key never leaves their machine. PotBot's MCP server can
   then sign votes via vote_as_delegate using the agent's keypair.
*/
function DelegateTab({ potPubkey }: { potPubkey: string }) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction, connected } = useWallet()

  const [state, setState] = useState<MemberDelegateState | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSig, setLastSig] = useState<string | null>(null)

  const [delegateInput, setDelegateInput] = useState('')
  const [rulesUriInput, setRulesUriInput] = useState('')

  const potKey = (() => { try { return new PublicKey(potPubkey) } catch { return null } })()

  async function refresh() {
    if (!potKey || !publicKey) return
    setLoading(true)
    setError(null)
    try {
      const s = await readMemberDelegate(connection, potKey, publicKey)
      setState(s)
    } catch (err: any) {
      setError(err.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (potKey && publicKey) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [potPubkey, publicKey?.toBase58()])

  async function handleRegister() {
    if (!potKey || !publicKey) return
    let delegateKey: PublicKey
    try { delegateKey = new PublicKey(delegateInput.trim()) }
    catch { setError('Invalid delegate pubkey'); return }
    if (rulesUriInput.length > 200) { setError('Rules URI must be ≤ 200 chars'); return }

    setSubmitting(true)
    setError(null)
    try {
      const ix = buildRegisterDelegateIx({
        pot: potKey,
        memberWallet: publicKey,
        delegate: delegateKey,
        rulesUri: rulesUriInput,
      })
      const tx = new Transaction().add(ix)
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setLastSig(sig)
      await refresh()
    } catch (err: any) {
      setError(err.message ?? String(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke() {
    if (!potKey || !publicKey) return
    if (!confirm('Revoke this delegation? The agent will no longer be able to vote on your behalf.')) return
    setSubmitting(true)
    setError(null)
    try {
      const ix = buildRevokeDelegateIx({ pot: potKey, memberWallet: publicKey })
      const tx = new Transaction().add(ix)
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setLastSig(sig)
      await refresh()
    } catch (err: any) {
      setError(err.message ?? String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!connected) {
    return (
      <div className="bg-pot-card border border-pot-border rounded-2xl p-8 flex flex-col items-center text-center gap-3">
        <div className="text-4xl">🪪</div>
        <p className="text-white font-semibold">Connect your wallet to manage delegation</p>
        <p className="text-pot-muted text-sm max-w-md">
          Delegation is signed by the member wallet. The AI agent never holds your main key.
        </p>
      </div>
    )
  }

  if (!potKey) {
    return <div className="bg-pot-card border border-pot-border rounded-2xl p-6 text-pot-muted text-sm">Invalid pot pubkey.</div>
  }

  const explorerCluster = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet'
  const [pdaKey] = delegatePda(potKey, publicKey!)

  return (
    <div className="space-y-4">
      <div className="bg-pot-card border border-pot-border rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-white font-semibold">Personal AI Voter</h3>
            <p className="text-xs text-pot-muted mt-1 max-w-xl">
              Register an AI-agent wallet to vote on your behalf in this pot. The delegate signs with
              its own keypair via the MCP server (<code className="text-pot-accent">vote_as_delegate</code>).
              Your member key never leaves your wallet. Revocable on-chain at any time.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-xs px-2 py-1 rounded border border-pot-border text-pot-muted hover:text-white"
          >
            {loading ? '⏳' : '↻ Refresh'}
          </button>
        </div>

        {/* Current delegation state */}
        {loading && !state ? (
          <div className="text-sm text-pot-muted">Reading on-chain delegation…</div>
        ) : state?.exists && state.active ? (
          <div className="bg-pot-dark border border-pot-green/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-pot-green text-sm font-semibold">✅ Active delegation</span>
            </div>
            <div className="text-xs text-pot-muted space-y-1">
              <div>Delegate: <code className="text-white break-all">{state.delegate?.toBase58()}</code></div>
              {state.rulesUri && (
                <div>Rules URI: {/^https?:\/\//.test(state.rulesUri) || state.rulesUri.startsWith('ipfs://') || state.rulesUri.startsWith('ar://')
                  ? <a href={state.rulesUri} target="_blank" rel="noopener noreferrer" className="text-pot-accent break-all">{state.rulesUri}</a>
                  : <code className="text-white break-all">{state.rulesUri || '(none)'}</code>
                }</div>
              )}
              <div>Registered: {state.registeredAt ? new Date(state.registeredAt * 1000).toLocaleString() : '—'}</div>
              <div>PDA: <code className="text-pot-muted break-all">{state.pda.toBase58()}</code></div>
            </div>
            <div className="pt-2">
              <button
                onClick={handleRevoke}
                disabled={submitting}
                className="text-xs px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-40"
              >
                {submitting ? 'Revoking…' : '🛑 Revoke Delegation'}
              </button>
            </div>
          </div>
        ) : state?.exists && !state.active ? (
          <div className="bg-pot-dark border border-yellow-500/30 rounded-xl p-4 space-y-2">
            <div className="text-yellow-300 text-sm font-semibold">⚪ Previously delegated, now revoked</div>
            <div className="text-xs text-pot-muted">
              Last delegate: <code className="text-white break-all">{state.delegate?.toBase58()}</code><br/>
              Revoked: {state.revokedAt ? new Date(state.revokedAt * 1000).toLocaleString() : '—'}
            </div>
            <p className="text-xs text-pot-muted pt-2">
              Register a new delegate below to re-enable AI voting. The PDA is reused; this overwrites the previous record.
            </p>
          </div>
        ) : (
          <div className="bg-pot-dark border border-pot-border rounded-xl p-4 text-sm text-pot-muted">
            No delegation registered yet for this wallet on this pot.
          </div>
        )}
      </div>

      {/* Register form */}
      {(!state?.exists || !state?.active) && (
        <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-white font-semibold text-sm mb-1">Register a delegate</h4>
            <p className="text-xs text-pot-muted">
              The delegate pubkey is whichever wallet your AI agent uses (e.g. the keypair loaded into the
              MCP server&apos;s <code className="text-pot-accent">AGENT_KEYPAIR</code> env).
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-pot-muted">Delegate pubkey</label>
            <input
              type="text"
              value={delegateInput}
              onChange={(e) => setDelegateInput(e.target.value)}
              placeholder="e.g. 9HCK3gppiZCJcJJ17Db1LUugeiyEemvgSRfC2oYRDNws"
              className="w-full bg-pot-dark border border-pot-border rounded-lg px-3 py-2 text-sm text-white placeholder-pot-muted/50 font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-pot-muted">Rules URI (optional, ≤ 200 chars) — IPFS, Arweave, or https describing the agent&apos;s voting policy</label>
            <input
              type="text"
              value={rulesUriInput}
              onChange={(e) => setRulesUriInput(e.target.value)}
              placeholder="https://… or ipfs://…"
              className="w-full bg-pot-dark border border-pot-border rounded-lg px-3 py-2 text-sm text-white placeholder-pot-muted/50 font-mono"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={submitting || !delegateInput.trim()}
            className="w-full px-4 py-2.5 rounded-lg bg-pot-accent text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            {submitting ? '⏳ Submitting…' : '🪪 Register Delegate'}
          </button>
        </div>
      )}

      {/* Result / error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-xl">
          ❌ {error}
        </div>
      )}
      {lastSig && (
        <div className="bg-pot-green/10 border border-pot-green/30 text-pot-green text-xs px-4 py-3 rounded-xl">
          ✅ Tx confirmed: <a
            href={`https://explorer.solana.com/tx/${lastSig}?cluster=${explorerCluster}`}
            target="_blank" rel="noopener noreferrer" className="underline break-all"
          >{lastSig.slice(0, 32)}…</a>
        </div>
      )}

      {/* MCP usage hint */}
      <div className="bg-pot-dark border border-pot-border/50 rounded-xl p-4 space-y-1">
        <p className="text-xs font-semibold text-white">Use with Claude / any MCP client</p>
        <p className="text-[11px] text-pot-muted">
          Run <code className="text-pot-accent">npx @potbot/mcp</code> with <code className="text-pot-accent">AGENT_KEYPAIR</code> set to the delegate&apos;s
          base58 secret key, then your AI can call <code className="text-pot-accent">vote_on_proposal</code> with this pot and your member wallet —
          it will sign + submit a real <code className="text-pot-accent">vote_as_delegate</code> tx on chain.
        </p>
      </div>

      <div className="text-[10px] text-pot-muted/70 text-center">
        Delegation PDA: <code>{pdaKey.toBase58()}</code>
      </div>
    </div>
  )
}
