import { sql } from './index'
import type { ParsedComplaint, MemeBrief, MemeStyle } from '@/lib/types'

// ─── Staging complaints ───────────────────────────────────────────────────────

export async function insertStagingComplaint(params: {
  sessionId: string
  parsed: ParsedComplaint
  geoCountry?: string
  geoRegion?: string
  userAgentHash?: string
  consentGiven: boolean
}): Promise<string> {
  const rows = await sql`
    INSERT INTO staging_complaints (
      session_id, premise, category, secondary_categories,
      sentiment, emotional_register,
      geo_country, geo_region, user_agent_hash, consent_given
    ) VALUES (
      ${params.sessionId},
      ${params.parsed.premise},
      ${params.parsed.category},
      ${params.parsed.secondaryCategories},
      ${params.parsed.sentiment},
      ${params.parsed.emotionalRegister},
      ${params.geoCountry ?? null},
      ${params.geoRegion ?? null},
      ${params.userAgentHash ?? null},
      ${params.consentGiven}
    )
    RETURNING id
  `
  return rows[0].id as string
}

export async function markComplaintProcessed(id: string): Promise<void> {
  await sql`
    UPDATE staging_complaints
    SET processed_at = NOW()
    WHERE id = ${id}
  `
}

// ─── Staging memes ────────────────────────────────────────────────────────────

export async function insertStagingMeme(params: {
  sessionId: string
  complaintId: string | null
  style: MemeStyle
  baseImagePath: string | null
  compositePath: string
  compositeUrl: string
  captionText: string
  brief: MemeBrief
}): Promise<string> {
  const rows = await sql`
    INSERT INTO staging_memes (
      session_id, complaint_id, style,
      base_image_path, composite_path, composite_url,
      caption_text, brief
    ) VALUES (
      ${params.sessionId},
      ${params.complaintId},
      ${params.style},
      ${params.baseImagePath},
      ${params.compositePath},
      ${params.compositeUrl},
      ${params.captionText},
      ${JSON.stringify(params.brief)}
    )
    RETURNING id
  `
  return rows[0].id as string
}

export async function getStagingMeme(id: string) {
  const rows = await sql`
    SELECT id, session_id, style, base_image_path, composite_path,
           composite_url, caption_text, brief
    FROM staging_memes
    WHERE id = ${id}
      AND expires_at > NOW()
  `
  if (!rows[0]) return null
  const row = rows[0]
  return {
    id:            row.id as string,
    sessionId:     row.session_id as string,
    style:         row.style as MemeStyle,
    baseImagePath: row.base_image_path as string | null,
    compositePath: row.composite_path as string,
    compositeUrl:  row.composite_url as string,
    captionText:   row.caption_text as string,
    brief:         row.brief as MemeBrief,
  }
}

// ─── Shared memes ─────────────────────────────────────────────────────────────

export async function insertSharedMeme(params: {
  memeId: string
  sessionId: string
  storagePath: string
  publicUrl: string
  style: MemeStyle
}): Promise<string> {
  const rows = await sql`
    INSERT INTO shared_memes (meme_id, session_id, storage_path, public_url, style)
    VALUES (${params.memeId}, ${params.sessionId}, ${params.storagePath}, ${params.publicUrl}, ${params.style})
    RETURNING id
  `
  return rows[0].id as string
}

export async function getSharedMeme(id: string) {
  const rows = await sql`
    SELECT id, meme_id, storage_path, public_url, style, created_at
    FROM shared_memes
    WHERE id = ${id}
  `
  if (!rows[0]) return null
  const row = rows[0]
  return {
    id:          row.id as string,
    memeId:      row.meme_id as string,
    storagePath: row.storage_path as string,
    publicUrl:   row.public_url as string,
    style:       row.style as MemeStyle,
    createdAt:   row.created_at as string,
  }
}

// ─── Cleanup (cron) ───────────────────────────────────────────────────────────

export async function getExpiredComplaints(): Promise<{ id: string }[]> {
  const rows = await sql`
    SELECT id FROM staging_complaints
    WHERE expires_at < NOW()
      AND deleted_at IS NULL
  `
  return rows as unknown as { id: string }[]
}

export async function softDeleteComplaints(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const rows = await sql`
    UPDATE staging_complaints
    SET deleted_at = NOW()
    WHERE id = ANY(${ids})
    RETURNING id
  `
  return rows.length
}

export async function getExpiredMemes(): Promise<{ id: string; composite_path: string; base_image_path: string | null }[]> {
  const rows = await sql`
    SELECT id, composite_path, base_image_path
    FROM staging_memes
    WHERE expires_at < NOW()
  `
  return rows as unknown as { id: string; composite_path: string; base_image_path: string | null }[]
}

export async function deleteExpiredMemes(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await sql`DELETE FROM staging_memes WHERE id = ANY(${ids})`
}

export async function logLifecycleEvent(params: {
  eventType: 'batch_processed' | 'ttl_expired' | 'explicit_delete' | 'consent_withdrawn'
  targetIds: string[]
  rowCount: number
  notes?: string
}): Promise<void> {
  await sql`
    INSERT INTO data_lifecycle_audit (event_type, target_ids, row_count, notes)
    VALUES (${params.eventType}, ${params.targetIds}, ${params.rowCount}, ${params.notes ?? null})
  `
}

// ─── Analytics (batch write) ──────────────────────────────────────────────────

export async function insertAnalyticsRow(params: {
  stagingId: string
  category: string
  secondaryCategories: string[]
  sentiment: number
  emotionalRegister: string
  geoCountry: string | null
  geoRegion: string | null
  createdDate: string
}): Promise<void> {
  const d = new Date(params.createdDate)
  await sql`
    INSERT INTO analytics_complaints (
      staging_id, category, secondary_categories, sentiment, emotional_register,
      geo_country, geo_region, week_number, year, month, created_date
    ) VALUES (
      ${params.stagingId},
      ${params.category},
      ${params.secondaryCategories},
      ${params.sentiment},
      ${params.emotionalRegister},
      ${params.geoCountry},
      ${params.geoRegion},
      ${getISOWeek(d)},
      ${d.getFullYear()},
      ${d.getMonth() + 1},
      ${params.createdDate}
    )
  `
}

// ─── B2B dashboard queries ────────────────────────────────────────────────────

export async function getDailySummary(days = 30) {
  return sql`
    SELECT created_date, category, complaint_count, avg_sentiment, geo_country
    FROM analytics_daily_summary
    WHERE created_date >= CURRENT_DATE - ${days}::integer
    ORDER BY created_date DESC, complaint_count DESC
  `
}

export async function getCategoryBreakdown(days = 30) {
  return sql`
    SELECT
      category,
      COUNT(*)                                AS count,
      ROUND(AVG(sentiment)::NUMERIC, 3)       AS avg_sentiment
    FROM analytics_complaints
    WHERE created_date >= CURRENT_DATE - ${days}::integer
    GROUP BY category
    ORDER BY count DESC
  `
}

export async function getTrendTimeSeries(category?: string, days = 90) {
  if (category) {
    return sql`
      SELECT
        created_date,
        COUNT(*) AS count,
        ROUND(AVG(sentiment)::NUMERIC, 3) AS avg_sentiment
      FROM analytics_complaints
      WHERE created_date >= CURRENT_DATE - ${days}::integer
        AND category = ${category}
      GROUP BY created_date
      ORDER BY created_date ASC
    `
  }
  return sql`
    SELECT
      created_date,
      COUNT(*) AS count,
      ROUND(AVG(sentiment)::NUMERIC, 3) AS avg_sentiment
    FROM analytics_complaints
    WHERE created_date >= CURRENT_DATE - ${days}::integer
    GROUP BY created_date
    ORDER BY created_date ASC
  `
}

export async function getUnprocessedComplaints(limit = 500) {
  return sql`
    SELECT id, premise, category, secondary_categories, sentiment,
           emotional_register, geo_country, geo_region, created_at
    FROM staging_complaints
    WHERE processed_at IS NULL
      AND deleted_at IS NULL
      AND consent_given = TRUE
    ORDER BY created_at ASC
    LIMIT ${limit}
  `
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
