import { NextRequest, NextResponse } from 'next/server'
import { getStagingMeme, insertStagingMeme } from '@/lib/db/queries'
import { compositeGeneratedMeme, compositeTemplateMeme, compositeTextOnly } from '@/lib/compositing'
import { uploadMemeAsset } from '@/lib/storage'
import { STORAGE_PATHS, DEFAULT_COMPOSITE_PARAMS } from '@/lib/constants'
import type { CompositeParams, FontChoice, ColourChoice, GridPosition } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  let body: {
    memeId?: string
    font?: FontChoice
    colour?: ColourChoice
    placement?: GridPosition
    captionText?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { memeId, font, colour, placement, captionText } = body
  if (!memeId) return NextResponse.json({ error: 'memeId required' }, { status: 400 })

  const meme = await getStagingMeme(memeId)
  if (!meme) return NextResponse.json({ error: 'Meme not found or expired' }, { status: 404 })

  const params: CompositeParams = {
    font:        font        ?? DEFAULT_COMPOSITE_PARAMS.font,
    colour:      colour      ?? DEFAULT_COMPOSITE_PARAMS.colour,
    placement:   placement   ?? DEFAULT_COMPOSITE_PARAMS.placement,
    captionText: captionText ?? meme.captionText,
  }

  let compositeBuffer: Buffer

  if (meme.style === 'text-only') {
    compositeBuffer = await compositeTextOnly(params.captionText, params)
  } else if (meme.style === 'template') {
    const topText = meme.brief.topText ?? params.captionText
    const bottomText = meme.brief.bottomText ?? params.captionText
    compositeBuffer = await compositeTemplateMeme(
      meme.brief.templateId ?? 'drake',
      topText,
      bottomText,
      params
    )
  } else {
    // Fetch base image and re-composite
    if (!meme.baseImagePath) {
      return NextResponse.json({ error: 'No base image for this meme' }, { status: 400 })
    }
    const baseUrl = meme.compositeUrl.replace(
      STORAGE_PATHS.temp(meme.sessionId, meme.style),
      STORAGE_PATHS.temp(meme.sessionId, `${meme.style}-base`)
    )
    const baseResponse = await fetch(baseUrl)
    if (!baseResponse.ok) {
      return NextResponse.json({ error: 'Base image expired or unavailable' }, { status: 410 })
    }
    const baseBuffer = Buffer.from(await baseResponse.arrayBuffer())
    compositeBuffer = await compositeGeneratedMeme(baseBuffer, params)
  }

  // Upload new composite (overwrite the temp slot)
  const compositePath = STORAGE_PATHS.temp(meme.sessionId, `${meme.style}-custom-${Date.now()}`)
  const { url: compositeUrl } = await uploadMemeAsset(compositePath, compositeBuffer)

  // Insert a new staging_meme row for this customised version
  const newMemeId = await insertStagingMeme({
    sessionId:     meme.sessionId,
    complaintId:   null,
    style:         meme.style,
    baseImagePath: meme.baseImagePath,
    compositePath,
    compositeUrl,
    captionText:   params.captionText,
    brief:         meme.brief,
  })

  return NextResponse.json({ compositeUrl, memeId: newMemeId })
}
