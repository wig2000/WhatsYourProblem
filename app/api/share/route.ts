import { NextRequest, NextResponse } from 'next/server'
import { getStagingMeme, insertSharedMeme } from '@/lib/db/queries'
import { copyToFinal } from '@/lib/storage'
import { STORAGE_PATHS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { memeId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { memeId } = body
  if (!memeId) return NextResponse.json({ error: 'memeId required' }, { status: 400 })

  const meme = await getStagingMeme(memeId)
  if (!meme) return NextResponse.json({ error: 'Meme not found or expired' }, { status: 404 })

  const shareId = crypto.randomUUID()
  const destPath = STORAGE_PATHS.final(shareId)

  const { url: publicUrl } = await copyToFinal(meme.compositeUrl, destPath)

  const shareDbId = await insertSharedMeme({
    memeId,
    sessionId: meme.sessionId,
    storagePath: destPath,
    publicUrl,
    style: meme.style,
  })

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/meme/${shareDbId}`

  return NextResponse.json({ shareUrl, shareId: shareDbId, publicUrl })
}
