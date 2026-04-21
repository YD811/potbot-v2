-- ============================================================
-- Migration: localStorage → Supabase
-- Run in Supabase SQL editor before deploying frontend changes
-- ============================================================

-- governance_settings: per-pot UI governance configuration
-- (stored separately from on-chain GovSettings which holds quorum_bps/timelock)
create table if not exists governance_settings (
  pot_pubkey           text primary key,
  quorum_pct           integer      not null default 33,
  approval_pct         integer      not null default 51,
  voting_window_hours  integer      not null default 48,
  risk_level           text         not null default 'moderate',
  max_swap_pct         integer      not null default 30,
  max_budget_grant_pct integer      not null default 20,
  require_admin_cosign boolean      not null default false,
  cosign_threshold_pct integer      not null default 50,
  updated_at           timestamptz          default now()
);

-- RLS: public read (settings are not secret), public write (anyone can configure their pot)
alter table governance_settings enable row level security;
create policy "gov_public_read"  on governance_settings for select using (true);
create policy "gov_public_write" on governance_settings for insert with check (true);
create policy "gov_public_update" on governance_settings for update using (true) with check (true);

-- ────────────────────────────────────────────────────────────

-- agent_configs: per-pot AI agent configuration (rules, enabled state)
create table if not exists agent_configs (
  pot_pubkey  text primary key,
  config_json jsonb        not null default '{}',
  updated_at  timestamptz          default now()
);

alter table agent_configs enable row level security;
create policy "agent_public_read"   on agent_configs for select using (true);
create policy "agent_public_write"  on agent_configs for insert with check (true);
create policy "agent_public_update" on agent_configs for update using (true) with check (true);

-- ────────────────────────────────────────────────────────────

-- swap_proposal_meta: ephemeral bridge between proposal creation and Jupiter execution
-- Written when a swap proposal is created, read when Execute button is clicked, deleted after execution
create table if not exists swap_proposal_meta (
  proposal_pubkey text primary key,
  input_mint      text        not null,
  output_mint     text        not null,
  amount_lamports bigint      not null,
  input_symbol    text,
  output_symbol   text,
  created_at      timestamptz default now()
);

alter table swap_proposal_meta enable row level security;
create policy "meta_public_read"   on swap_proposal_meta for select using (true);
create policy "meta_service_write" on swap_proposal_meta for all using (auth.role() = 'service_role');

-- Auto-cleanup rows older than 30 days (optional, run as cron)
-- delete from swap_proposal_meta where created_at < now() - interval '30 days';
