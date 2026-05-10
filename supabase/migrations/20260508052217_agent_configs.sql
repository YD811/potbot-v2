-- PotBot v2 — 20260508_2_agent_configs.sql
--
-- Per-pot AI agent configuration. The UI persists the entire rule set
-- as a single JSONB blob (`config_json`) — see useAIAgent.ts. The
-- agent-poll cron (BLOCK A3) needs three additional columns to:
--
--   - filter pots whose owner has explicitly enabled the off-chain
--     agent (is_active),
--   - skip pots that fired recently and are inside their cooldown
--     window (last_fired_at),
--   - link the most recent on-chain proposal back to the cron run that
--     produced it for debugging (last_proposal_tx).
--
-- governance_mode controls how the agent acts on proposals once it has
-- a vote-share delegation:
--   advisory  → only create proposals; never vote
--   delegate  → vote on its own proposals using AGENT_KEYPAIR's shares

create table if not exists agent_configs (
  pot_pubkey       text        primary key,
  config_json      jsonb       not null default '{}',
  is_active        boolean     not null default false,
  governance_mode  text        not null default 'advisory'
                              check (governance_mode in ('advisory', 'delegate')),
  last_fired_at    timestamptz,
  last_proposal_tx text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists agent_configs_is_active_idx
  on agent_configs (is_active)
  where is_active = true;

create index if not exists agent_configs_updated_at_idx
  on agent_configs (updated_at desc);

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

alter table agent_configs enable row level security;

drop policy if exists agent_configs_read on agent_configs;
create policy agent_configs_read on agent_configs
  for select using (true);

-- Anon write matches the current UI behaviour (useAIAgent.ts uses the
-- anon key). Tighten to `to service_role` once writes are routed
-- through an API route.
drop policy if exists agent_configs_write on agent_configs;
create policy agent_configs_write on agent_configs
  for all using (true) with check (true);
