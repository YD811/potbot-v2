create table if not exists public.pot_notifications (
  id uuid primary key default gen_random_uuid(),
  pot_pubkey text not null,
  kind text not null check (kind in ('trade','proposal','member_added','member_removed','strategy_changed')),
  signature text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pot_notifications_pot on public.pot_notifications(pot_pubkey, created_at desc);

alter table public.pot_notifications enable row level security;

create policy "public_read_public_pots" on public.pot_notifications for select using (true);
