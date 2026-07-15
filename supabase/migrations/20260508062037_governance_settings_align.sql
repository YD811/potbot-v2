-- PotBot v2 — 20260508_6_governance_settings_align.sql
--
-- Schema drift fix for governance_settings. Three forms existed:
--   - 001_initial.sql:  pot_pubkey, require_admin_co_sign
--   - production DB:    pot,        require_admin_co_sign
--   - GovernanceSettings.tsx upsert:
--                       pot_pubkey, require_admin_cosign, cosign_threshold_pct
--
-- The UI write was therefore silently failing (wrong onConflict column,
-- unknown columns), so users would see "saved" but lose every change on
-- reload. This migration aligns the table with what the UI actually
-- writes — no UI code changes required.
--
-- The renames are conditional because they only apply to the old
-- production shape: a fresh replay (Supabase preview branches,
-- `db reset`) starts from 001_initial.sql, where the columns are
-- already named pot_pubkey / (co_sign needs the rename) and `rename
-- column pot` would fail.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'governance_settings' and column_name = 'pot'
  ) then
    alter table governance_settings rename column pot to pot_pubkey;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'governance_settings' and column_name = 'require_admin_co_sign'
  ) then
    alter table governance_settings rename column require_admin_co_sign to require_admin_cosign;
  end if;
end $$;

alter table governance_settings add column if not exists cosign_threshold_pct integer not null default 50;
