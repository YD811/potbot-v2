'use client'

import { useMemo } from 'react'

/**
 * PotActivityFeed — last few events for a pot (proposal created / passed /
 * executed / new member, etc).
 *
 * Phase 1 implementation: synthesises events from the data we already have in
 * the React-Query cache (proposals + members + pot stats). When a real
 * Helius-powered event stream lands in apps/api, swap this component's data
 * source for a useEvents() hook.
 */

interface Event {
  id: string
  ts: number
  kind: 'proposal-created' | 'proposal-passed' | 'proposal-executed' | 'proposal-rejected' | 'member-joined' | 'pot-created'
  text: string
  /** optional Solana Explorer link target — proposal pubkey or member wallet */
  explorerAddress?: string
}

interface Props {
  pot: any
  proposals: any[]
  members: any[]
  cluster?: 'mainnet-beta' | 'devnet'
  limit?: number
}

const KIND_META: Record<Event['kind'], { icon: string; color: string }> = {
  'proposal-created':  { icon: '🗳️', color: 'text-pot-accent' },
  'proposal-passed':   { icon: '✅', color: 'text-pot-green' },
  'proposal-executed': { icon: '🚀', color: 'text-blue-300' },
  'proposal-rejected': { icon: '❌', color: 'text-red-400' },
  'member-joined':     { icon: '👋', color: 'text-amber-300' },
  'pot-created':       { icon: '🪴', color: 'text-pot-green' },
}

function formatRelative(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

export function PotActivityFeed({ pot, proposals, members, cluster = 'devnet', limit = 6 }: Props) {
  const events: Event[] = useMemo(() => {
    const out: Event[] = []
    const explorerSuffix = cluster === 'mainnet-beta' ? '' : '?cluster=devnet'

    if (pot?.createdAt) {
      out.push({
        id: 'pot-created',
        ts: new Date(pot.createdAt).getTime(),
        kind: 'pot-created',
        text: `Pot created — ${pot.name ?? 'unnamed'}`,
      })
    }

    for (const p of proposals ?? []) {
      const ts = new Date(p.createdAt ?? p.created_at ?? Date.now()).getTime()
      const desc = (p.description ?? `Proposal #${p.proposalId ?? '?'}`).slice(0, 80)
      out.push({
        id: `prop-${p.pubkey}-c`,
        ts,
        kind: 'proposal-created',
        text: desc,
        explorerAddress: p.pubkey,
      })
      if (p.status === 'passed' || p.status === 'executed') {
        out.push({
          id: `prop-${p.pubkey}-${p.status}`,
          ts: ts + 1, // ensures ordering after creation
          kind: p.status === 'executed' ? 'proposal-executed' : 'proposal-passed',
          text: `Proposal ${p.status}: ${desc}`,
          explorerAddress: p.pubkey,
        })
      }
      if (p.status === 'rejected') {
        out.push({
          id: `prop-${p.pubkey}-rejected`,
          ts: ts + 1,
          kind: 'proposal-rejected',
          text: `Proposal rejected: ${desc}`,
          explorerAddress: p.pubkey,
        })
      }
    }

    for (const m of members ?? []) {
      const ts = m.joinedAt ? new Date(m.joinedAt).getTime() : null
      if (!ts) continue
      const addr = m.wallet ?? m.pubkey ?? 'unknown'
      out.push({
        id: `member-${addr}`,
        ts,
        kind: 'member-joined',
        text: `New member: ${addr.slice(0, 4)}…${addr.slice(-4)}`,
        explorerAddress: addr,
      })
    }

    return out.sort((a, b) => b.ts - a.ts).slice(0, limit).map((e) => ({
      ...e,
      explorerAddress: e.explorerAddress
        ? `https://explorer.solana.com/address/${e.explorerAddress}${explorerSuffix}`
        : undefined,
    })) as Event[]
  }, [pot, proposals, members, cluster, limit])

  if (events.length === 0) {
    return (
      <div className="bg-pot-card border border-pot-border rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-pot-muted text-sm">No activity yet — be the first to propose a swap.</p>
      </div>
    )
  }

  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl">
      <div className="px-5 py-3 border-b border-pot-border flex items-center justify-between">
        <h3 className="font-bold text-white text-sm">📡 Recent activity</h3>
        <span className="text-[10px] text-pot-muted uppercase tracking-wide">last {events.length}</span>
      </div>
      <ul className="divide-y divide-pot-border/50">
        {events.map((e) => {
          const meta = KIND_META[e.kind]
          return (
            <li key={e.id} className="px-5 py-3 flex items-start gap-3 text-sm">
              <span className="shrink-0 text-base leading-tight">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`${meta.color} font-medium truncate`}>{e.text}</p>
                <p className="text-[11px] text-pot-muted mt-0.5">{formatRelative(e.ts)}</p>
              </div>
              {e.explorerAddress && (
                <a
                  href={e.explorerAddress as unknown as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[11px] text-pot-muted hover:text-pot-green transition"
                  title="View on Solana Explorer"
                >
                  ↗
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
