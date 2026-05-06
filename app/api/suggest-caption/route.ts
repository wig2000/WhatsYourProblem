import { NextRequest, NextResponse } from 'next/server'
import { getStagingMeme } from '@/lib/db/queries'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 30

let _grok: OpenAI | null = null
function grokClient() {
  if (!_grok) _grok = new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY! })
  return _grok
}

export async function POST(req: NextRequest) {
  let body: { memeId?: string; currentCaption?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { memeId, currentCaption } = body
  if (!memeId) return NextResponse.json({ error: 'memeId required' }, { status: 400 })

  const meme = await getStagingMeme(memeId)
  if (!meme) return NextResponse.json({ error: 'Meme not found or expired' }, { status: 404 })

  const model = process.env.GROK_MODEL || 'grok-3'
  const completion = await grokClient().chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a sharp meme caption writer. Return only the caption text — no quotes, no explanation.',
      },
      {
        role: 'user',
        content: `Write a single alternative caption for a "${meme.style}" style meme about: "${meme.brief.captionText}".
Current caption to avoid: "${currentCaption ?? meme.captionText}"
Match the same emotional tone but find a different angle. Max 15 words for image memes, 2-3 sentences for text-only.`,
      },
    ],
  })

  const caption = completion.choices[0].message.content?.trim() ?? ''
  return NextResponse.json({ caption })
}
