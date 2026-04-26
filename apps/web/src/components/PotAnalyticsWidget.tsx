'use client'

import { useEffect, useState } from 'react'
import { solscanAccount, solscanTx } from '@/lib/explorer'
import { supabase } from '@/lib/supabase'

interface TradeLogRow {
  id: string
  signature: string
  executed_at: string
}

interface PotAnalyticsWidgetProps {
  potPubkey: string
  vaultPubkey?: string
}

export default function PotAnalyticsWidget({ potPubkey, vaultPubkey }: PotAnalyticsWidgetProps) {
  const [rows, setRows] = useState<TradeLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadTrades() {
      setLoading(true)
      const { data } = await supabase
        .from('trade_log')
        .select('id,signature,executed_at')
        .eq('pot_pubkey', potPubkey)
        .order('executed_at', { ascending: false })
        .limit(5)

      if (mounted) {
        setRows((data ?? []) as TradeLogRow[])
        setLoading(false)
      }
    }

    void loadTrades()
    return () => {
      mounted = false
    }
  }, [potPubkey])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
      <div className="rounded-2xl bg-card border border-border p-4">
        <p className="text-sm text-pot-muted mb-2">Pot Account on Solscan</p>
        <a href={solscanAccount(potPubkey)} target="_blank" rel="noreferrer" className="text-pot-accent hover:underline break-all">
          {potPubkey} ↗
        </a>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <p className="text-sm text-pot-muted mb-2">Vault Token Account on Solscan</p>
        {vaultPubkey ? (
          <a href={solscanAccount(vaultPubkey)} target="_blank" rel="noreferrer" className="text-pot-accent hover:underline break-all">
            {vaultPubkey} ↗
          </a>
        ) : (
          <p className="text-pot-muted text-sm">No vault token account provided.</p>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <p className="text-sm text-pot-muted mb-2">Recent Transactions</p>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 w-full rounded bg-pot-border/50 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-pot-muted text-sm">No recent trades found.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="text-sm">
                <a href={solscanTx(row.signature)} target="_blank" rel="noreferrer" className="text-pot-accent hover:underline break-all">
                  {row.signature} ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
