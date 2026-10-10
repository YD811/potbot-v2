-- POTfolio NAV history (pot_index program).
--
-- One row per (index mint, time). Written by /api/cron/potfolio-nav every 15 minutes and by
-- POST /api/pot-index/nav when a page is opened and the last row is older than 10 minutes.
-- The server computes every value itself from the chain + Hermes; the request only names a mint.

create table if not exists potfolio_nav (
  id              bigint generated always as identity primary key,
  mint            text          not null,
  nav_usd         numeric(20,6) not null,
  supply          numeric(20,6) not null,
  price_usd       numeric(20,8) not null,
  cash_usd        numeric(20,6) not null,
  legs_usd        jsonb         not null default '[]',
  snapshotted_at  timestamptz   not null default now()
);

create index if not exists potfolio_nav_mint_time_idx on potfolio_nav (mint, snapshotted_at desc);

alter table potfolio_nav enable row level security;

drop policy if exists potfolio_nav_read on potfolio_nav;
create policy potfolio_nav_read on potfolio_nav for select using (true);

drop policy if exists potfolio_nav_write on potfolio_nav;
create policy potfolio_nav_write on potfolio_nav for all to service_role using (true) with check (true);
