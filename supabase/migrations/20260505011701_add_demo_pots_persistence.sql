-- demo_pots: stores pots created via the mock/demo UI so they persist across sessions
-- Judges who create a new pot will see it on everyone else's screen too.
create table if not exists public.demo_pots (
  pubkey        text primary key,
  name          text not null,
  emoji         text not null default '🪴',
  balance       numeric not null default 0,
  member_count  int not null default 0,
  trade_count   int not null default 0,
  total_volume numeric not null default 0,
  is_public     boolean not null default true,
  yield_strategy int not null default 0,
  authority     text not null default '',
  created_at    timestamptz not null default now()
);

-- Allow public read (anon key)
alter table public.demo_pots enable row level security;
create policy "public read demo_pots"
  on public.demo_pots for select to anon using (true);
create policy "public insert demo_pots"
  on public.demo_pots for insert to anon with check (true);
create policy "public update demo_pots"
  on public.demo_pots for update to anon using (true);

-- Seed the 7 canonical demo pots so every fresh visitor sees them
insert into public.demo_pots (pubkey, name, emoji, balance, member_count, trade_count, total_volume, is_public, yield_strategy, authority)
values
  ('DemoPoT1111111111111111111111111111111111111', 'Diamond Hands DAO', '💎', 42.5, 5, 12, 156.3, true, 2, 'SeedAuth1111111111111111111111111111111111'),
  ('DemoPoT2222222222222222222222222222222222222', 'Degen Squad',       '🐸',  8.2, 3, 28, 310.7, true, 3, 'SeedAuth2222222222222222222222222222222222'),
  ('DemoPoT3333333333333333333333333333333333333', 'Safe Stack',        '🛡️', 125.0, 8, 4,  45.2,false, 1, 'SeedAuth3333333333333333333333333333333333'),
  ('DemoPoT4444444444444444444444444444444444444', 'Alpha Hunters',     '🦅', 87.3,11, 47, 892.4, true, 2, 'SeedAuth4444444444444444444444444444444444'),
  ('DemoPoT5555555555555555555555555555555555555', 'Moon Frogs',        '🌙', 19.8, 4, 63, 445.1, true, 3, 'SeedAuth5555555555555555555555555555555555'),
  ('DemoPoT6666666666666666666666666666666666666', 'Yield Farmers',     '🌾',210.0,15,  8,  67.5, true, 1, 'SeedAuth6666666666666666666666666666666666'),
  ('DemoPoT7777777777777777777777777777777777777', 'JLP Hedged Vault',  '⚡', 48.0, 7, 22, 384.5, true, 4, 'SeedAuth7777777777777777777777777777777777')
on conflict (pubkey) do nothing;
