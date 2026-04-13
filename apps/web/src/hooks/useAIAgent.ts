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

/* ── Per-pot config store (localStorage) ── */

const CONFIG_KEY = (pot: string) => `potbot-agent-${pot}`
const LOG_KEY    = (pot: string) => `potbot-agent-log-${pot}`
const MAX_LOG    = 50

function loadConfig(potPubkey: string): AgentConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY(potPubkey))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveConfig(config: AgentConfig) {
  try {
    localStorage.setItem(CONFIG_KEY(config.potPubkey), JSON.stringify(config))
  } catch {}
}

function loadLog(potPubkey: string): AgentLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY(potPubkey))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveLog(potPubkey: string, log: AgentLogEntry[]) {
  try {
    localStorage.setItem(LOG_KEY(potPubkey), JSON.stringify(log.slice(0, MAX_LOG)))
  } catch {}
}

/* ── Hook ── */

export interface UseAIAgentReturn {
  config: AgentConfig | null
  log: AgentLogEntry[]
  isRunning: boolean
  lastCheck: Date | null
  setConfig: (config: AgentConfig) => void
  toggleEnabled: () => void
  clearLog: () => void
  triggerManualCheck: () => Promise<void>
}

// Mints to watch for price updates
const WATCH_MINTS = [
  'So11111111111111111111111111111111111111112',    // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // JitoSOL
]

export function useAIAgent(potPubkey: string, pot: any): UseAIAgentReturn {
  const { publicKey } = useWallet()
  const qc = useQueryClient()
  const createProposal = useCreateProposal()
  const vote = useVote()
  const { data: proposals } = useProposals(potPubkey)

  const [config, setConfigState] = useState<AgentConfig | null>(() => loadConfig(potPubkey))
  const [log, setLog] = useState<AgentLogEntry[]>(() => loadLog(potPubkey))
  const [isRunning, setIsRunning] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const prevPricesRef = useRef<Record<string, number>>({})
  const proposalSeenRef = useRef<Set<string>>(new Set())

  /* ── Persist ── */
  const setConfig = useCallback((newConfig: AgentConfig) => {
    setConfigState(newConfig)
    saveConfig(newConfig)
  }, [])

  /* ── Logging ── */
  const addLog = useCallback((entry: Omit<AgentLogEntry, 'id' | 'timestamp'>) => {
    const full: AgentLogEntry = {
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      ...entry,
    }
    setLog((prev) => {
      const next = [full, ...prev].slice(0, MAX_LOG)
      saveLog(potPubkey, next)
      return next
    })
  }, [potPubkey])

  /* ── Main evaluation loop ── */
  const runCheck = useCallback(async () => {
    if (!config?.enabled || !publicKey) return
    setIsRunning(true)

    try {
      // 1. Fetch current prices
      const mints = [
        ...new Set([
          ...WATCH_MINTS,
          ...config.rules.flatMap((r) => r.trigger.tokenMint ? [r.trigger.tokenMint] : []),
          ...config.rules.flatMap((r) => [r.action.fromMint, r.action.toMint].filter(Boolean) as string[]),
        ])
      ]

      const prices = await fetchPricesRaw(mints)
      const prevPrices = prevPricesRef.current

      // Compute % changes
      const priceChangePct: Record<string, number> = {}
      for (const [mint, price] of Object.entries(prices)) {
        const prev = prevPrices[mint]
        priceChangePct[mint] = prev ? ((price - prev) / prev) * 100 : 0
      }
      prevPricesRef.current = prices

      const snapshot: MarketSnapshot = {
        prices,
        priceChangePct,
        timestamp: Date.now(),
      }

      // 2. Handle proposal_created rules separately
      if (proposals) {
        const newProposals = proposals.filter(
          (p) => p.status === 'active' && !proposalSeenRef.current.has(p.pubkey)
        )
        for (const proposal of newProposals) {
          proposalSeenRef.current.add(proposal.pubkey)

          for (const rule of config.rules) {
            if (!rule.enabled || rule.trigger.type !== 'proposal_created') continue
            if (config.proposeOnly) continue

            const maxImpact = rule.action.maxPriceImpactPct ?? 100
            // In production: check Jupiter quote for impact
            // Here we simulate: approve if description doesn't contain "high risk"
            const shouldVote = rule.action.type === 'vote_yes'

            if (shouldVote) {
              addLog({
                level: 'info',
                message: `🗳️ Auto-voting YES on proposal #${proposal.proposalId}: "${proposal.description}"`,
                ruleId: rule.id,
                ruleName: rule.name,
              })
              try {
                await vote.mutateAsync({
                  potAddress: potPubkey,
                  proposalAddress: proposal.pubkey,
                  approve: true,
                })
                addLog({
                  level: 'success',
                  message: `✅ Voted YES on proposal #${proposal.proposalId}`,
                  ruleId: rule.id,
                  ruleName: rule.name,
                })

                // Update rule fire count
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
                  level: 'error',
                  message: `❌ Vote failed: ${err instanceof Error ? err.message : String(err)}`,
                  ruleId: rule.id,
                  ruleName: rule.name,
                })
              }
            }
          }
        }
      }

      // 3. Evaluate market-driven rules
      for (const rule of config.rules) {
        if (rule.trigger.type === 'proposal_created') continue

        const result: EvalResult = evaluateRule(rule, snapshot)

        if (!result.triggered) {
          // Only log if something changed meaningfully
          continue
        }

        addLog({
          level: 'info',
          message: `🔔 Rule triggered: "${rule.name}" — ${result.reason}`,
          ruleId: rule.id,
          ruleName: rule.name,
        })

        // Execute action
        if (rule.action.type === 'alert') {
          addLog({
            level: 'warn',
            message: `⚠️ Alert: ${rule.action.label}`,
            ruleId: rule.id,
            ruleName: rule.name,
          })
        } else if (rule.action.type === 'propose_swap') {
          const amountSol = ((rule.action.amountPct ?? 10) / 100) * (pot?.balance ?? 0)
          if (amountSol < 0.01) {
            addLog({
              level: 'warn',
              message: `⚠️ Skipped: vault balance too low for proposal`,
              ruleId: rule.id,
              ruleName: rule.name,
            })
            continue
          }

          addLog({
            level: 'info',
            message: `📝 Creating proposal: ${rule.action.label} (${amountSol.toFixed(3)} SOL)`,
            ruleId: rule.id,
            ruleName: rule.name,
          })

          try {
            await createProposal.mutateAsync({
              potAddress: potPubkey,
              nextProposalId: pot?.nextProposalId ?? 0,
              proposalType: {
                swap: {
                  fromMint: rule.action.fromMint!,
                  toMint: rule.action.toMint!,
                  amountIn: amountSol,
                  minAmountOut: 0,
                }
              },
              description: `[AI] ${rule.action.label} — ${amountSol.toFixed(3)} ${rule.action.fromSymbol}`,
            })

            addLog({
              level: 'success',
              message: `✅ Proposal created: "${rule.action.label}"`,
              ruleId: rule.id,
              ruleName: rule.name,
            })

            // Update rule state
            setConfig({
              ...config,
              rules: config.rules.map((r) =>
                r.id === rule.id
                  ? { ...r, fireCount: r.fireCount + 1, lastFiredAt: Date.now() }
                  : r
              ),
            })

            // Invalidate proposals cache
            qc.invalidateQueries({ queryKey: ['proposals', potPubkey] })
          } catch (err) {
            addLog({
              level: 'error',
              message: `❌ Proposal failed: ${err instanceof Error ? err.message : String(err)}`,
              ruleId: rule.id,
              ruleName: rule.name,
            })
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

  /* ── Auto-run every 60 seconds ── */
  useEffect(() => {
    if (!config?.enabled) return
    const interval = setInterval(runCheck, 60_000)
    // Run immediately on enable
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
      addLog({
        level: 'info',
        message: updated.enabled ? '🤖 AI Agent started' : '⏹️ AI Agent stopped',
      })
    }
  }, [config, potPubkey, setConfig, addLog])

  const clearLog = useCallback(() => {
    setLog([])
    saveLog(potPubkey, [])
  }, [potPubkey])

  return {
    config,
    log,
    isRunning,
    lastCheck,
    setConfig,
    toggleEnabled,
    clearLog,
    triggerManualCheck: runCheck,
  }
}
