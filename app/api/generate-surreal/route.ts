import { NextRequest } from 'next/server'
import { generateSurrealImage } from '@/lib/imageGen'
import { compositeGeneratedMeme } from '@/lib/compositing'
import { uploadMemeAsset } from '@/lib/storage'
import { insertStagingMeme } from '@/lib/db/queries'
import { STORAGE_PATHS, DEFAULT_COMPOSITE_PARAMS } from '@/lib/constants'
import type { MemeBrief, GeneratedMeme, CompositeParams } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  let body: { sessionId?: string; brief?: MemeBrief }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { sessionId, brief } = body
  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('sessionId is required', { status: 400 })
  }
  if (!brief || brief.style !== 'surreal') {
    return new Response('surreal brief is required', { status: 400 })
  }

  try {
    const prompt = brief.imagePrompt ?? brief.captionText
    const { buffer: baseBuffer } = await generateSurrealImage(prompt)

    const baseImagePath = STORAGE_PATHS.temp(sessionId, 'surreal-base')
    await uploadMemeAsset(baseImagePath, baseBuffer, 'image/webp')

    const compositeParams: CompositeParams = {
      ...DEFAULT_COMPOSITE_PARAMS,
      captionText: brief.captionText,
    }
    const compositeBuffer = await compositeGeneratedMeme(baseBuffer, compositeParams)

    const compositePath = STORAGE_PATHS.temp(sessionId, 'surreal')
    const { url: compositeUrl } = await uploadMemeAsset(compositePath, compositeBuffer)

    const memeId = await insertStagingMeme({
      sessionId,
      complaintId: null,
      style: 'surreal',
      baseImagePath,
      compositePath,
      compositeUrl,
      captionText: brief.captionText,
      brief,
    }).catch(() => crypto.randomUUID())

    const meme: GeneratedMeme = {
      id: memeId,
      sessionId,
      style: 'surreal',
      brief,
      baseImagePath,
      compositePath,
      compositeUrl,
      captionText: brief.captionText,
    }

    return Response.json(meme)
  } catch (err) {
    console.error('[generate-surreal] error:', err)
    return new Response(
      err instanceof Error ? err.message : 'Generation failed',
      { status: 500 }
    )
  }
}
