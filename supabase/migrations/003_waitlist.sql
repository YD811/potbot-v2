-- Waitlist for PotBot mainnet early access
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  source     TEXT DEFAULT 'landing',       -- landing | telegram | twitter
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for deduplication queries
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);

-- RLS: only service role can read
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON waitlist;
CREATE POLICY "Service role full access"
  ON waitlist FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anyone can insert (no auth required for signup)
DROP POLICY IF EXISTS "Public insert" ON waitlist;
CREATE POLICY "Public insert"
  ON waitlist FOR INSERT
  WITH CHECK (true);
