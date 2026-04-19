-- PotBot v2 — Trust / Verification layer
-- Run in Supabase SQL Editor after 001_initial.sql

alter table pots
  add column if not exists trust_level  text        not null default 'unverified',
  add column if not exists verified_at  timestamptz,
  add column if not exists verified_by  text,
  add column if not exists audit_url    text,
  add column if not exists trust_note   text;

create index if not exists pots_trust_level on pots(trust_level);

create table if not exists auditors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  website     text,
  logo_url    text,
  tier        text not null default 'standard',
  created_at  timestamptz not null default now()
);

alter table auditors enable row level security;
drop policy if exists "Public read auditors" on auditors;
create policy "Public read auditors" on auditors for select using (true);
drop policy if exists "Service role all auditors" on auditors;
create policy "Service role all auditors" on auditors for all using (true) with check (true);

update pots set trust_level = 'audited',       verified_at = now(), verified_by = 'PotBot Security Team' where pubkey = 'DEMO1111111111111111111111111111111111111111';
update pots set trust_level = 'community',     verified_at = now(), verified_by = 'Community Review'     where pubkey = 'DEMO2222222222222222222222222222222222222222';
update pots set trust_level = 'institutional', verified_at = now(), verified_by = 'PotBot Security Team' where pubkey = 'DEMO3333333333333333333333333333333333333333';
