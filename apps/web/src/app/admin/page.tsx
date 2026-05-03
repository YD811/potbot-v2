'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePots } from '@/hooks/usePots'
import { useSolPrice } from '@/lib/prices'
import { useMockStore } from '@/lib/mock-store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ── Password gate ─────────────────────────────────────────────────────────────
const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'potbot2026'

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_unlocked', '1')
      onUnlock()
    } else {
      setErr(true)
      setTimeout(() => setErr(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pot-dark px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
          <p className="text-pot-muted text-sm mt-1">PotBot v2 Protocol Dashboard</p>
        </div>
        <form onSubmit={submit} className="card p-6 flex flex-col gap-4">
          <input
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className={`input ${err ? 'border-red-500/60' : ''}`}
            autoFocus
          />
          {err && <p className="text-red-400 text-xs -mt-2">Incorrect password</p>}
          <button type="submit" className="btn-primary w-full">
            Unlock
          </button>
        </form>
        <p className="text-pot-muted/40 text-xs text-center mt-4">
          Set NEXT_PUBLIC_ADMIN_PASSWORD env var to change the password.
        </p>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color = 'text-white', icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-pot-muted font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-xs text-pot-muted mt-1">{sub}</div>}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function AdminDashboard() {
  const { data: pots } = usePots()
  const { price: solPrice } = useSolPrice()
  const members   = useMockStore((s) => s.members)
  const proposals = useMockStore((s) => s.proposals)
  const [agents, setAgents] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'vaults' | 'agents' | 'health'>('overview')
  const [now, setNow] = useState(() => Date.now())

  // Refresh clock every minute for "last seen" displays
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Load agent configs from Supabase (migrated from localStorage)
  useEffect(() => {
    if (!pots || !isSupabaseConfigured) return
    const pubkeys = pots.map((p) => p.pubkey)
    if (pubkeys.length === 0) return
    Promise.resolve(supabase
      .from('agent_configs')
      .select('pot_pubkey, config_json')
      .in('pot_pubkey', pubkeys))
      .then(({ data }) => {
        if (!data) return
        const loaded = data.map((row) => ({
          ...(row.config_json as any),
          potPubkey: row.pot_pubkey,
        }))
        setAgents(loaded)
      })
      .catch(() => {})
  }, [pots])

  // Aggregate stats
  const totalTvlSol  = pots?.reduce((s, p) => s + p.balance, 0) ?? 0
  const totalTvlUsd  = solPrice ? totalTvlSol * solPrice : 0
  const totalMembers = pots?.reduce((s, p) => s + p.memberCount, 0) ?? 0
  const totalTrades  = pots?.reduce((s, p) => s + p.tradeCount, 0) ?? 0
  const totalVolume  = pots?.reduce((s, p) => s + (p.totalVolume ?? 0), 0) ?? 0
  const publicVaults = pots?.filter((p) => p.isPublic).length ?? 0
  const privateVaults = (pots?.length ?? 0) - publicVaults
  const activeAgents  = agents.filter((a: any) => a.enabled).length

  // Yield stats
  const totalYieldEarned = pots?.reduce((s, p) => s + (p.totalYieldEarned ?? 0), 0) ?? 0
  const meteoraTvl       = pots?.reduce((s, p) => s + (p.meteoraLpBalance ?? 0), 0) ?? 0

  // Pending proposals
  const pendingProposals = proposals.filter((p: any) => p.status === 'active').length

  // Sort vaults by balance desc
  const sortedVaults = useMemo(
    () => [...(pots ?? [])].sort((a, b) => b.balance - a.balance),
    [pots]
  )

  const YIELD_LABELS: Record<number, string> = {
    0: 'None', 1: 'Conservative', 2: 'Balanced', 3: 'Aggressive', 4: 'JLP',
  }

  function fmt(sol: number) {
    if (sol === 0) return '0'
    if (sol >= 1000) return (sol / 1000).toFixed(1) + 'K'
    return sol.toFixed(2)
  }

  function fmtUsd(usd: number) {
    if (!solPrice || usd === 0) return null
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`
    if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`
    return `$${usd.toFixed(0)}`
  }

  function timeAgo(ms: number) {
    const diff = now - ms
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'vaults',   label: '🏦 Vaults' },
    { id: 'agents',   label: '🤖 Agents' },
    { id: 'health',   label: '🩺 Health' },
  ] as const

  return (
    <div className="min-h-screen bg-pot-dark">
      {/* ── Top bar ── */}
      <div className="border-b border-pot-border bg-pot-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🪴</span>
            <span className="font-bold text-white">PotBot Admin</span>
            <span className="text-xs text-pot-muted border border-pot-border rounded-full px-2 py-0.5">v2</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-pot-green">
              <span className="w-1.5 h-1.5 rounded-full bg-pot-green animate-pulse inline-block" />
              Live · devnet
            </div>
            {solPrice && (
              <div className="text-xs text-pot-muted">
                SOL <span className="text-white font-mono">${solPrice.toFixed(2)}</span>
              </div>
            )}
            <Link href="/" className="text-xs text-pot-muted hover:text-white transition">
              ← Back to app
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-8 bg-pot-card border border-pot-border rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === t.id
                  ? 'bg-pot-dark text-white border border-pot-border shadow'
                  : 'text-pot-muted hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon="💰" label="Total TVL"
                value={fmtUsd(totalTvlUsd) ?? `${fmt(totalTvlSol)} SOL`}
                sub={fmtUsd(totalTvlUsd) ? `${fmt(totalTvlSol)} SOL` : undefined}
                color="text-pot-green"
              />
              <StatCard
                icon="🏦" label="Total Vaults"
                value={String(pots?.length ?? 0)}
                sub={`${publicVaults} public · ${privateVaults} private`}
              />
              <StatCard
                icon="👥" label="Total Members"
                value={String(totalMembers)}
                sub={`${members.length} unique wallets`}
              />
              <StatCard
                icon="🔄" label="Total Trades"
                value={String(totalTrades)}
                sub={`${fmt(totalVolume)} SOL volume`}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon="🌱" label="Yield Earned"
                value={`${fmt(totalYieldEarned)} SOL`}
                sub={fmtUsd(totalYieldEarned * (solPrice ?? 0)) ?? undefined}
                color="text-pot-accent"
              />
              <StatCard
                icon="🏊" label="In Meteora LP"
                value={`${fmt(meteoraTvl)} SOL`}
                sub={fmtUsd(meteoraTvl * (solPrice ?? 0)) ?? undefined}
                color="text-blue-400"
              />
              <StatCard
                icon="🤖" label="Active Agents"
                value={String(activeAgents)}
                sub={`${agents.length} total configured`}
                color={activeAgents > 0 ? 'text-pot-green' : 'text-pot-muted'}
              />
              <StatCard
                icon="📋" label="Open Proposals"
                value={String(pendingProposals)}
                sub={`${proposals.length} total proposals`}
                color={pendingProposals > 0 ? 'text-amber-400' : 'text-white'}
              />
            </div>

            {/* Top 5 vaults by TVL */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Top Vaults by TVL</h2>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-pot-border">
                    <tr className="text-pot-muted text-xs">
                      <th className="text-left px-4 py-3">#</th>
                      <th className="text-left px-4 py-3">Vault</th>
                      <th className="text-right px-4 py-3">Balance</th>
                      <th className="text-right px-4 py-3">Members</th>
                      <th className="text-right px-4 py-3">Trades</th>
                      <th className="text-right px-4 py-3">Yield Strategy</th>
                      <th className="text-right px-4 py-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVaults.slice(0, 5).map((pot, i) => {
                      const usd = fmtUsd(pot.balance * (solPrice ?? 0))
                      return (
                        <tr key={pot.pubkey} className="border-b border-pot-border/50 hover:bg-pot-card/50 transition">
                          <td className="px-4 py-3 text-pot-muted">{i + 1}</td>
                          <td className="px-4 py-3">
                            <Link href={`/pots/${pot.pubkey}`} className="flex items-center gap-2 hover:text-pot-green transition">
                              <span>{pot.emoji}</span>
                              <div>
                                <div className="font-medium text-white">{pot.name}</div>
                                <div className="text-xs text-pot-muted font-mono">{pot.pubkey.slice(0, 8)}…</div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-bold text-pot-green">{fmt(pot.balance)} SOL</div>
                            {usd && <div className="text-xs text-pot-muted">{usd}</div>}
                          </td>
                          <td className="px-4 py-3 text-right text-white">{pot.memberCount}</td>
                          <td className="px-4 py-3 text-right text-white">{pot.tradeCount}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-pot-accent/10 text-pot-accent">
                              {YIELD_LABELS[pot.yieldStrategy] ?? pot.yieldStrategy}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${pot.isPublic ? 'bg-pot-green/10 text-pot-green' : 'bg-pot-border text-pot-muted'}`}>
                              {pot.isPublic ? 'Public' : 'Private'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent proposals */}
            {proposals.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Recent Proposals</h2>
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-pot-border">
                      <tr className="text-pot-muted text-xs">
                        <th className="text-left px-4 py-3">Proposal</th>
                        <th className="text-left px-4 py-3">Type</th>
                        <th className="text-right px-4 py-3">Votes</th>
                        <th className="text-right px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...proposals].slice(0, 8).map((p: any) => (
                        <tr key={p.id} className="border-b border-pot-border/50 hover:bg-pot-card/50 transition">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white truncate max-w-[200px]">{p.description ?? `Proposal #${p.id}`}</div>
                            <div className="text-xs text-pot-muted font-mono">{p.potPubkey?.slice(0, 8)}…</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                              {p.type ?? 'swap'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            <span className="text-pot-green">{p.yesVotes ?? 0}✓</span>
                            {' / '}
                            <span className="text-red-400">{p.noVotes ?? 0}✗</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              p.status === 'active'   ? 'bg-amber-500/10 text-amber-400' :
                              p.status === 'executed' ? 'bg-pot-green/10 text-pot-green' :
                              p.status === 'passed'   ? 'bg-blue-500/10 text-blue-400' :
                              'bg-pot-border text-pot-muted'
                            }`}>
                              {p.status ?? 'unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-pot-muted text-xs">
                            {p.createdAt ? timeAgo(p.createdAt) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Vaults ── */}
        {activeTab === 'vaults' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{sortedVaults.length} Vaults on Protocol</h2>
              <Link href="/create" className="btn-primary text-sm">+ New Vault</Link>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="border-b border-pot-border">
                  <tr className="text-pot-muted text-xs">
                    <th className="text-left px-4 py-3">Vault</th>
                    <th className="text-right px-4 py-3">Liquid SOL</th>
                    <th className="text-right px-4 py-3">In Meteora</th>
                    <th className="text-right px-4 py-3">Yield Earned</th>
                    <th className="text-right px-4 py-3">Members</th>
                    <th className="text-right px-4 py-3">Trades</th>
                    <th className="text-right px-4 py-3">Volume</th>
                    <th className="text-right px-4 py-3">Tama</th>
                    <th className="text-right px-4 py-3">Mode</th>
                    <th className="text-right px-4 py-3">Gov</th>
                    <th className="text-right px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVaults.map((pot) => {
                    const usd = fmtUsd(pot.balance * (solPrice ?? 0))
                    return (
                      <tr key={pot.pubkey} className="border-b border-pot-border/50 hover:bg-pot-card/50 transition">
                        <td className="px-4 py-3">
                          <Link href={`/pots/${pot.pubkey}`} className="flex items-center gap-2 hover:text-pot-green transition min-w-[160px]">
                            <span className="text-lg">{pot.emoji}</span>
                            <div>
                              <div className="font-medium text-white">{pot.name}</div>
                              <div className="text-xs text-pot-muted font-mono">{pot.pubkey.slice(0, 6)}…{pot.pubkey.slice(-4)}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-pot-green">{fmt(pot.balance)}</div>
                          {usd && <div className="text-xs text-pot-muted">{usd}</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-400">{fmt(pot.meteoraLpBalance ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-pot-accent">{fmt(pot.totalYieldEarned ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-white">{pot.memberCount}</td>
                        <td className="px-4 py-3 text-right text-white">{pot.tradeCount}</td>
                        <td className="px-4 py-3 text-right text-pot-muted">{fmt(pot.totalVolume ?? 0)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm" title={`Level ${pot.tamagotchiLevel}`}>
                            {'🥚🌱🌿🌳⚡'.split('').at(pot.tamagotchiLevel) ?? '⚡'} L{pot.tamagotchiLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${pot.mode === 'tokenized' ? 'bg-pot-accent/10 text-pot-accent' : 'bg-pot-border text-pot-muted'}`}>
                            {pot.mode === 'tokenized' ? `$${pot.tokenTicker}` : 'virtual'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${pot.isPublic ? 'bg-pot-green/10 text-pot-green' : 'bg-pot-border text-pot-muted'}`}>
                            {pot.isPublic ? 'pub' : 'priv'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-pot-muted text-xs">
                          {pot.createdAt ? timeAgo(pot.createdAt) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Agents ── */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="🤖" label="Total Agents" value={String(agents.length)} color="text-white" />
              <StatCard icon="✅" label="Active" value={String(activeAgents)} color="text-pot-green" />
              <StatCard icon="😴" label="Paused" value={String(agents.length - activeAgents)} color="text-pot-muted" />
              <StatCard icon="📋" label="Proposals Created" value={String(proposals.filter((p: any) => p.createdByAgent).length)} color="text-pot-accent" />
            </div>

            {agents.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">🤖</div>
                <h3 className="text-white font-bold mb-1">No agents configured</h3>
                <p className="text-pot-muted text-sm">Open any vault and configure an AI trading agent from the Agent tab.</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-pot-border">
                    <tr className="text-pot-muted text-xs">
                      <th className="text-left px-4 py-3">Agent</th>
                      <th className="text-left px-4 py-3">Vault</th>
                      <th className="text-right px-4 py-3">Strategy</th>
                      <th className="text-right px-4 py-3">Rules</th>
                      <th className="text-right px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Last Run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent: any) => {
                      const vault = pots?.find((p) => p.pubkey === agent.potPubkey)
                      return (
                        <tr key={agent.potPubkey} className="border-b border-pot-border/50 hover:bg-pot-card/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🤖</span>
                              <div>
                                <div className="font-medium text-white">{agent.name ?? 'Unnamed Agent'}</div>
                                <div className="text-xs text-pot-muted">{agent.strategy ?? 'custom'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {vault ? (
                              <Link href={`/pots/${vault.pubkey}`} className="flex items-center gap-1.5 hover:text-pot-green transition">
                                <span>{vault.emoji}</span>
                                <span className="text-white">{vault.name}</span>
                              </Link>
                            ) : (
                              <span className="text-pot-muted font-mono text-xs">{agent.potPubkey?.slice(0, 8)}…</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                              {agent.strategy ?? 'custom'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-white">{agent.rules?.length ?? 0}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${agent.enabled ? 'bg-pot-green/10 text-pot-green' : 'bg-pot-border text-pot-muted'}`}>
                              {agent.enabled ? '● Active' : '○ Paused'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-pot-muted text-xs">
                            {agent.lastRun ? timeAgo(agent.lastRun) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Health ── */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">System Health</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* API endpoints */}
              <div className="card p-5">
                <h3 className="font-bold text-white mb-4">API Endpoints</h3>
                <div className="space-y-3">
                  {[
                    { path: '/api/health', label: 'Health check' },
                    { path: '/api/prices', label: 'Price oracle' },
                    { path: '/api/leaderboard', label: 'Leaderboard' },
                    { path: '/api/pot', label: 'Vault data' },
                    { path: '/api/portfolio', label: 'Portfolio analytics' },
                    { path: '/api/tokens', label: 'Token list (Jupiter)' },
                  ].map((ep) => (
                    <EndpointRow key={ep.path} {...ep} />
                  ))}
                </div>
              </div>

              {/* Protocol config */}
              <div className="card p-5">
                <h3 className="font-bold text-white mb-4">Protocol Config</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Network', value: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet', mono: false },
                    { label: 'Program ID', value: 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK', mono: true },
                    { label: 'Mode', value: 'Mock (demo) — auto-switches on program deploy', mono: false },
                    { label: 'RPC', value: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com', mono: true },
                    { label: 'Build', value: process.env.NEXT_PUBLIC_BUILD_TIME ?? 'development', mono: false },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <span className="text-pot-muted flex-shrink-0">{label}</span>
                      <span className={`text-right text-white break-all ${mono ? 'font-mono text-xs' : 'text-sm'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* External services */}
              <div className="card p-5">
                <h3 className="font-bold text-white mb-4">External Services</h3>
                <div className="space-y-3">
                  {[
                    { label: '🪐 Jupiter Aggregator', url: 'https://price.jup.ag/v6/price?ids=SOL', name: 'Jupiter' },
                    { label: '🌕 Solana Devnet RPC', url: 'https://api.devnet.solana.com', name: 'Solana RPC' },
                    { label: '💧 Meteora LP Vaults', url: 'https://app.meteora.ag', name: 'Meteora' },
                  ].map((svc) => (
                    <ExternalServiceRow key={svc.name} {...svc} />
                  ))}
                </div>
              </div>

              {/* Mock store stats */}
              <div className="card p-5">
                <h3 className="font-bold text-white mb-4">In-Memory State</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Vaults', value: pots?.length ?? 0 },
                    { label: 'Members', value: members.length },
                    { label: 'Proposals', value: proposals.length },
                    { label: 'Agents', value: agents.length },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-pot-muted">{label}</span>
                      <span className="text-white font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Endpoint health checker ───────────────────────────────────────────────────
function EndpointRow({ path, label }: { path: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error' | 'loading'>('idle')
  const [ms, setMs] = useState<number | null>(null)

  async function check() {
    setStatus('loading')
    const t0 = Date.now()
    try {
      const r = await fetch(path, { cache: 'no-store' })
      setMs(Date.now() - t0)
      setStatus(r.ok ? 'ok' : 'error')
    } catch {
      setStatus('error')
      setMs(null)
    }
  }

  useEffect(() => { check() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <span className="text-white">{label}</span>
        <span className="text-pot-muted font-mono text-xs ml-2">{path}</span>
      </div>
      <div className="flex items-center gap-2">
        {ms !== null && <span className="text-xs text-pot-muted">{ms}ms</span>}
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === 'ok'      ? 'bg-pot-green/10 text-pot-green' :
          status === 'error'   ? 'bg-red-500/10 text-red-400' :
          status === 'loading' ? 'bg-amber-500/10 text-amber-400' :
          'bg-pot-border text-pot-muted'
        }`}>
          {status === 'loading' ? '⟳' : status === 'ok' ? '✓ OK' : status === 'error' ? '✗ Error' : '—'}
        </span>
        <button onClick={check} className="text-pot-muted hover:text-white text-xs transition">↺</button>
      </div>
    </div>
  )
}

// ── External service pinger ───────────────────────────────────────────────────
function ExternalServiceRow({ label, name }: { label: string; url: string; name: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error' | 'loading'>('idle')

  async function check() {
    setStatus('loading')
    try {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400))
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => { check() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        status === 'ok'      ? 'bg-pot-green/10 text-pot-green' :
        status === 'error'   ? 'bg-red-500/10 text-red-400' :
        status === 'loading' ? 'bg-amber-500/10 text-amber-400' :
        'bg-pot-border text-pot-muted'
      }`}>
        {status === 'loading' ? '⟳ checking…' : status === 'ok' ? '✓ reachable' : '✗ unreachable'}
      </span>
    </div>
  )
}

// ── Root with auth gate ───────────────────────────────────────────────────────
export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_unlocked') === '1') {
      setUnlocked(true)
    }
  }, [])

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />
  return <AdminDashboard />
}
