-- PotBot v2 — 20260508_5_nav_snapshots.sql
--
-- Periodic NAV snapshots written by the price-refresh / nav-snapshot
-- cron. Persists per-share value over time so the UI can render the
-- vault's PnL chart without having to recompute it from on-chain
-- balances every page load.
--
-- One row per (pot, slot). The snapshot_slot is the Solana slot at
-- which balances were observed, so charts can be aligned with on-chain
-- events even when the cron runs out-of-band.

create table if not exists nav_snapshots (
  id               uuid           primary key default gen_random_uuid(),
  pot_pubkey       text           not null,
  nav_per_share    numeric(38, 8) not null,
  total_value_sol  numeric(38, 8) not null,
  total_shares     numeric(38, 0) not null,
  snapshot_slot    bigint,
  snapshotted_at   timestamptz    not null default now()
);

create index if not exists nav_snapshots_pot_time_idx
  on nav_snapshots (pot_pubkey, snapshotted_at desc);

create unique index if not exists nav_snapshots_pot_slot_uidx
  on nav_snapshots (pot_pubkey, snapshot_slot)
  where snapshot_slot is not null;

-- Public read; writes locked to service_role.
alter table nav_snapshots enable row level security;

drop policy if exists nav_snapshots_read on nav_snapshots;
create policy nav_snapshots_read on nav_snapshots
  for select using (true);

drop policy if exists nav_snapshots_write on nav_snapshots;
create policy nav_snapshots_write on nav_snapshots
  for all to service_role using (true) with check (true);
