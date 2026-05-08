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

alter table governance_settings rename column pot                    to pot_pubkey;
alter table governance_settings rename column require_admin_co_sign  to require_admin_cosign;
alter table governance_settings add column if not exists cosign_threshold_pct integer not null default 50;
