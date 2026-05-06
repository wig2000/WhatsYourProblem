// Phase 2 + 4: Nightly batch analysis pipeline.
// Reads unprocessed staging complaints → writes to analytics → marks processed.
// Phase 4 extension: semantic clustering via embeddings + LLM taxonomy call.

import {
  getUnprocessedComplaints,
  insertAnalyticsRow,
  markComplaintProcessed,
  logLifecycleEvent,
} from '@/lib/db/queries'

interface StagingRow {
  id: string
  premise: string
  category: string
  secondary_categories: string[]
  sentiment: number
  emotional_register: string
  geo_country: string | null
  geo_region: string | null
  created_at: string
}

export async function runBatchAnalysis(limit = 500): Promise<{
  processed: number
  failed: number
  errors: string[]
}> {
  const rows = (await getUnprocessedComplaints(limit)) as StagingRow[]
  const results = { processed: 0, failed: 0, errors: [] as string[] }

  const processedIds: string[] = []

  for (const row of rows) {
    try {
      const createdDate = new Date(row.created_at).toISOString().split('T')[0]

      await insertAnalyticsRow({
        stagingId:           row.id,
        category:            row.category,
        secondaryCategories: row.secondary_categories ?? [],
        sentiment:           row.sentiment,
        emotionalRegister:   row.emotional_register,
        geoCountry:          row.geo_country,
        geoRegion:           row.geo_region,
        createdDate,
      })

      await markComplaintProcessed(row.id)
      processedIds.push(row.id)
      results.processed++
    } catch (err) {
      results.failed++
      results.errors.push(`${row.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  if (processedIds.length > 0) {
    await logLifecycleEvent({
      eventType: 'batch_processed',
      targetIds: processedIds,
      rowCount: processedIds.length,
      notes: `Nightly batch: ${processedIds.length} complaints moved to analytics`,
    }).catch(console.error)
  }

  return results
}
