-- Build your BAG: user-created recipes (weights over the allowlisted BAG
-- legs), wallets that joined a recipe, and attribution of buys to a recipe.
-- Server-only like the other bag_* tables: RLS on, no anon/authenticated
-- policies. All access goes through API routes with the service role key.

create table if not exists public.bag_recipes (
  slug        text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$'),
  name        text not null check (char_length(name) between 2 and 32),
  creator     text not null,
  -- Whole percents per leg, e.g. {"btc": 50, "ant": 30, "gold": 20}. Sum 100.
  weights     jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists bag_recipes_creator_idx on public.bag_recipes (creator);

-- One recipe per wallet at a time: joining another one moves the wallet.
create table if not exists public.bag_joins (
  wallet      text primary key,
  slug        text not null references public.bag_recipes (slug) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists bag_joins_slug_idx on public.bag_joins (slug);

alter table public.bag_buys add column if not exists bag_slug text;
create index if not exists bag_buys_bag_slug_idx on public.bag_buys (bag_slug) where bag_slug is not null;

alter table public.bag_recipes enable row level security;
alter table public.bag_joins   enable row level security;
