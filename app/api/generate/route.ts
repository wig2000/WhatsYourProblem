import { NextRequest } from 'next/server'
import { parseComplaint, generateMemeBriefs } from '@/lib/claude'
import { generateSurrealImage, generateRealisticImage, generateIllustrationImage } from '@/lib/imageGen'
import {
  compositeGeneratedMeme,
  compositeTemplateMeme,
  compositeTextOnly,
} from '@/lib/compositing'
import { uploadMemeAsset } from '@/lib/storage'
import { insertStagingComplaint, insertStagingMeme } from '@/lib/db/queries'
import { STORAGE_PATHS, DEFAULT_COMPOSITE_PARAMS } from '@/lib/constants'
import type { GeneratedMeme, SSEEvent, MemeBrief, CompositeParams } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

function makeSender(controller: ReadableStreamDefaultController) {
  let closed = false
  return function send(event: SSEEvent) {
    if (closed) return
    try {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
    } catch {
      closed = true
    }
  }
}

export async function POST(req: NextRequest) {
  let body: { complaint?: string; sessionId?: string; consentGiven?: boolean }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { complaint, sessionId, consentGiven = false } = body
  if (!complaint || typeof complaint !== 'string' || complaint.trim().length < 3) {
    return new Response('complaint is required', { status: 400 })
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return new Response('sessionId is required', { status: 400 })
  }

  const geoCountry = req.headers.get('x-vercel-ip-country') ?? undefined
  const geoRegion  = req.headers.get('x-vercel-ip-country-region') ?? undefined
  const rawUA      = req.headers.get('user-agent') ?? ''
  const userAgentHash = await hashString(rawUA)

  const defaultParams: CompositeParams = {
    ...DEFAULT_COMPOSITE_PARAMS,
    captionText: '',
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = makeSender(controller)
      try {
        // ── Call 1: Parse complaint (Claude) ───────────────────────────────
        const parsed = await parseComplaint(complaint)

        // Write to staging DB (non-blocking for UX — don't await in crit path)
        let complaintId: string | null = null
        insertStagingComplaint({
          sessionId,
          parsed,
          geoCountry,
          geoRegion,
          userAgentHash,
          consentGiven,
        }).then((id) => { complaintId = id }).catch(console.error)

        send({ type: 'parsed', data: parsed })

        // ── Call 2: Generate 5 meme briefs (Grok 3) ───────────────────────
        const briefs = await generateMemeBriefs(parsed.premise, parsed.emotionalRegister)

        // ── Resolve text-only and template options immediately ─────────────
        const emitMeme = async (index: number, brief: MemeBrief, compositeBuffer: Buffer) => {
          const style = brief.style
          const compositePath = STORAGE_PATHS.temp(sessionId, style)
          const { url: compositeUrl } = await uploadMemeAsset(compositePath, compositeBuffer)

          const memeId = await insertStagingMeme({
            sessionId,
            complaintId,
            style,
            baseImagePath: null,
            compositePath,
            compositeUrl,
            captionText: brief.captionText,
            brief,
          }).catch(() => crypto.randomUUID())

          const meme: GeneratedMeme = {
            id: memeId,
            sessionId,
            style,
            brief,
            baseImagePath: null,
            compositePath,
            compositeUrl,
            captionText: brief.captionText,
          }

          send({ type: 'meme', index, data: meme })
        }

        // Text-only (index 4) — instant
        const textBrief = briefs.find(b => b.style === 'text-only') ?? briefs[4]
        const textOnlyTask = async () => {
          const buf = await compositeTextOnly(textBrief.captionText, {
            ...defaultParams,
            captionText: textBrief.captionText,
          })
          await emitMeme(4, textBrief, buf)
        }

        // Template (index 2) — fast (template image fetch + Sharp)
        const templateBrief = briefs.find(b => b.style === 'template') ?? briefs[2]
        const templateTask = async () => {
          const tid = templateBrief.templateId ?? 'drake'
          const top = templateBrief.topText ?? parsed.premise
          const bottom = templateBrief.bottomText ?? templateBrief.captionText
          const buf = await compositeTemplateMeme(tid, top, bottom, {
            ...defaultParams,
            captionText: bottom,
          })
          await emitMeme(2, { ...templateBrief, captionText: bottom }, buf)
        }

        // Generated images (indices 0, 1, 3) — parallel, slower
        const surrealBrief      = briefs.find(b => b.style === 'surreal')      ?? briefs[0]
        const realisticBrief    = briefs.find(b => b.style === 'realistic')    ?? briefs[1]
        const illustrationBrief = briefs.find(b => b.style === 'illustration') ?? briefs[3]

        const generatedTask = async (
          brief: MemeBrief,
          index: number,
          genFn: (prompt: string) => Promise<{ buffer: Buffer }>
        ) => {
          const prompt = brief.imagePrompt ?? brief.captionText
          const { buffer: baseBuffer } = await genFn(prompt)
          const baseImagePath = STORAGE_PATHS.temp(sessionId, `${brief.style}-base`)
          await uploadMemeAsset(baseImagePath, baseBuffer, 'image/webp')

          const compositeBuffer = await compositeGeneratedMeme(baseBuffer, {
            ...defaultParams,
            captionText: brief.captionText,
          })

          // Re-upload composite separately
          const compositePath = STORAGE_PATHS.temp(sessionId, brief.style)
          const { url: compositeUrl } = await uploadMemeAsset(compositePath, compositeBuffer)

          const memeId = await insertStagingMeme({
            sessionId,
            complaintId,
            style: brief.style,
            baseImagePath,
            compositePath,
            compositeUrl,
            captionText: brief.captionText,
            brief,
          }).catch(() => crypto.randomUUID())

          const meme: GeneratedMeme = {
            id: memeId,
            sessionId,
            style: brief.style,
            brief,
            baseImagePath,
            compositePath,
            compositeUrl,
            captionText: brief.captionText,
          }

          send({ type: 'meme', index, data: meme })
        }

        // All 5 tasks fire simultaneously — fast ones (text, template) resolve first
        await Promise.allSettled([
          textOnlyTask(),
          templateTask(),
          generatedTask(surrealBrief, 0, generateSurrealImage).catch((err) => {
            console.error('[surreal] failed:', err)
            send({ type: 'error', data: { message: 'Surreal image failed', index: 0 } })
          }),
          generatedTask(realisticBrief, 1, generateRealisticImage).catch((err) => {
            console.error('[realistic] failed:', err)
            send({ type: 'error', data: { message: 'Realistic image failed', index: 1 } })
          }),
          generatedTask(illustrationBrief, 3, generateIllustrationImage).catch((err) => {
            console.error('[illustration] failed:', err)
            send({ type: 'error', data: { message: 'Illustration image failed', index: 3 } })
          }),
        ])

        send({ type: 'complete', data: { sessionId } })
      } catch (err) {
        console.error('[generate] fatal error:', err)
        send({
          type: 'error',
          data: { message: err instanceof Error ? err.message : 'Generation failed' },
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

async function hashString(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
