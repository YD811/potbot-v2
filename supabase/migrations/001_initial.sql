-- PotBot v2 — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- POTS
-- ─────────────────────────────────────────
create table if not exists pots (
  pubkey            text primary key,
  name              text not null,
  emoji             text not null default '🪴',
  authority         text not null,
  balance           numeric not null default 0,
  total_shares      numeric not null default 0,
  member_count      int not null default 0,
  trade_count       int not null default 0,
  total_volume      numeric not null default 0,
  is_public         boolean not null default true,
  yield_strategy    int not null default 0,
  governance_level  int not null default 1,
  next_proposal_id  int not null default 0,
  tamagotchi_emoji  text not null default '🥚',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists members (
  id            uuid primary key default gen_random_uuid(),
  pot_pubkey    text not null references pots(pubkey) on delete cascade,
  wallet        text not null,
  shares        numeric not null default 0,
  deposit_total numeric not null default 0,
  joined_at     timestamptz not null default now(),
  unique(pot_pubkey, wallet)
);

create table if not exists proposals (
  pubkey                  text primary key,
  pot_pubkey              text not null references pots(pubkey) on delete cascade,
  proposal_id             int not null,
  type                    text not null default 'swap',
  description             text,
  status                  text not null default 'active',
  yes_shares              numeric not null default 0,
  no_shares               numeric not null default 0,
  total_shares_snapshot   numeric not null default 0,
  proposer                text,
  entry_price             numeric,
  created_at              timestamptz not null default now(),
  expires_at              timestamptz,
  executed_at             timestamptz
);

create table if not exists votes (
  id               uuid primary key default gen_random_uuid(),
  proposal_pubkey  text not null references proposals(pubkey) on delete cascade,
  voter            text not null,
  approve          boolean not null,
  shares           numeric not null default 0,
  voted_at         timestamptz not null default now(),
  unique(proposal_pubkey, voter)
);

create table if not exists referrals (
  id              uuid primary key default gen_random_uuid(),
  pot_pubkey      text not null references pots(pubkey) on delete cascade,
  referrer        text not null,
  parent_referrer text not null default '',
  referee         text not null,
  deposit_amount  numeric not null default 0,
  level1_earning  numeric not null default 0,
  level2_earning  numeric not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists agent_rules (
  id                  uuid primary key default gen_random_uuid(),
  pot_pubkey          text not null references pots(pubkey) on delete cascade,
  rule_id             text not null,
  name                text not null,
  enabled             boolean not null default true,
  trigger_type        text not null,
  trigger_threshold   numeric,
  trigger_interval    int,
  action_type         text not null,
  action_amount       numeric not null default 0,
  action_token        text not null default 'SOL',
  cooldown_minutes    int not null default 60,
  last_triggered_at   timestamptz,
  created_at          timestamptz not null default now(),
  unique(pot_pubkey, rule_id)
);

create table if not exists price_history (
  id           uuid primary key default gen_random_uuid(),
  token        text not null default 'SOL',
  price        numeric not null,
  recorded_at  timestamptz not null default now()
);

create index if not exists price_history_token_time
  on price_history(token, recorded_at desc);

create table if not exists governance_settings (
  pot_pubkey              text primary key references pots(pubkey) on delete cascade,
  quorum_pct              int not null default 51,
  approval_pct            int not null default 60,
  voting_window_hours     int not null default 24,
  risk_level              text not null default 'medium',
  max_swap_pct            int not null default 20,
  max_budget_grant_pct    int not null default 10,
  require_admin_co_sign   boolean not null default false,
  updated_at              timestamptz not null default now()
);

-- RLS
alter table pots               enable row level security;
alter table members            enable row level security;
alter table proposals          enable row level security;
alter table votes              enable row level security;
alter table referrals          enable row level security;
alter table agent_rules        enable row level security;
alter table price_history      enable row level security;
alter table governance_settings enable row level security;

create policy "Public read pots"               on pots               for select using (true);
create policy "Public read members"            on members            for select using (true);
create policy "Public read proposals"          on proposals          for select using (true);
create policy "Public read votes"              on votes              for select using (true);
create policy "Public read price_history"      on price_history      for select using (true);
create policy "Public read governance"         on governance_settings for select using (true);
create policy "Public read agent_rules"        on agent_rules        for select using (true);
create policy "Public read referrals"          on referrals          for select using (true);

create policy "Service role all pots"          on pots               for all using (true) with check (true);
create policy "Service role all members"       on members            for all using (true) with check (true);
create policy "Service role all proposals"     on proposals          for all using (true) with check (true);
create policy "Service role all votes"         on votes              for all using (true) with check (true);
create policy "Service role all price_history" on price_history      for all using (true) with check (true);
create policy "Service role all governance"    on governance_settings for all using (true) with check (true);
create policy "Service role all agent_rules"   on agent_rules        for all using (true) with check (true);
create policy "Service role all referrals"     on referrals          for all using (true) with check (true);

-- Seed demo pots
insert into pots (pubkey, name, emoji, authority, balance, total_shares, member_count, trade_count, total_volume, is_public, yield_strategy, governance_level, next_proposal_id, tamagotchi_emoji)
values
  ('DEMO1111111111111111111111111111111111111111', 'Alpha Wolves', '🐺', 'DEMO_AUTHORITY', 42.5, 1000, 8, 23, 310.2, true, 2, 2, 3, '🌱'),
  ('DEMO2222222222222222222222222222222222222222', 'Moon Chasers', '🌙', 'DEMO_AUTHORITY', 18.3, 500, 4, 11, 95.7, true, 1, 1, 2, '🥚'),
  ('DEMO3333333333333333333333333333333333333333', 'DeFi DAO', '🏛️', 'DEMO_AUTHORITY', 75.0, 2000, 15, 47, 890.4, true, 3, 3, 5, '🌿')
on conflict (pubkey) do nothing;

-- updated_at triggers
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pots_updated_at
  before update on pots
  for each row execute function update_updated_at();

create trigger governance_updated_at
  before update on governance_settings
  for each row execute function update_updated_at();
