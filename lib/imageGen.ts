import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { fal } from '@fal-ai/client'
import type { ImageGenResult } from './types'

// Lazy initialisation — prevents missing-key errors at build time
let _openai: OpenAI | null = null
let _googleAI: GoogleGenAI | null = null
let _falConfigured = false

function openaiClient(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  return _openai
}

function googleAIClient(): GoogleGenAI {
  if (!_googleAI) _googleAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })
  return _googleAI
}

function ensureFal() {
  if (!_falConfigured) {
    fal.config({ credentials: process.env.FAL_API_KEY! })
    _falConfigured = true
  }
}

// ─── Surreal/absurdist brief → gpt-image-2 ───────────────────────────────────
// Token-based billing: log input + output tokens on every call

export async function generateSurrealImage(prompt: string): Promise<ImageGenResult> {
  const response = await openaiClient().images.generate({
    model: 'gpt-image-2',
    prompt: `${prompt}. No text, no words, no captions in the image.`,
    n: 1,
    size: '1024x1024',
  })

  const usage = (response as unknown as { usage?: { input_tokens?: number; output_tokens?: number } }).usage

  console.log('[gpt-image-2] tokens:', {
    input: usage?.input_tokens ?? 'unknown',
    output: usage?.output_tokens ?? 'unknown',
    prompt: prompt.slice(0, 80),
  })

  const item = response.data?.[0]
  if (!item) throw new Error('gpt-image-2 returned no image data')

  let buffer: Buffer
  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, 'base64')
  } else if (item.url) {
    const res = await fetch(item.url)
    if (!res.ok) throw new Error(`Failed to fetch gpt-image-2 image: ${res.status}`)
    buffer = Buffer.from(await res.arrayBuffer())
  } else {
    throw new Error('gpt-image-2 returned neither b64_json nor url')
  }

  return {
    buffer,
    model: 'gpt-image-2',
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
  }
}

// ─── Realistic brief → Imagen 4 Ultra ────────────────────────────────────────
// Flat per-image pricing (~$0.06). No token tracking needed.

export async function generateRealisticImage(prompt: string): Promise<ImageGenResult> {
  const response = await googleAIClient().models.generateImages({
    model: 'imagen-4.0-ultra-generate-001',
    prompt: `${prompt}. Photorealistic. No text, no words, no captions in the image.`,
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
      outputMimeType: 'image/jpeg',
    },
  })

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes
  if (!imageBytes) throw new Error('Imagen 4 returned no image data')

  const buffer = Buffer.from(imageBytes, 'base64')

  console.log('[imagen-4-ultra] generated image, ~$0.06')

  return {
    buffer,
    model: 'imagen-4.0-ultra-generate-001',
    costCents: 6,
  }
}

// ─── Illustration/cartoon brief → Flux 2 Pro via fal.ai ─────────────────────
// Flat per-image pricing. Best stylistic control for flat aesthetics.

export async function generateIllustrationImage(prompt: string): Promise<ImageGenResult> {
  ensureFal()
  const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
    input: {
      prompt: `${prompt}. Flat illustration style, clean lines, minimal background. No text, no words in the image.`,
      image_size: 'square_hd',
      num_images: 1,
      // num_inference_steps not in v1.1 type — omitted
    },
  })

  const data = result.data as { images?: { url: string }[] }
  const imageUrl = data.images?.[0]?.url
  if (!imageUrl) throw new Error('Flux 2 Pro returned no image URL')

  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) throw new Error(`Failed to fetch Flux image: ${imageResponse.status}`)
  const buffer = Buffer.from(await imageResponse.arrayBuffer())

  console.log('[flux2-pro] generated image from fal.ai')

  return {
    buffer,
    model: 'fal-ai/flux-pro/v1.1',
  }
}
