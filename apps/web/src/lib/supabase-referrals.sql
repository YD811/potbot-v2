-- ============================================================
-- Migration: referrals table
-- Run in Supabase SQL editor
-- ============================================================

-- referrals: tracks referral attribution when users visit a pot via ?ref= link
create table if not exists referrals (
  id             bigserial primary key,
  pot_pubkey     text         not null,
  referrer_code  text         not null,
  visited_at     timestamptz  default now(),
  unique (pot_pubkey, referrer_code)
);

alter table referrals enable row level security;
create policy "referrals_public_read"  on referrals for select using (true);
create policy "referrals_public_write" on referrals for insert with check (true);
create policy "referrals_public_update" on referrals for update using (true) with check (true);