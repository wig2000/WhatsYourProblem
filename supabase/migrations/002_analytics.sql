-- Permanent analytics layer — populated by nightly batch, never contains PII.
-- Staging data is purged after processing; this layer lives indefinitely.

CREATE TABLE IF NOT EXISTS analytics_complaints (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_id           UUID,                     -- reference only; staging row may be deleted
  category             TEXT NOT NULL,
  secondary_categories TEXT[]    DEFAULT '{}',
  sentiment            REAL      NOT NULL,
  emotional_register   TEXT      NOT NULL,
  geo_country          TEXT,
  geo_region           TEXT,
  week_number          SMALLINT,
  year                 SMALLINT  NOT NULL,
  month                SMALLINT  NOT NULL,
  created_date         DATE      NOT NULL,
  topic_cluster_id     INTEGER,
  processed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_date
  ON analytics_complaints (created_date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_category
  ON analytics_complaints (category, created_date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_geo
  ON analytics_complaints (geo_country, geo_region, created_date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_cluster
  ON analytics_complaints (topic_cluster_id, created_date DESC)
  WHERE topic_cluster_id IS NOT NULL;

-- Semantic topic clusters — populated by Phase 4 BERTopic/LLM batch
CREATE TABLE IF NOT EXISTS topic_clusters (
  id          SERIAL PRIMARY KEY,
  label       TEXT NOT NULL,                     -- e.g. "Delayed public transport"
  description TEXT,
  keywords    TEXT[]    DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log for data lifecycle compliance
CREATE TABLE IF NOT EXISTS data_lifecycle_audit (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,                      -- 'batch_processed' | 'ttl_expired' | 'explicit_delete' | 'consent_withdrawn'
  target_ids UUID[]    NOT NULL DEFAULT '{}',
  row_count  INTEGER   NOT NULL DEFAULT 0,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convenience view for B2B dashboard queries
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT
  created_date,
  category,
  COUNT(*)                   AS complaint_count,
  ROUND(AVG(sentiment)::NUMERIC, 3) AS avg_sentiment,
  geo_country
FROM analytics_complaints
GROUP BY created_date, category, geo_country
ORDER BY created_date DESC;
