-- PotBot PnL tracking schema for Supabase
-- Run: supabase db push (or paste into Supabase SQL editor)

-- ─── Deposit price snapshots ───────────────────────────────────────────────────
-- Stores SOL/USD price at the time of each deposit.
-- Written by a server-side webhook (or Next.js API route) when deposit tx is detected.
CREATE TABLE IF NOT EXISTS deposit_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  pot_pubkey      TEXT NOT NULL,
  member_pubkey   TEXT NOT NULL,
  tx_signature    TEXT UNIQUE NOT NULL,
  lamports        BIGINT NOT NULL,          -- deposit amount
  sol_usd_price   NUMERIC(18, 6) NOT NULL,  -- SOL/USD at time of deposit
  entry_usd       NUMERIC(18, 6) NOT NULL,  -- lamports * sol_usd_price / 1e9
  deposited_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_deposit_snapshots_member ON deposit_snapshots(member_pubkey);
CREATE INDEX idx_deposit_snapshots_pot    ON deposit_snapshots(pot_pubkey);

-- ─── Daily NAV snapshots ──────────────────────────────────────────────────────
-- Written by a daily cron job (Supabase Edge Function or GitHub Action).
CREATE TABLE IF NOT EXISTS pot_nav_daily (
  id              BIGSERIAL PRIMARY KEY,
  pot_pubkey      TEXT NOT NULL,
  date            DATE NOT NULL,
  vault_lamports  BIGINT NOT NULL,
  total_shares    BIGINT NOT NULL,
  sol_usd_price   NUMERIC(18, 6) NOT NULL,
  nav_per_share_sol NUMERIC(18, 9) NOT NULL,
  nav_per_share_usd NUMERIC(18, 6) NOT NULL,
  member_count    INT NOT NULL,
  trade_count     INT NOT NULL,
  recorded_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pot_pubkey, date)
);
CREATE INDEX idx_nav_daily_pot ON pot_nav_daily(pot_pubkey, date DESC);

-- ─── Member PnL cache ─────────────────────────────────────────────────────────
-- Updated by API route on-demand or by background job.
CREATE TABLE IF NOT EXISTS member_pnl_cache (
  id                      BIGSERIAL PRIMARY KEY,
  member_pubkey           TEXT NOT NULL,
  pot_pubkey              TEXT NOT NULL,
  current_value_sol       NUMERIC(18, 9),
  current_value_usd       NUMERIC(18, 6),
  net_deposited_sol       NUMERIC(18, 9),
  pnl_sol                 NUMERIC(18, 9),
  pnl_usd                 NUMERIC(18, 6),
  pnl_pct                 NUMERIC(8, 4),
  avg_entry_usd           NUMERIC(18, 6),
  sol_usd_price           NUMERIC(18, 6),
  calculated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_pubkey, pot_pubkey)
);
CREATE INDEX idx_pnl_cache_member ON member_pnl_cache(member_pubkey);

-- ─── Helper view: member total portfolio PnL ─────────────────────────────────
CREATE OR REPLACE VIEW member_total_pnl AS
  SELECT
    member_pubkey,
    SUM(current_value_sol) AS total_value_sol,
    SUM(current_value_usd) AS total_value_usd,
    SUM(net_deposited_sol) AS total_deposited_sol,
    SUM(pnl_sol)           AS total_pnl_sol,
    SUM(pnl_usd)           AS total_pnl_usd,
    CASE WHEN SUM(net_deposited_sol) > 0
      THEN (SUM(pnl_sol) / SUM(net_deposited_sol)) * 100
      ELSE 0
    END AS total_pnl_pct,
    MAX(calculated_at)     AS last_updated
  FROM member_pnl_cache
  GROUP BY member_pubkey;

-- ─── RLS policies ─────────────────────────────────────────────────────────────
ALTER TABLE deposit_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_nav_daily        ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_pnl_cache     ENABLE ROW LEVEL SECURITY;

-- Public read for leaderboard/analytics
CREATE POLICY "public read deposit_snapshots"
  ON deposit_snapshots FOR SELECT USING (true);

CREATE POLICY "public read pot_nav_daily"
  ON pot_nav_daily FOR SELECT USING (true);

CREATE POLICY "public read member_pnl_cache"
  ON member_pnl_cache FOR SELECT USING (true);

-- Service role writes only (no direct client writes)
CREATE POLICY "service write deposit_snapshots"
  ON deposit_snapshots FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service write pot_nav_daily"
  ON pot_nav_daily FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service upsert member_pnl_cache"
  ON member_pnl_cache FOR ALL
  USING (auth.role() = 'service_role');
