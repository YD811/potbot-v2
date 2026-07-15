-- Reconstructed from the remote migration history (applied 2026-06-29 via
-- MCP apply_migration during the asset-registry work); committed so the
-- local migrations directory matches supabase_migrations.schema_migrations.

create schema if not exists registry;
create extension if not exists "pgcrypto";

create table if not exists registry.assets (
  id                  uuid primary key default gen_random_uuid(),
  chain               text not null default 'solana',
  mint                text unique,
  symbol              text not null,
  name                text,
  category            text not null,
  decimals            int  not null,
  logo_url            text,
  coingecko_id        text,
  enabled             boolean not null default false,
  verified            boolean not null default false,
  is_stable           boolean not null default false,
  is_lst              boolean not null default false,
  is_xstock           boolean not null default false,
  is_rwa              boolean not null default false,
  risk_tier           int  not null default 5,
  liquidity_score     int  not null default 0,
  volatility_score    int  not null default 0,
  max_pot_weight_bps  int  not null default 2500,
  max_user_deposit_usd numeric not null default 10000,
  price_source        text not null default 'jupiter',
  oracle_source       text,
  pyth_price_account  text,
  supports_swap       boolean not null default true,
  supports_lp         boolean not null default false,
  supports_lending    boolean not null default false,
  supports_nav        boolean not null default true,
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint assets_category_chk check (category in ('sol_lst','stablecoin','xstock','blue_chip','defi','ai','infrastructure','meme','rwa','yield')),
  constraint assets_risk_tier_chk check (risk_tier between 1 and 5),
  constraint assets_weight_chk    check (max_pot_weight_bps between 1 and 10000),
  constraint assets_enable_requires_verified_mint check (enabled = false or (verified = true and mint is not null))
);
create index if not exists assets_category_idx on registry.assets (category);
create index if not exists assets_enabled_idx  on registry.assets (enabled) where enabled = true;

create table if not exists registry.asset_pairs (
  id                 uuid primary key default gen_random_uuid(),
  base_asset_id      uuid not null references registry.assets(id) on delete cascade,
  quote_asset_id     uuid not null references registry.assets(id) on delete cascade,
  dex                text not null,
  pool_address       text,
  pool_type          text,
  enabled            boolean not null default false,
  supports_deposit   boolean not null default true,
  supports_withdraw  boolean not null default true,
  supports_rebalance boolean not null default true,
  min_liquidity_usd  numeric not null default 0,
  fee_bps            int,
  metadata           jsonb not null default '{}',
  constraint asset_pairs_dex_chk check (dex in ('meteora','raydium','orca','jupiter')),
  constraint asset_pairs_distinct check (base_asset_id <> quote_asset_id),
  unique (base_asset_id, quote_asset_id, dex, pool_address)
);

create table if not exists registry.asset_prices (
  id          bigserial primary key,
  asset_id    uuid not null references registry.assets(id) on delete cascade,
  price_usd   numeric not null,
  source      text not null,
  confidence  numeric,
  fetched_at  timestamptz not null default now()
);
create index if not exists asset_prices_asset_time_idx on registry.asset_prices (asset_id, fetched_at desc);

create table if not exists registry.pots (
  id              uuid primary key default gen_random_uuid(),
  creator_wallet  text not null,
  name            text not null,
  share_mint      text,
  status          text not null default 'draft',
  max_assets      int  not null default 10,
  nav_usd         numeric not null default 0,
  created_at      timestamptz not null default now(),
  constraint pots_status_chk check (status in ('draft','active','paused','closed')),
  constraint pots_max_assets_chk check (max_assets between 1 and 10)
);

create table if not exists registry.pot_assets (
  pot_id              uuid not null references registry.pots(id) on delete cascade,
  asset_id            uuid not null references registry.assets(id),
  target_weight_bps   int  not null,
  current_amount      numeric not null default 0,
  current_value_usd   numeric not null default 0,
  primary_lp_pair_id  uuid references registry.asset_pairs(id),
  primary_strategy    text not null default 'hold',
  primary key (pot_id, asset_id),
  constraint pot_assets_weight_chk check (target_weight_bps between 1 and 10000),
  constraint pot_assets_strategy_chk check (primary_strategy in ('hold','lp','lend'))
);

create or replace function registry.check_pot_asset() returns trigger as $$
declare a registry.assets%rowtype;
begin
  select * into a from registry.assets where id = NEW.asset_id;
  if not found then raise exception 'asset % not found', NEW.asset_id; end if;
  if a.enabled is not true or a.verified is not true or a.mint is null then
    raise exception 'asset % (%) is not addable (enabled/verified/mint)', a.symbol, a.id;
  end if;
  if NEW.target_weight_bps > a.max_pot_weight_bps then
    raise exception 'weight % exceeds cap % for %', NEW.target_weight_bps, a.max_pot_weight_bps, a.symbol;
  end if;
  return NEW;
end; $$ language plpgsql;

drop trigger if exists trg_check_pot_asset on registry.pot_assets;
create trigger trg_check_pot_asset before insert or update on registry.pot_assets
  for each row execute function registry.check_pot_asset();

create or replace function registry.check_pot_weights() returns trigger as $$
declare total int; cnt int; pid uuid; st text;
begin
  pid := coalesce(NEW.pot_id, OLD.pot_id);
  select coalesce(sum(target_weight_bps),0), count(*) into total, cnt from registry.pot_assets where pot_id = pid;
  if cnt > 10 then raise exception 'pot % exceeds 10 assets', pid; end if;
  select status into st from registry.pots where id = pid;
  if st = 'active' and total <> 10000 then
    raise exception 'pot % weights must sum to 10000 bps (got %)', pid, total;
  end if;
  return NEW;
end; $$ language plpgsql;

drop trigger if exists trg_check_pot_weights on registry.pot_assets;
create trigger trg_check_pot_weights after insert or update or delete on registry.pot_assets
  for each row execute function registry.check_pot_weights();
