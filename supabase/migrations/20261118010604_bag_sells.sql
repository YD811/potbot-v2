-- Sells made through potbot.fun/bag are recorded next to buys.
-- side = 'buy': usdc_in is USDC paid. side = 'sell': usdc_in is USDC received.
-- BAG volume counts both; points count buys only.
alter table public.bag_buys add column if not exists side text not null default 'buy' check (side in ('buy', 'sell'));
create index if not exists bag_buys_side_idx on public.bag_buys (side);
