# PotBot Security Audit (On-chain RBAC + Supabase RLS)

Date: 2026-04-26  
Scope: `packages/program/programs/pot_vault/src/instructions/*`, `apps/web`, Supabase policy expectations.

## 1) On-chain access control checklist (mutating handlers)

### `deposit` (`deposit.rs`)
- [x] Caller signer is checked against pot auth model (`depositor: Signer` and private pot check requires `depositor == pot.authority`).
- [ ] Withdraw-like share burn from caller ATA is required (N/A to deposit).
- [x] CPI program ID validation exists for System Program (`system_program: Program<System>`).
- [ ] `#[account(has_one = creator)]` / `has_one = pot` used where appropriate.
  - TODO **HIGH:** `member` account does not enforce `has_one = pot`; seeds include `pot` but explicit `has_one` hardening is missing.

### `withdraw` (`withdraw.rs`)
- [x] Caller signer is checked against membership (`withdrawer: Signer`, `member.wallet == withdrawer`).
- [ ] Withdraw requires share burn from caller ATA.
  - TODO **CRITICAL:** withdraw burns internal `MemberAccount.shares` only; no SPL share-token ATA burn requirement is enforced.
- [x] CPI program ID validation is effectively not needed (direct lamport transfer; System Program account is typed).
- [ ] `#[account(has_one = creator)]` / `has_one = pot` used where appropriate.
  - TODO **HIGH:** `member` lacks explicit `has_one = pot` constraint.

### `create_proposal` (`create_proposal.rs`)
- [x] Caller signer is checked against members (`member` PDA seeded by `proposer`, `member.shares > 0`).
- [ ] Withdraw share burn from ATA (N/A).
- [x] CPI program ID validation (no external CPI in handler).
- [ ] `#[account(has_one = creator)]` / `has_one = pot` used where appropriate.
  - TODO **HIGH:** `member` account is not annotated with `has_one = pot`.

### `vote` (`vote.rs`)
- [x] Caller signer is checked against members (`member` PDA seeded by `voter`, `member.shares > 0`).
- [ ] Withdraw share burn from ATA (N/A).
- [x] CPI program ID validation (no external CPI in handler).
- [x] `has_one = pot` applied on `proposal`.
- [ ] `has_one = pot` missing on `member`.
  - TODO **HIGH:** add `has_one = pot` on `member` for defense-in-depth.

### `execute_swap` (executeTrade equivalent) (`execute_swap.rs`)
- [x] Caller signer is role-checked by mode:
  - AdminDirect: signer must equal `pot.authority`.
  - Proposal: currently signer must equal `pot.authority`.
  - StrategyTrigger: signer must equal `pot.agent_authority`.
- [ ] Member-based caller validation against `PotAccount.members`/member PDA for proposal execution.
  - TODO **HIGH:** proposal execution path is admin-only today; no member-signer path yet (commented as future Phase 2).
- [x] CPI target program is pinned (`jupiter_program.key() == JUPITER_V6_PROGRAM_ID`).
- [x] Additional remaining-account owner filtering exists (token/ATA/system/sysvar/Jupiter/exec).
- [x] `has_one = pot` is present for `strategy` and optional `proposal_swap_spec`.

### `create_strategy` (setStrategy equivalent) (`create_strategy.rs`)
- [x] AdminDirect signer path validates `authority == admin == pot.authority`.
- [ ] Non-admin strategy paths have incomplete auth.
  - TODO **CRITICAL:** `StrategySource::Agent` path has explicit TODO and currently does **not** enforce `authority == pot.agent_authority`.
- [ ] CPI program ID validation (N/A in this handler).
- [ ] `#[account(has_one = creator)]` / `has_one = pot` used where appropriate.
  - TODO **HIGH:** `pot` account is mutable but not constrained via `has_one` linkage to an explicit creator authority account in the context.

---

## 2) Supabase RLS audit and expected policies

Expected model:
- `SELECT` public read-only for: `pots`, `strategies`, `leaderboard_cache`.
- `SELECT` members-only for private-pot `trade_log` rows (join through `members`).
- `INSERT/UPDATE/DELETE`: `service_role` only (keeper/backend); web app should not write directly.

> Notes:
> - Snippets are intentionally commented so they can be pasted and edited safely in Supabase SQL Editor.
> - Replace `is_pot_private(...)` / auth mapping with your project’s exact schema if names differ.

### `pots`
```sql
-- alter table public.pots enable row level security;
-- create policy "pots_select_public"
--   on public.pots for select
--   using (true);
-- create policy "pots_write_service_role_only"
--   on public.pots for all
--   using (auth.role() = 'service_role')
--   with check (auth.role() = 'service_role');
```

### `strategies`
```sql
-- alter table public.strategies enable row level security;
-- create policy "strategies_select_public"
--   on public.strategies for select
--   using (true);
-- create policy "strategies_write_service_role_only"
--   on public.strategies for all
--   using (auth.role() = 'service_role')
--   with check (auth.role() = 'service_role');
```

### `members`
```sql
-- alter table public.members enable row level security;
-- create policy "members_select_public_or_restricted"
--   on public.members for select
--   using (true); -- tighten if member list should be private
-- create policy "members_write_service_role_only"
--   on public.members for all
--   using (auth.role() = 'service_role')
--   with check (auth.role() = 'service_role');
```

### `trade_log`
```sql
-- alter table public.trade_log enable row level security;
-- create policy "trade_log_select_public_or_member_private"
--   on public.trade_log for select
--   using (
--     -- public pots are readable by all
--     exists (
--       select 1
--       from public.pots p
--       where p.pubkey = trade_log.pot_pubkey
--         and coalesce(p.is_private, false) = false
--     )
--     OR
--     -- private pots readable only by authenticated pot members
--     exists (
--       select 1
--       from public.members m
--       where m.pot_pubkey = trade_log.pot_pubkey
--         and m.wallet = auth.jwt()->>'sub'
--     )
--   );
-- create policy "trade_log_write_service_role_only"
--   on public.trade_log for all
--   using (auth.role() = 'service_role')
--   with check (auth.role() = 'service_role');
```

### `leaderboard_cache`
```sql
-- alter table public.leaderboard_cache enable row level security;
-- create policy "leaderboard_cache_select_public"
--   on public.leaderboard_cache for select
--   using (true);
-- create policy "leaderboard_cache_write_service_role_only"
--   on public.leaderboard_cache for all
--   using (auth.role() = 'service_role')
--   with check (auth.role() = 'service_role');
```

### `worker_metrics`
```sql
-- alter table public.worker_metrics enable row level security;
-- create policy "worker_metrics_select_restricted"
--   on public.worker_metrics for select
--   using (auth.role() = 'service_role'); -- or admin-only user claim if needed
-- create policy "worker_metrics_write_service_role_only"
--   on public.worker_metrics for all
--   using (auth.role() = 'service_role')
--   with check (auth.role() = 'service_role');
```
