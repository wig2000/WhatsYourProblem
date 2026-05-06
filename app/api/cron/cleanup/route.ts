import { NextRequest, NextResponse } from 'next/server'
import {
  getExpiredComplaints,
  softDeleteComplaints,
  getExpiredMemes,
  deleteExpiredMemes,
  logLifecycleEvent,
} from '@/lib/db/queries'
import { deleteAssets } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 60

// Vercel Cron: runs nightly at 03:00 UTC
// vercel.json: { "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }] }

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { expiredComplaints: 0, expiredMemes: 0, errors: [] as string[] }

  // 1. Soft-delete expired staging complaints
  try {
    const expired = await getExpiredComplaints()
    if (expired.length > 0) {
      const ids = expired.map(r => r.id)
      results.expiredComplaints = await softDeleteComplaints(ids)
      await logLifecycleEvent({
        eventType: 'ttl_expired',
        targetIds: ids,
        rowCount: results.expiredComplaints,
        notes: 'Nightly TTL cleanup of staging_complaints',
      })
    }
  } catch (err) {
    results.errors.push(`complaints cleanup: ${err instanceof Error ? err.message : err}`)
  }

  // 2. Delete expired staging meme rows + their Blob assets
  try {
    const expired = await getExpiredMemes()
    if (expired.length > 0) {
      const ids = expired.map(r => r.id)
      // Collect all Blob URLs to delete (composite + base image where present)
      const urlsToDelete: string[] = []
      for (const row of expired) {
        if (row.composite_path) urlsToDelete.push(row.composite_path)
        if (row.base_image_path) urlsToDelete.push(row.base_image_path)
      }
      await deleteExpiredMemes(ids)
      if (urlsToDelete.length > 0) await deleteAssets(urlsToDelete)
      results.expiredMemes = ids.length
    }
  } catch (err) {
    results.errors.push(`memes cleanup: ${err instanceof Error ? err.message : err}`)
  }

  return NextResponse.json({ ok: true, ...results })
}
