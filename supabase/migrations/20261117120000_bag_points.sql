-- BAG (Bitcoin · Anthropic · Gold) beta: buys made through potbot.fun/bag,
-- referrals and daily hold snapshots for the BAG Points programme.
-- Server-only: RLS on, no anon/authenticated policies. Writes and reads go
-- through API routes with the service role key.

create table if not exists public.bag_buys (
  signature    text primary key,
  wallet       text not null,
  leg          text not null check (leg in ('btc', 'ant', 'gold')),
  output_mint  text not null,
  usdc_in      numeric(20, 6) not null check (usdc_in > 0),
  out_amount   numeric(38, 0) not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists bag_buys_wallet_idx on public.bag_buys (wallet, created_at);

create table if not exists public.bag_referrals (
  wallet      text primary key,
  referrer    text not null,
  created_at  timestamptz not null default now(),
  check (wallet <> referrer)
);
create index if not exists bag_referrals_referrer_idx on public.bag_referrals (referrer);

create table if not exists public.bag_hold_snapshots (
  wallet        text not null,
  day           date not null,
  held_usd      numeric(20, 2) not null,
  eligible_usd  numeric(20, 2) not null,
  full_bag      boolean not null default false,
  points        numeric(20, 2) not null,
  primary key (wallet, day)
);

alter table public.bag_buys           enable row level security;
alter table public.bag_referrals      enable row level security;
alter table public.bag_hold_snapshots enable row level security;
