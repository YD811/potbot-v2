-- PotBot v2 — 20260508_3_votes.sql
--
-- Off-chain index of every vote cast. The on-chain VoterRecord PDA
-- already enforces uniqueness per (proposal, voter) but reading every
-- record by program account scan is slow — this table caches votes for
-- fast UI tallies and lets analytics join against `pot_pubkey` without
-- re-resolving the proposal first.
--
-- Written by: Helius webhook on `vote` instruction confirmation
-- Read by:    proposal detail page, governance dashboard

create table if not exists votes (
  id              uuid           primary key default gen_random_uuid(),
  proposal_pubkey text           not null,
  pot_pubkey      text           not null,
  voter_wallet    text           not null,
  vote            boolean        not null,
  shares_at_vote  numeric(38, 0) not null default 0,
  tx_signature    text,
  voted_at        timestamptz    not null default now(),
  unique (proposal_pubkey, voter_wallet)
);

create index if not exists votes_proposal_idx on votes (proposal_pubkey);
create index if not exists votes_pot_idx      on votes (pot_pubkey);
create index if not exists votes_voter_idx    on votes (voter_wallet);

alter table votes enable row level security;

drop policy if exists votes_read on votes;
create policy votes_read on votes
  for select using (true);

drop policy if exists votes_write on votes;
create policy votes_write on votes
  for all to service_role using (true) with check (true);
