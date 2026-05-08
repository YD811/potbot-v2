'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  evaluateRule,
  createDefaultConfig,
  type AgentConfig,
  type AgentLogEntry,
  type MarketSnapshot,
  type EvalResult,
} from '@/lib/ai-agent'
import { useCreateProposal, useVote, useProposals } from '@/hooks/usePots'
import { fetchPricesRaw } from '@/lib/useAIAgent-helpers'
import { agentApi, type AgentRule as BackendAgentRule } from '@/lib/api-client'
import {
  toRawAmount,
  describeDCA,
  buildProposalDescription,
  type LimitOrderProposalMeta,
  type DCAProposalMeta,
} from '@/lib/jupiter-v2'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/* ── Constants ── */

const MAX_LOG = 50

/* ── Backend rule mapper ── */

function toBackendRules(frontendConfig: AgentConfig): BackendAgentRule[] {
  return frontendConfig.rules.map((r) => ({
    id:      r.id,
    name:    r.name,
    enabled: r.enabled,
    trigger: {
      type:      r.trigger.type as BackendAgentRule['trigger']['type'],
      threshold: r.trigger.threshold,
      interval:  r.trigger.type === 'time_interval' ? r.trigger.threshold : undefined,
      token:     r.trigger.tokenSymbol,
    },
    action: {
      type:    r.action.type as BackendAgentRule['action']['type'],
      amount:  r.action.amountPct,
      token:   (r.action as any).fromSymbol,
      toToken: (r.action as any).toSymbol,
    },
    cooldownMinutes: r.cooldownMinutes,
    lastTriggeredAt: r.lastFiredAt,
  }))
}

/* ── Hook ── */

export interface UseAIAgentReturn {
  config:             AgentConfig | null
  log:                AgentLogEntry[]
  isRunning:          boolean
  lastCheck:          Date | null
  setConfig:          (config: AgentConfig) => void
  toggleEnabled:      () => void
  clearLog:           () => void
  triggerManualCheck: () => Promise<void>
}

const WATCH_MINTS = [
  'So11111111111111111111111111111111111111112',     // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',  // USDC
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  // BONK
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',  // JitoSOL
]

export function useAIAgent(potPubkey: string, pot: any): UseAIAgentReturn {
  const { publicKey } = useWallet()
  const qc = useQueryClient()
  const createProposal = useCreateProposal()
  const vote = useVote()
  const { data: proposals } = useProposals(potPubkey)

  // Start with null/empty — load from Supabase async (no localStorage)
  const [config, setConfigState] = useState<AgentConfig | null>(null)
  const [log,    setLog]         = useState<AgentLogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const prevPricesRef   = useRef<Record<string, number>>({})
  const proposalSeenRef = useRef<Set<string>>(new Set())

  /* ── Load config from Supabase on mount ── */
  useEffect(() => {
    if (!isSupabaseConfigured) return
    void Promise.resolve(
      supabase
        .from('agent_configs')
        .select('config_json')
        .eq('pot_pubkey', potPubkey)
        .single(),
    )
      .then(({ data }) => {
        if (data?.config_json) {
          setConfigState(data.config_json as AgentConfig)
        }
      })
      .catch(() => {})
  }, [potPubkey])

  /* ── Persist to Supabase + sync rules to API ── */
  const setConfig = useCallback((newConfig: AgentConfig) => {
    setConfigState(newConfig)
    // Best-effort persist. Supabase v2 query builder is thenable but has no
    // `.catch()`, so wrap in Promise.resolve(). The `agent_configs` table
    // also isn't currently provisioned — when it lands the upsert will start
    // sticking; until then the call is a no-op + warning.
    if (isSupabaseConfigured) {
      void Promise.resolve(
        supabase.from('agent_configs').upsert({
          pot_pubkey:  potPubkey,
          config_json: newConfig,
          updated_at:  new Date().toISOString(),
        }, { onConflict: 'pot_pubkey' }),
      ).catch(() => { /* swallow — agent_configs table missing */ })
    }
    agentApi.updateRules(potPubkey, toBackendRules(newConfig)).catch(() => {})
  }, [potPubkey])

  /* ── Load server logs on mount ── */
  useEffect(() => {
    agentApi.getLogs(potPubkey, 50).then(({ logs: apiLogs }) => {
      if (apiLogs.length === 0) return
      const converted: AgentLogEntry[] = apiLogs.map((l) => ({
        id:        l.id,
        timestamp: l.ts,
        level:     l.error ? 'error' : l.proposalCreated ? 'success' : 'info',
        message: [
          l.actionDesc,
          l.triggerDesc ? `(trigger: ${l.triggerDesc})` : '',
          l.proposalCreated ? '✅ Proposal created' : '',
          l.error ? `❌ ${l.error}` : '',
        ].filter(Boolean).join(' — '),
        ruleId:   l.ruleId,
        ruleName: l.ruleName,
      }))
      setLog((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const fresh = converted.filter((e) => !existingIds.has(e.id))
        return [...fresh, ...prev]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_LOG)
      })
    }).catch(() => {})
  }, [potPubkey])

  /* ── In-memory log (no localStorage) ── */
  const addLog = useCallback((entry: Omit<AgentLogEntry, 'id' | 'timestamp'>) => {
    const full: AgentLogEntry = {
      id:        Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      ...entry,
    }
    setLog((prev) => [full, ...prev].slice(0, MAX_LOG))
  }, [])

  /* ── Main evaluation loop ── */
  const runCheck = useCallback(async () => {
    if (!config?.enabled || !publicKey) return
    setIsRunning(true)

    try {
      const mints = [...new Set([
        ...WATCH_MINTS,
        ...config.rules.flatMap((r) => r.trigger.tokenMint ? [r.trigger.tokenMint] : []),
        ...config.rules.flatMap((r) =>
          [(r.action as any).fromMint, (r.action as any).toMint].filter(Boolean) as string[]
        ),
      ])]

      const prices = await fetchPricesRaw(mints)
      const prevPrices = prevPricesRef.current

      const priceChangePct: Record<string, number> = {}
      for (const [mint, price] of Object.entries(prices)) {
        const prev = prevPrices[mint]
        priceChangePct[mint] = prev ? ((price - prev) / prev) * 100 : 0
      }
      prevPricesRef.current = prices

      const snapshot: MarketSnapshot = { prices, priceChangePct, timestamp: Date.now() }

      // ── Proposal-created rules (auto-vote) ──
      if (proposals) {
        type ProposalRow = {
          pubkey: string
          status: string
          description: string
          proposalId?: number
        }
        const newProposals = (proposals as ProposalRow[]).filter(
          (p) => p.status === 'active' && !proposalSeenRef.current.has(p.pubkey)
        )
        for (const proposal of newProposals) {
          proposalSeenRef.current.add(proposal.pubkey)
          for (const rule of config.rules) {
            if (!rule.enabled || rule.trigger.type !== 'proposal_created') continue
            if (config.proposeOnly) continue
            if (rule.action.type === 'vote_yes') {
              addLog({
                level:    'info',
                message:  `🗳️ Auto-voting YES on proposal #${(proposal as any).proposalId}: "${proposal.description}"`,
                ruleId:   rule.id,
                ruleName: rule.name,
              })
              try {
                await vote.mutateAsync({
                  potAddress:      potPubkey,
                  proposalAddress: proposal.pubkey,
                  approve:         true,
                })
                addLog({
                  level:    'success',
                  message:  `✅ Voted YES on proposal #${(proposal as any).proposalId}`,
                  ruleId:   rule.id,
                  ruleName: rule.name,
                })
                setConfig({
                  ...config,
                  rules: config.rules.map((r) =>
                    r.id === rule.id
                      ? { ...r, fireCount: r.fireCount + 1, lastFiredAt: Date.now() }
                      : r
                  ),
                })
              } catch (err) {
                addLog({
                  level:    'error',
                  message:  `❌ Vote failed: ${err instanceof Error ? err.message : String(err)}`,
                  ruleId:   rule.id,
                  ruleName: rule.name,
                })
              }
            }
          }
        }
      }

      // ── Market-driven rules ──
      for (const rule of config.rules) {
        if (rule.trigger.type === 'proposal_created') continue
        const result: EvalResult = evaluateRule(rule, snapshot)
        if (!result.triggered) continue

        addLog({
          level:    'info',
          message:  `🔔 Rule triggered: "${rule.name}" — ${result.reason}`,
          ruleId:   rule.id,
          ruleName: rule.name,
        })

        if (rule.action.type === 'alert') {
          addLog({
            level:    'warn',
            message:  `⚠️ Alert: ${(rule.action as any).label}`,
            ruleId:   rule.id,
            ruleName: rule.name,
          })

        } else if (rule.action.type === 'propose_swap') {
          const amountSol = (((rule.action as any).amountPct ?? 10) / 100) * (pot?.balance ?? 0)
          if (amountSol < 0.01) {
            addLog({ level: 'warn', message: `⚠️ Skipped: vault balance too low for swap proposal`, ruleId: rule.id, ruleName: rule.name })
            continue
          }
          addLog({
            level:    'info',
            message:  `📝 Creating swap proposal: ${(rule.action as any).label} (${amountSol.toFixed(3)} SOL)`,
            ruleId:   rule.id,
            ruleName: rule.name,
          })
          try {
            await createProposal.mutateAsync({
              potAddress:     potPubkey,
              nextProposalId: pot?.nextProposalId ?? 0,
              proposalType: {
                swap: {
                  fromMint:     (rule.action as any).fromMint!,
                  toMint:       (rule.action as any).toMint!,
                  amountIn:     amountSol,
                  minAmountOut: 0,
                },
              },
              description: `[AI] ${(rule.action as any).label} — ${amountSol.toFixed(3)} ${(rule.action as any).fromSymbol}`,
            })
            addLog({ level: 'success', message: `✅ Swap proposal created: "${(rule.action as any).label}"`, ruleId: rule.id, ruleName: rule.name })
            setConfig({
              ...config,
              rules: config.rules.map((r) =>
                r.id === rule.id ? { ...r, fireCount: r.fireCount + 1, lastFiredAt: Date.now() } : r
              ),
            })
            qc.invalidateQueries({ queryKey: ['proposals', potPubkey] })
          } catch (err) {
            addLog({ level: 'error', message: `❌ Swap proposal failed: ${err instanceof Error ? err.message : String(err)}`, ruleId: rule.id, ruleName: rule.name })
          }

        } else if (rule.action.type === 'propose_limit_order') {
          const action = rule.action as any
          const amountSol = ((action.amountPct ?? 10) / 100) * (pot?.balance ?? 0)
          if (amountSol < 0.01) {
            addLog({ level: 'warn', message: `⚠️ Skipped: vault balance too low for limit order`, ruleId: rule.id, ruleName: rule.name })
            continue
          }
          const inAmountRaw  = toRawAmount(amountSol, action.fromMint)
          const outAmountRaw = toRawAmount(amountSol / (action.triggerPriceUi ?? 1), action.toMint)
          const meta: LimitOrderProposalMeta = {
            type: 'LimitOrder', inputMint: action.fromMint, outputMint: action.toMint,
            inputSymbol: action.fromSymbol ?? 'SOL', outputSymbol: action.toSymbol ?? '???',
            inAmountUi: amountSol, triggerPriceUi: action.triggerPriceUi ?? 0,
            outAmountUi: amountSol / (action.triggerPriceUi ?? 1), expiredAt: action.expiredAt,
          }
          addLog({ level: 'info', message: `📝 Creating limit order proposal (${amountSol.toFixed(3)} ${meta.inputSymbol} @ ${meta.triggerPriceUi} ${meta.outputSymbol}/${meta.inputSymbol})`, ruleId: rule.id, ruleName: rule.name })
          try {
            await createProposal.mutateAsync({
              potAddress: potPubkey, nextProposalId: pot?.nextProposalId ?? 0,
              proposalType: { limitOrder: { fromMint: action.fromMint, toMint: action.toMint, inAmount: String(inAmountRaw), outAmount: String(outAmountRaw), expiredAt: action.expiredAt } },
              description: `[AI] ${buildProposalDescription(meta)}`,
            })
            addLog({ level: 'success', message: `✅ Limit order proposal created`, ruleId: rule.id, ruleName: rule.name })
            setConfig({ ...config, rules: config.rules.map((r) => r.id === rule.id ? { ...r, fireCount: r.fireCount + 1, lastFiredAt: Date.now() } : r) })
            qc.invalidateQueries({ queryKey: ['proposals', potPubkey] })
          } catch (err) {
            addLog({ level: 'error', message: `❌ Limit order proposal failed: ${err instanceof Error ? err.message : String(err)}`, ruleId: rule.id, ruleName: rule.name })
          }

        } else if (rule.action.type === 'propose_dca') {
          const action = rule.action as any
          const totalAmountSol    = ((action.amountPct ?? 20) / 100) * (pot?.balance ?? 0)
          const totalCycles       = action.totalCycles ?? 7
          const cycleSecondsApart = action.cycleSecondsApart ?? 86400
          const amountPerCycle    = totalAmountSol / totalCycles
          if (totalAmountSol < 0.05) {
            addLog({ level: 'warn', message: `⚠️ Skipped: vault balance too low for DCA proposal`, ruleId: rule.id, ruleName: rule.name })
            continue
          }
          const meta: DCAProposalMeta = {
            type: 'DCA', inputMint: action.fromMint, outputMint: action.toMint,
            inputSymbol: action.fromSymbol ?? 'SOL', outputSymbol: action.toSymbol ?? '???',
            amountPerCycleUi: amountPerCycle, totalCycles, cycleSecondsApart, totalAmountUi: totalAmountSol,
          }
          addLog({ level: 'info', message: `📝 Creating DCA proposal: ${describeDCA({ inputSymbol: meta.inputSymbol, outputSymbol: meta.outputSymbol, amountPerCycle, totalCycles, cycleSecondsApart })}`, ruleId: rule.id, ruleName: rule.name })
          try {
            await createProposal.mutateAsync({
              potAddress: potPubkey, nextProposalId: pot?.nextProposalId ?? 0,
              proposalType: { dca: { fromMint: action.fromMint, toMint: action.toMint, totalAmount: String(toRawAmount(totalAmountSol, action.fromMint)), amountPerCycle: String(toRawAmount(amountPerCycle, action.fromMint)), cycleSecondsApart, totalCycles } },
              description: `[AI] ${buildProposalDescription(meta)}`,
            })
            addLog({ level: 'success', message: `✅ DCA proposal created: ${describeDCA({ inputSymbol: meta.inputSymbol, outputSymbol: meta.outputSymbol, amountPerCycle, totalCycles, cycleSecondsApart })}`, ruleId: rule.id, ruleName: rule.name })
            setConfig({ ...config, rules: config.rules.map((r) => r.id === rule.id ? { ...r, fireCount: r.fireCount + 1, lastFiredAt: Date.now() } : r) })
            qc.invalidateQueries({ queryKey: ['proposals', potPubkey] })
          } catch (err) {
            addLog({ level: 'error', message: `❌ DCA proposal failed: ${err instanceof Error ? err.message : String(err)}`, ruleId: rule.id, ruleName: rule.name })
          }
        }
      }

      setLastCheck(new Date())
    } catch (err) {
      addLog({ level: 'error', message: `Agent error: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setIsRunning(false)
    }
  }, [config, publicKey, proposals, potPubkey, pot, addLog, setConfig, createProposal, vote, qc])

  /* ── Auto-run every 60s ── */
  useEffect(() => {
    if (!config?.enabled) return
    const interval = setInterval(runCheck, 60_000)
    runCheck()
    return () => clearInterval(interval)
  }, [config?.enabled, runCheck])

  const toggleEnabled = useCallback(() => {
    if (!config) {
      const newConfig = createDefaultConfig(potPubkey, 'custom')
      newConfig.enabled = true
      setConfig(newConfig)
      addLog({ level: 'info', message: '🤖 AI Agent started' })
    } else {
      const updated = { ...config, enabled: !config.enabled }
      setConfig(updated)
      addLog({ level: 'info', message: updated.enabled ? '🤖 AI Agent started' : '⏹️ AI Agent stopped' })
    }
  }, [config, potPubkey, setConfig, addLog])

  const clearLog = useCallback(() => {
    setLog([])
  }, [])

  const triggerManualCheck = useCallback(async () => {
    try {
      const result = await agentApi.trigger(potPubkey)
      addLog({ level: 'info', message: `🖥️ Server trigger: ${result.message}` })
    } catch {
      // API offline — fall through to local evaluation
    }
    await runCheck()
  }, [potPubkey, runCheck, addLog])

  return { config, log, isRunning, lastCheck, setConfig, toggleEnabled, clearLog, triggerManualCheck }
}
