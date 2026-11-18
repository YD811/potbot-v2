/**
 * VaultPortfolio — Real-time vault holdings powered by Dune SIM
 *
 * Shows each token position with USD value and % of total vault.
 * Displayed in the "Positions" tab of the pot detail page.
 *
 * Data source: Dune SIM /beta/svm/balances/{vaultPda}
 * Refreshes every 30 seconds automatically.
 */

"use client";

import { useDunePortfolio } from "@/hooks/useDunePortfolio";
import { useDuneTrades } from "@/hooks/useDuneTrades";

interface Props {
  vaultPda: string;
  potName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

function timeAgo(sec: number): string {
  const diff = Math.floor(Date.now() / 1000) - sec;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VaultPortfolio({ vaultPda, potName }: Props) {
  const {
    portfolio,
    tvlUsd,
    isLoading: balLoading,
    isError: balError,
    lastUpdated,
    refetch,
  } = useDunePortfolio(vaultPda);

  const { trades, isLoading: txLoading } = useDuneTrades(vaultPda, 10);

  // ── Empty / loading states ─────────────────────────────────────────────────

  if (balLoading) {
    return (
      <div className="card p-6 space-y-3 animate-pulse">
        <div className="h-4 bg-pot-border rounded w-32" />
        <div className="h-10 bg-pot-border rounded w-48" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-pot-border rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (balError) {
    return (
      <div className="card p-6 text-center text-pot-muted">
        <p className="text-sm">Failed to load portfolio data.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-xs text-pot-green underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── TVL header ── */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-pot-muted uppercase tracking-widest mb-1">
              Vault TVL · powered by Dune SIM
            </p>
            <p className="text-3xl font-bold text-pot-green">
              {tvlUsd > 0 ? fmtUsd(tvlUsd) : "—"}
            </p>
            <p className="text-xs text-pot-muted mt-1">
              {portfolio.length} token{portfolio.length !== 1 ? "s" : ""} ·{" "}
              {lastUpdated
                ? `updated ${timeAgo(Math.floor(lastUpdated.getTime() / 1000))}`
                : "live"}
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="text-xs text-pot-muted hover:text-pot-green transition-colors"
            title="Refresh"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Token positions ── */}
      {portfolio.length === 0 ? (
        <div className="card p-8 text-center text-pot-muted">
          <p className="text-sm">No token positions — vault is empty.</p>
          <p className="text-xs mt-1">
            Deposit tokens to start trading as a group.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-pot-border">
          <div className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 text-xs text-pot-muted uppercase tracking-wide">
            <span>Token</span>
            <span className="text-right">Balance</span>
            <span className="text-right">Price</span>
            <span className="text-right">Value</span>
          </div>

          {portfolio.map((item) => (
            <div
              key={item.mint}
              className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center hover:bg-pot-border/30 transition-colors"
            >
              {/* Token name + share bar */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.symbol}</span>
                  <span className="text-xs text-pot-muted truncate hidden sm:block">
                    {item.name}
                  </span>
                </div>
                {/* % share bar */}
                <div className="mt-1 h-1 w-full max-w-[120px] bg-pot-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pot-green rounded-full"
                    style={{ width: `${Math.min(item.pctOfVault, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-pot-muted">
                  {fmtPct(item.pctOfVault)} of vault
                </span>
              </div>

              <span className="text-sm text-right tabular-nums">
                {parseFloat(item.balance).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </span>

              <span className="text-sm text-right tabular-nums text-pot-muted">
                {item.priceUsd > 0 ? fmtUsd(item.priceUsd) : "—"}
              </span>

              <span className="text-sm text-right tabular-nums font-medium">
                {item.valueUsd > 0 ? fmtUsd(item.valueUsd) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent on-chain activity ── */}
      <div className="card p-4">
        <p className="text-xs text-pot-muted uppercase tracking-widest mb-3">
          On-chain activity · Dune SIM
        </p>

        {txLoading && (
          <div className="space-y-2 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 bg-pot-border rounded" />
            ))}
          </div>
        )}

        {!txLoading && trades.length === 0 && (
          <p className="text-sm text-pot-muted text-center py-4">
            No transactions yet.
          </p>
        )}

        {!txLoading && trades.length > 0 && (
          <div className="space-y-1">
            {trades.map((t) => (
              <a
                key={t.signature}
                href={`https://explorer.solana.com/tx/${t.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded hover:bg-pot-border/40 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      t.type === "swap"
                        ? "bg-pot-accent/20 text-pot-accent"
                        : t.type === "deposit"
                        ? "bg-pot-green/20 text-pot-green"
                        : t.type === "withdraw"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-pot-border text-pot-muted"
                    }`}
                  >
                    {t.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-pot-muted font-mono">
                    {t.signature.slice(0, 8)}…
                  </span>
                </div>
                <span className="text-xs text-pot-muted group-hover:text-white transition-colors">
                  {timeAgo(t.blockTime)} ↗
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Attribution ── */}
      <p className="text-xs text-pot-muted text-center">
        Portfolio data provided by{" "}
        <a
          href="https://sim.dune.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pot-green hover:underline"
        >
          Dune SIM
        </a>{" "}
        · refreshes every 30s
      </p>
    </div>
  );
}
