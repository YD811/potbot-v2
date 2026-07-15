-- Reconstructed from the remote migration history (applied 2026-06-29 via
-- MCP apply_migration during the asset-registry work); committed so the
-- local migrations directory matches supabase_migrations.schema_migrations.

-- Enable RLS on all registry tables.
alter table registry.assets       enable row level security;
alter table registry.asset_pairs  enable row level security;
alter table registry.asset_prices enable row level security;
alter table registry.pots         enable row level security;
alter table registry.pot_assets   enable row level security;

-- Public catalog: anon/authenticated may READ only ENABLED assets & pairs.
-- (Pending/disabled assets stay invisible to clients.) No write policies =>
-- inserts/updates only via the service role key (which bypasses RLS).
drop policy if exists assets_read_enabled on registry.assets;
create policy assets_read_enabled on registry.assets
  for select to anon, authenticated using (enabled = true);

drop policy if exists pairs_read_enabled on registry.asset_pairs;
create policy pairs_read_enabled on registry.asset_pairs
  for select to anon, authenticated using (enabled = true);

-- Prices are public reference data; allow read.
drop policy if exists prices_read on registry.asset_prices;
create policy prices_read on registry.asset_prices
  for select to anon, authenticated using (true);

-- registry.pots / registry.pot_assets: user planning data. No anon/authenticated
-- policies yet => fully locked to the service role until wallet-based auth
-- policies are added. This is the safe default.
