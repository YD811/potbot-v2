# ADR-002: On-Chain vs Off-Chain Data Storage Architecture

**Date:** 2026-04-21  
**Status:** Accepted  
**Author:** PotBot Engineering  
**Supersedes:** ADR-001 (general architecture review)

---

## Context

PotBot v2 is a Telegram-native group trading vault on Solana. The system must decide what data lives where — on-chain in Anchor accounts, in Supabase (PostgreSQL), or ephemerally in memory. This decision directly impacts security, performance, and correctness.

## Decision: Three-Tier Data Model

### Tier 1 — On-Chain (Anchor PDAs) — Authoritative, Immutable

The canonical source of truth. These cannot be faked or tampered with by the frontend.

| Account | Data | Why on-chain |
|---|---|---|
| `PotAccount` | name, authority, balance, shares, member count, governance levels, quorum_bps, timelock_seconds | Security-critical — enforces governance rules |
| `MemberAccount` | wallet, shares, deposit_total, withdraw_total | Controls withdrawal entitlements |
| `ProposalAccount` | type, description, status, votes, passed_at | Enforces governance outcomes |
| `VoterRecord` | voted, approve | Prevents double-voting |
| `TamagotchiMint` | NFT mint, metadata | On-chain NFT ownership |

**Rule:** Any value that determines whether a transaction is allowed MUST live on-chain. The program validates all governance rules on-chain — the frontend UI settings are display-only and cannot override on-chain enforcement.

---

### Tier 2 — Supabase (PostgreSQL) — Shared State, Mutable

Server-authoritative state that needs to be shared across users and sessions but is not security-critical (enforced by on-chain program regardless).

| Table | Data | Why Supabase |
|---|---|---|
| `governance_settings` | quorum %, approval %, risk level, max swap %, budget limits | UI display settings; on-chain enforces the real limits |
| `agent_configs` | AI agent rules, enabled state, cooldown state | Per-pot automation config; not security-critical |
| `swap_proposal_meta` | inputMint, outputMint, amountLamports | Ephemeral bridge between proposal creation and Jupiter execution |
| `referrals` | pot_pubkey, referrer_code, visited_at | Attribution tracking |
| `deposit_snapshots` | wallet, pot_pubkey, sol_price_usd, deposited_at | USD entry price for PnL calculation |
| `pot_nav_daily` | pot_pubkey, date, nav_sol, nav_usd | Daily NAV snapshots for charting |
| `member_pnl_cache` | wallet, pot_pubkey, pnl_sol, pnl_usd | Cached PnL calculations |

---

### Tier 3 — In-Memory / Session — Ephemeral

Never persisted. Lives only in the browser session.

| Data | Location | Why ephemeral |
|---|---|---|
| Admin panel unlock | `sessionStorage` | Cleared on tab close — intentional |
| Agent evaluation logs (current session) | React state | Diagnostic only; server API provides history |
| Price feed cache | Next.js 5s cache | Refreshed frequently from Pyth/Jupiter |
| Jupiter quote preview | React state | Stale after a few seconds |
| Mock store (devnet not deployed) | Zustand in-memory | Demo fallback only |

---

## Security Invariants

1. **On-chain enforces everything.** The Anchor program independently validates quorum, timelock, member eligibility, and vault authority. No UI setting can bypass this.

2. **Governance settings in Supabase are display-only.** When the program is deployed, quorum_bps and timelock_seconds are read from `PotAccount.governance`, not from Supabase. The Supabase `governance_settings` table stores UI-layer settings (risk labels, budget display limits) that are informational.

3. **No secrets in client storage.** Private keys never touch localStorage, sessionStorage, or Supabase. Wallet signing is handled exclusively by the user's wallet adapter.

4. **Supabase writes are fire-and-forget for non-critical data.** Agent configs, referrals, and governance UI settings fail gracefully — the application continues to work with defaults if Supabase is unreachable.

5. **swap_proposal_meta is ephemeral.** Rows are deleted after execution and auto-cleaned after 30 days. This data is not sensitive — it mirrors what's already on-chain in the proposal account.

---

## Migration from localStorage

All localStorage usage has been removed in commit `feat: migrate localStorage to Supabase backend (security fix)`:

| Old Key | New Location |
|---|---|
| `potbot-gov-${potPubkey}` | Supabase `governance_settings` |
| `potbot-agent-${potPubkey}` | Supabase `agent_configs` |
| `potbot-agent-log-${potPubkey}` | API logs only (agentApi.getLogs) |
| `prop-swap-meta-${proposalPubkey}` | Supabase `swap_proposal_meta` via `/api/proposals/[pubkey]/meta` |
| `potbot-ref-${pubkey}` | Supabase `referrals` |

`sessionStorage.admin_unlocked` is intentionally kept — it is a session-only password gate that clears when the tab closes, which is the correct behavior.

---

## Consequences

**Positive:**
- Governance settings survive browser refreshes and are shared across members of the same pot
- Agent configurations persist across devices
- Admin dashboard correctly shows all active agents
- No XSS-accessible sensitive data in localStorage
- Easier to debug and audit — all state is queryable via Supabase dashboard

**Negative:**
- Supabase dependency required for governance/agent UI to persist settings
- Adds one async load on mount for GovernanceSettings and useAIAgent
- RLS policies are permissive (public write) for non-sensitive tables — acceptable for hackathon, tighten with Solana wallet auth post-launch

---

## Required DB Migrations

Run in Supabase SQL Editor in order:

1. `apps/web/src/lib/supabase-pnl-schema.sql` — PnL tables
2. `apps/web/src/lib/supabase-localstorage-migration.sql` — governance_settings, agent_configs, swap_proposal_meta
3. `apps/web/src/lib/supabase-referrals.sql` — referrals table