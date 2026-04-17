-- PotBot v2 — Supabase Schema
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- ─────────────────────────────────────────────────────────────
-- price_snapshots — 5-second price history for APY calculations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_snapshots (
  id          bigserial PRIMARY KEY,
  mint        text        NOT NULL,
  price_usd   numeric(20, 8) NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_snapshots_mint_time
  ON price_snapshots (mint, captured_at DESC);

-- auto-delete prices older than 90 days
SELECT cron.schedule(
  'purge-old-prices',
  '0 3 * * *',
  $$DELETE FROM price_snapshots WHERE captured_at < now() - interval '90 days'$$
);

-- ─────────────────────────────────────────────────────────────
-- nav_snapshots — per-vault NAV history (for APY)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nav_snapshots (
  id                    bigserial PRIMARY KEY,
  pot_pubkey            text    NOT NULL,
  nav_usd               numeric(20, 4) NOT NULL,
  total_shares          bigint  NOT NULL,
  sol_balance_lamports  bigint  NOT NULL,
  captured_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nav_snapshots_pot_time
  ON nav_snapshots (pot_pubkey, captured_at DESC);

-- ─────────────────────────────────────────────────────────────
-- positions — token positions per vault
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id            bigserial PRIMARY KEY,
  pot_pubkey    text           NOT NULL,
  mint          text           NOT NULL,
  symbol        text,
  amount        numeric(30, 9) NOT NULL,
  entry_price   numeric(20, 8) NOT NULL,
  entry_value   numeric(20, 4) NOT NULL,
  opened_at     timestamptz    NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  proposal_id   integer,
  entry_tx      text
);
CREATE INDEX IF NOT EXISTS positions_pot_open
  ON positions (pot_pubkey, closed_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS positions_mint
  ON positions (mint);

-- ─────────────────────────────────────────────────────────────
-- swap_executions — every swap attempt with full audit trail
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swap_executions (
  id              bigserial PRIMARY KEY,
  pot_pubkey      text    NOT NULL,
  proposal_id     integer NOT NULL,
  from_mint       text    NOT NULL,
  to_mint         text    NOT NULL,
  amount_in       bigint  NOT NULL,
  min_amount_out  bigint  NOT NULL,
  amount_out      bigint,
  price_impact    numeric(10, 6),
  jupiter_route   jsonb,
  tx_signature    text,
  status          text    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','submitted','confirmed','failed')),
  error           text,
  executed_at     timestamptz NOT NULL DEFAULT now(),
  confirmed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS swap_executions_pot
  ON swap_executions (pot_pubkey, executed_at DESC);
CREATE INDEX IF NOT EXISTS swap_executions_status
  ON swap_executions (status) WHERE status IN ('pending', 'submitted');

-- ─────────────────────────────────────────────────────────────
-- agent_rules — persistent AI agent rules per vault
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_pubkey      text    NOT NULL,
  rule_id         text    NOT NULL,
  name            text    NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  trigger_type    text    NOT NULL,
  trigger_config  jsonb   NOT NULL DEFAULT '{}',
  action_type     text    NOT NULL,
  action_config   jsonb   NOT NULL DEFAULT '{}',
  cooldown_minutes integer NOT NULL DEFAULT 60,
  last_triggered_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pot_pubkey, rule_id)
);
CREATE INDEX IF NOT EXISTS agent_rules_pot
  ON agent_rules (pot_pubkey);

-- ─────────────────────────────────────────────────────────────
-- agent_logs — immutable log of agent actions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_pubkey      text    NOT NULL,
  rule_id         text    NOT NULL,
  rule_name       text    NOT NULL,
  trigger_desc    text    NOT NULL,
  action_desc     text    NOT NULL,
  proposal_created boolean NOT NULL DEFAULT false,
  proposal_id     integer,
  tx_signature    text,
  error           text,
  logged_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_logs_pot_time
  ON agent_logs (pot_pubkey, logged_at DESC);

-- ─────────────────────────────────────────────────────────────
-- members — cached on-chain member data for analytics
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id              bigserial PRIMARY KEY,
  pot_pubkey      text    NOT NULL,
  wallet          text    NOT NULL,
  shares          bigint  NOT NULL DEFAULT 0,
  deposit_total   bigint  NOT NULL DEFAULT 0,
  withdraw_total  bigint  NOT NULL DEFAULT 0,
  joined_at       timestamptz,
  last_deposit_at timestamptz,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pot_pubkey, wallet)
);
CREATE INDEX IF NOT EXISTS members_pot
  ON members (pot_pubkey);

-- ─────────────────────────────────────────────────────────────
-- pots — cached on-chain pot metadata
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pots (
  pubkey              text PRIMARY KEY,
  name                text    NOT NULL,
  emoji               text,
  authority           text    NOT NULL,
  is_public           boolean NOT NULL DEFAULT false,
  member_count        integer NOT NULL DEFAULT 0,
  trade_count         integer NOT NULL DEFAULT 0,
  total_volume        bigint  NOT NULL DEFAULT 0,
  tamagotchi_level    integer NOT NULL DEFAULT 0,
  agent_pubkey        text,
  agent_max_trade_bps integer NOT NULL DEFAULT 0,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — enable for production
-- ─────────────────────────────────────────────────────────────
ALTER TABLE price_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_executions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pots              ENABLE ROW LEVEL SECURITY;

-- Service role has full access (API uses service key)
CREATE POLICY service_all ON price_snapshots  FOR ALL USING (true);
CREATE POLICY service_all ON nav_snapshots    FOR ALL USING (true);
CREATE POLICY service_all ON positions        FOR ALL USING (true);
CREATE POLICY service_all ON swap_executions  FOR ALL USING (true);
CREATE POLICY service_all ON agent_rules      FOR ALL USING (true);
CREATE POLICY service_all ON agent_logs       FOR ALL USING (true);
CREATE POLICY service_all ON members          FOR ALL USING (true);
CREATE POLICY service_all ON pots             FOR ALL USING (true);
