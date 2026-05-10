-- PotBot v2 — 20260508_4_swap_executions.sql
--
-- Off-chain index of every executed swap. Written by the Helius webhook
-- (BLOCK A1) when an `executeSwap` transaction is confirmed. Lets the
-- UI render trade history without re-fetching every signature on every
-- page view, and lets the analytics route compute realised PnL from
-- entry/exit rows without depending on Helius for back-fills.
--
-- All on-chain bytes are validated by the webhook BEFORE insert — the
-- webhook checks the program id and account discriminator on the swap
-- log and only inserts if both match. Never trust raw webhook input.

create table if not exists swap_executions (
  id              uuid        primary key default gen_random_uuid(),
  pot_pubkey      text        not null,
  proposal_pubkey text,
  input_mint      text        not null,
  output_mint     text        not null,
  input_amount    numeric(38, 0) not null,
  output_amount   numeric(38, 0),
  tx_signature    text        not null unique,
  slot            bigint,
  price_at_exec   numeric(38, 8),
  executed_at     timestamptz not null default now()
);

create index if not exists swap_executions_pot_idx
  on swap_executions (pot_pubkey, executed_at desc);

create index if not exists swap_executions_proposal_idx
  on swap_executions (proposal_pubkey)
  where proposal_pubkey is not null;

-- Public read (data is derived from the on-chain log anyway). Writes
-- restricted to the service role used by the webhook handler.
alter table swap_executions enable row level security;

drop policy if exists swap_executions_read on swap_executions;
create policy swap_executions_read on swap_executions
  for select using (true);

drop policy if exists swap_executions_write on swap_executions;
create policy swap_executions_write on swap_executions
  for all to service_role using (true) with check (true);
