import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { ParsedComplaint, MemeBrief, EmotionalRegister, ComplaintCategory } from './types'
import { COMPLAINT_CATEGORIES, EMOTIONAL_REGISTERS } from './constants'

// Lazy initialisation — prevents missing-key errors at build time
let _anthropic: Anthropic | null = null
let _grok: OpenAI | null = null

function anthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  return _anthropic
}

function grokClient(): OpenAI {
  if (!_grok) _grok = new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY! })
  return _grok
}

const grokModel = () => process.env.GROK_MODEL || 'grok-3'

// ─── Retry helper — handles 529 overloaded + transient 500s ──────────────────

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastErr = err
      const status = (err as { status?: number })?.status
      // Retry on overloaded (529) or server error (500/503) — not on auth/client errors
      if (status === 529 || status === 500 || status === 503) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000) // 1s, 2s, 4s, 8s
        console.warn(`[claude] attempt ${attempt + 1} failed (${status}) — retrying in ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

// ─── Call 1: Complaint parsing + PII strip (Grok) ────────────────────────────

export async function parseComplaint(rawText: string): Promise<ParsedComplaint> {
  const completion = await withRetry(() => grokClient().chat.completions.create({
    model: grokModel(),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a meme data analyst. Parse user complaints into structured data for a meme generator while stripping all PII. Return JSON only — no markdown, no explanation.`,
      },
      {
        role: 'user',
        content: `Parse this complaint and return JSON:

{
  "premise": "PII-free, pithy, relatable complaint premise (1-2 sentences, keep the emotional punch — funny or painfully relatable)",
  "category": "one of: ${COMPLAINT_CATEGORIES.join('|')}",
  "secondaryCategories": ["up to 2 secondary categories from the same list"],
  "sentiment": -0.8,
  "emotionalRegister": "one of: ${EMOTIONAL_REGISTERS.join('|')}"
}

Rules:
- Remove ALL PII: names, companies, addresses, phone numbers, emails, account numbers
- Replace specifics with universals (e.g. "my boss Dave at Acme Corp" → "my boss")
- Keep the emotional truth — the premise should feel relatable to anyone
- sentiment: -1.0 = livid, 0 = neutral, 1.0 = delighted
- Make the premise genuinely funny or painfully universal, not bland

Complaint: ${rawText}`,
      },
    ],
  }))

  const text = completion.choices[0].message.content || ''

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      premise: String(parsed.premise),
      category: (COMPLAINT_CATEGORIES.includes(parsed.category) ? parsed.category : 'other') as ComplaintCategory,
      secondaryCategories: (Array.isArray(parsed.secondaryCategories)
        ? parsed.secondaryCategories.filter((c: string) => COMPLAINT_CATEGORIES.includes(c as ComplaintCategory))
        : []) as ComplaintCategory[],
      sentiment: Math.max(-1, Math.min(1, Number(parsed.sentiment) || 0)),
      emotionalRegister: (EMOTIONAL_REGISTERS.includes(parsed.emotionalRegister)
        ? parsed.emotionalRegister
        : 'frustrated') as EmotionalRegister,
    }
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${text.slice(0, 200)}`)
  }
}

// ─── Call 2: 5 meme brief generation (Grok 3) ────────────────────────────────

const TEMPLATE_IDS = ['drake', 'distracted-boyfriend', 'two-buttons', 'this-is-fine', 'change-my-mind']

export async function generateMemeBriefs(
  premise: string,
  emotionalRegister: EmotionalRegister
): Promise<MemeBrief[]> {
  const completion = await grokClient().chat.completions.create({
    model: grokModel(),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a meme creative director with a sharp, irreverent sense of humour. Generate meme concepts that are genuinely funny, shareable, and hit exactly on the emotional truth of a complaint.

Return JSON only — no explanation.`,
      },
      {
        role: 'user',
        content: `Generate 5 meme concepts for this complaint:

Premise: "${premise}"
Emotional register: ${emotionalRegister}

Return this exact JSON structure:
{
  "briefs": [
    {
      "style": "surreal",
      "imagePrompt": "Detailed surreal/absurdist scene description for an image generator. Highly visual, strange, strong composition. No text in the image.",
      "captionText": "Absurdist one-liner that lands on the emotional truth"
    },
    {
      "style": "realistic",
      "imagePrompt": "Mundane, photorealistic scene description. A moment any person could recognise. No text in the image.",
      "captionText": "Dry, literal punchline. Understated."
    },
    {
      "style": "template",
      "imagePrompt": null,
      "captionText": "unused — use topText/bottomText instead",
      "templateId": "one of: ${TEMPLATE_IDS.join('|')}",
      "topText": "Top caption (setup)",
      "bottomText": "Bottom caption (punchline)"
    },
    {
      "style": "illustration",
      "imagePrompt": "Clean, flat cartoon scene. Simple background, expressive characters. Minimal detail. No text in the image.",
      "captionText": "Short, punchy. Maximum 8 words."
    },
    {
      "style": "text-only",
      "imagePrompt": null,
      "captionText": "Longer dry observation. 2-3 sentences. The kind of thing people screenshot and send to their group chat."
    }
  ]
}

Rules:
- Match the emotional register (${emotionalRegister}) — the tone should feel right
- Captions must be immediately shareable — no explaining the joke
- surreal: the stranger the better, as long as it still FITS the complaint
- template: pick whichever template fits the complaint dynamic best
- text-only: write it like someone venting eloquently, not a punchline`,
      },
    ],
  })

  const raw = completion.choices[0].message.content || ''

  try {
    const parsed = JSON.parse(raw)
    const briefs: MemeBrief[] = parsed.briefs.map((b: Record<string, unknown>) => ({
      style: b.style as MemeBrief['style'],
      imagePrompt: b.imagePrompt as string | null,
      captionText: (b.style === 'template' ? b.bottomText : b.captionText) as string,
      templateId: b.templateId as string | undefined,
      topText: b.topText as string | undefined,
      bottomText: b.bottomText as string | undefined,
    }))
    return briefs
  } catch {
    throw new Error(`Failed to parse Grok response as JSON: ${raw.slice(0, 200)}`)
  }
}
