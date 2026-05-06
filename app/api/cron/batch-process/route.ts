import { NextRequest, NextResponse } from 'next/server'
import { runBatchAnalysis } from '@/lib/pipeline/batchAnalysis'

export const runtime = 'nodejs'
export const maxDuration = 300

// Vercel Cron: runs nightly at 02:00 UTC
// vercel.json: { "crons": [{ "path": "/api/cron/batch-process", "schedule": "0 2 * * *" }] }

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const results = await runBatchAnalysis(500)
  const duration = Date.now() - start

  console.log(`[batch-process] done in ${duration}ms:`, results)

  return NextResponse.json({ ok: true, durationMs: duration, ...results })
}
