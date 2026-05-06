-- B2B dashboard access control.
-- Uses Supabase Auth (auth.users). B2B users are granted a role via this table.

CREATE TABLE IF NOT EXISTS b2b_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'viewer',     -- 'viewer' | 'admin'
  org_name   TEXT,
  plan       TEXT NOT NULL DEFAULT 'trial',      -- 'trial' | 'paid'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_users_email ON b2b_users (email);

-- RLS: analytics are readable only by authenticated b2b_users
ALTER TABLE analytics_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_summary ENABLE ROW LEVEL SECURITY;  -- view inherits

CREATE POLICY "b2b users can read analytics"
  ON analytics_complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM b2b_users
      WHERE b2b_users.user_id = auth.uid()
    )
  );

CREATE POLICY "b2b users can read clusters"
  ON topic_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM b2b_users
      WHERE b2b_users.user_id = auth.uid()
    )
  );

ALTER TABLE topic_clusters ENABLE ROW LEVEL SECURITY;

-- Staging and shared memes: service role only (no RLS needed for API routes using service key)
ALTER TABLE staging_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_lifecycle_audit ENABLE ROW LEVEL SECURITY;

-- Public read for shared memes (anyone with the link can view)
CREATE POLICY "shared memes are publicly readable"
  ON shared_memes FOR SELECT
  USING (true);
