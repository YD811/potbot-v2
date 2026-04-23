-- PotBot v2 — Migration 005
-- Two tables that the web app already writes/reads but which weren't
-- present in earlier migrations. Without these, on-chain interactions
-- degrade silently:
--   - agent_configs     → AI agent panel / admin page can't persist rules
--   - swap_proposal_meta → proposal detail route returns 404 for the
--                           tokens/amount fields (only the on-chain
--                           proposal account is available, which doesn't
--                           store human-readable mints/symbols)

-- ─────────────────────────────────────────────────────────────
-- agent_configs — per-pot AI agent rule configuration
-- ─────────────────────────────────────────────────────────────
-- Written by: apps/web/src/hooks/useAIAgent.ts
-- Read by:    apps/web/src/app/admin/page.tsx, useAIAgent.ts
create table if not exists agent_configs (
  pot_pubkey   text primary key,
  config_json  jsonb       not null,
  updated_at   timestamptz not null default now()
);

create index if not exists agent_configs_updated_at_idx
  on agent_configs (updated_at desc);

-- Auto-update `updated_at` on any row change (defensive —
-- the web app already sets it, but jsonb edits outside the UI
-- should update the timestamp too).
create or replace function agent_configs_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists agent_configs_touch on agent_configs;
create trigger agent_configs_touch
  before update on agent_configs
  for each row execute function agent_configs_touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- swap_proposal_meta — off-chain enrichment for swap proposals
-- ─────────────────────────────────────────────────────────────
-- The on-chain Proposal account stores kind/authority/votes but not the
-- human-facing "swap X USDC → SOL" description. This table caches that
-- information so proposal detail pages render immediately.
--
-- Written by: apps/web/src/app/api/proposals/[pubkey]/meta/route.ts
-- Read by:    same route (GET handler)
create table if not exists swap_proposal_meta (
  proposal_pubkey  text primary key,
  input_mint       text        not null,
  output_mint      text        not null,
  amount_lamports  numeric     not null,
  input_symbol     text,
  output_symbol    text,
  created_at       timestamptz not null default now()
);

create index if not exists swap_proposal_meta_created_at_idx
  on swap_proposal_meta (created_at desc);

create index if not exists swap_proposal_meta_input_mint_idx
  on swap_proposal_meta (input_mint);

create index if not exists swap_proposal_meta_output_mint_idx
  on swap_proposal_meta (output_mint);


-- ─────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────
-- Default Supabase setup uses the service-role key server-side and the
-- anon key client-side. We want:
--   - Everyone (anon + authenticated) can READ agent_configs and
--     swap_proposal_meta (the data is public anyway — derived from
--     on-chain accounts).
--   - Only service_role can INSERT/UPDATE/DELETE. Client code in
--     useAIAgent.ts currently writes with the anon key — if you want
--     to lock that down, flip this flag and route those writes through
--     an API route using createServerSupabase() instead.
alter table agent_configs     enable row level security;
alter table swap_proposal_meta enable row level security;

-- Public read
drop policy if exists agent_configs_read on agent_configs;
create policy agent_configs_read on agent_configs
  for select using (true);

drop policy if exists swap_proposal_meta_read on swap_proposal_meta;
create policy swap_proposal_meta_read on swap_proposal_meta
  for select using (true);

-- Anon write (MATCHES CURRENT APP BEHAVIOUR). To tighten:
-- replace `using (true)` with `using (auth.role() = 'service_role')`
-- AFTER rerouting the web writes through an API route.
drop policy if exists agent_configs_write on agent_configs;
create policy agent_configs_write on agent_configs
  for all using (true) with check (true);

drop policy if exists swap_proposal_meta_write on swap_proposal_meta;
create policy swap_proposal_meta_write on swap_proposal_meta
  for all using (true) with check (true);
