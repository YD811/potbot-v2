-- Extend waitlist table with referral/profile fields for the full sign-up form.
-- New columns are optional so existing email-only rows remain valid.
--
-- After this migration, /api/waitlist accepts { email, twitter?, telegram?, solana_wallet? }.

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS twitter        TEXT,
  ADD COLUMN IF NOT EXISTS telegram       TEXT,
  ADD COLUMN IF NOT EXISTS solana_wallet  TEXT,
  ADD COLUMN IF NOT EXISTS referrer_code  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- Lookup index for wallet-based dedup / analytics
CREATE INDEX IF NOT EXISTS waitlist_solana_wallet_idx ON waitlist (solana_wallet)
  WHERE solana_wallet IS NOT NULL;

-- Source values we use going forward
COMMENT ON COLUMN waitlist.source        IS 'landing | signup | telegram | twitter | referral';
COMMENT ON COLUMN waitlist.twitter       IS 'Twitter/X handle (leading @ stripped before store)';
COMMENT ON COLUMN waitlist.telegram      IS 'Telegram username (leading @ stripped before store)';
COMMENT ON COLUMN waitlist.solana_wallet IS 'Solana wallet address (base58, 32 bytes)';
COMMENT ON COLUMN waitlist.referrer_code IS 'Optional invite code / referrer handle';

-- Touch updated_at on UPDATE
CREATE OR REPLACE FUNCTION waitlist_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waitlist_updated_at ON waitlist;
CREATE TRIGGER waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW EXECUTE FUNCTION waitlist_set_updated_at();
