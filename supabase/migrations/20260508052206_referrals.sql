-- PotBot v2 — 20260508_1_referrals.sql
--
-- Off-chain ledger of every (referrer → referee) attribution. Written
-- when a new member's first deposit confirms. Two tiers:
--   tier 1 = direct referrer
--   tier 2 = referrer's referrer (passive earnings)
-- reward_usdc is the cumulative payout owed; paid_at is set once the
-- payout transaction confirms.
--
-- Replaces the legacy referrals table from 001_initial.sql (referrer/
-- referee shape). The drop makes a from-scratch replay (Supabase preview
-- branches, `db reset`) deterministic; on databases where this version
-- is already recorded the file never re-runs.

drop table if exists referrals cascade;

create table if not exists referrals (
  id              uuid           primary key default gen_random_uuid(),
  referrer_wallet text           not null,
  referred_wallet text           not null,
  pot_pubkey      text           not null,
  tier            integer        not null default 1 check (tier in (1, 2)),
  reward_usdc     numeric(38, 6) not null default 0,
  paid_at         timestamptz,
  created_at      timestamptz    not null default now()
);

create index if not exists referrals_referrer_idx
  on referrals (referrer_wallet);

create index if not exists referrals_pot_pubkey_idx
  on referrals (pot_pubkey);

alter table referrals enable row level security;

drop policy if exists referrals_read on referrals;
create policy referrals_read on referrals
  for select using (true);

drop policy if exists referrals_write on referrals;
create policy referrals_write on referrals
  for all to service_role using (true) with check (true);
