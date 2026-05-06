-- Staging layer: holds PII-stripped complaints for ~30 days, then purged.
-- Raw complaint text is NEVER stored.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS staging_complaints (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID NOT NULL,
  premise              TEXT NOT NULL,           -- PII-stripped meme premise
  category             TEXT NOT NULL,
  secondary_categories TEXT[]    DEFAULT '{}',
  sentiment            REAL      NOT NULL,       -- -1.0 to 1.0
  emotional_register   TEXT      NOT NULL,
  geo_country          TEXT,
  geo_region           TEXT,
  user_agent_hash      TEXT,                     -- SHA-256 of raw UA, not the UA itself
  consent_given        BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  processed_at         TIMESTAMPTZ,              -- set by nightly batch when analysed
  deleted_at           TIMESTAMPTZ               -- soft delete; hard delete runs in cleanup cron
);

-- TTL index so cleanup cron can target expired rows efficiently
CREATE INDEX IF NOT EXISTS idx_staging_complaints_expires_at
  ON staging_complaints (expires_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staging_complaints_session
  ON staging_complaints (session_id);

CREATE INDEX IF NOT EXISTS idx_staging_complaints_unprocessed
  ON staging_complaints (created_at)
  WHERE processed_at IS NULL AND deleted_at IS NULL;

-- Meme assets generated per session (expires with session)
CREATE TABLE IF NOT EXISTS staging_memes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL,
  complaint_id    UUID REFERENCES staging_complaints(id) ON DELETE SET NULL,
  style           TEXT NOT NULL,
  base_image_path TEXT,                          -- Supabase storage path; NULL for text-only
  composite_path  TEXT NOT NULL,                 -- Supabase storage path
  composite_url   TEXT NOT NULL,                 -- public URL
  caption_text    TEXT NOT NULL,
  brief           JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_staging_memes_session
  ON staging_memes (session_id);

CREATE INDEX IF NOT EXISTS idx_staging_memes_expires_at
  ON staging_memes (expires_at);

-- Permanently shared memes (no expiry)
CREATE TABLE IF NOT EXISTS shared_memes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id      UUID REFERENCES staging_memes(id) ON DELETE SET NULL,
  session_id   UUID,
  storage_path TEXT NOT NULL,
  public_url   TEXT NOT NULL,
  style        TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_memes_created_at
  ON shared_memes (created_at DESC);
