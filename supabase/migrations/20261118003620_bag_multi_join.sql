-- A wallet can be in several BAGs: it joins one by signing a message or
-- automatically by buying it. Was: one BAG per wallet (wallet primary key).
alter table public.bag_joins drop constraint if exists bag_joins_pkey;
alter table public.bag_joins add primary key (wallet, slug);
create index if not exists bag_joins_wallet_idx on public.bag_joins (wallet);
