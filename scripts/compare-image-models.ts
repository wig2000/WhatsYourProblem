/**
 * Model comparison: gpt-image-2 vs fal-ai/flux-pro/v1.1
 * Generates the same 3 surreal meme prompts through both models.
 * Saves results to /tmp/model-compare/ and opens the folder.
 *
 *   npx tsx scripts/compare-image-models.ts
 */

import OpenAI from 'openai'
import { fal } from '@fal-ai/client'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

// Typical surreal/absurdist prompts the app actually generates
const PROMPTS = [
  'A woman discovering her WiFi router has been replaced with a houseplant that somehow works better. Surreal, absurdist, vivid colours.',
  'An office worker realising their entire Monday meeting could have been a single text message — depicted as a Kafkaesque bureaucratic nightmare. Surreal illustration.',
  'A cat sitting in judgement over a human who dared to sleep in on a weekend and is now being late-fed. Dramatic, surreal, cinematic lighting.',
]

const OUT_DIR = '/tmp/model-compare'
fs.mkdirSync(OUT_DIR, { recursive: true })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
fal.config({ credentials: process.env.FAL_API_KEY! })

async function runGPT(prompt: string, index: number): Promise<void> {
  console.log(`  [gpt-image-2]    prompt ${index + 1}…`)
  const t0 = Date.now()
  const response = await openai.images.generate({
    model: 'gpt-image-2',
    prompt: `${prompt} No text, no words, no captions in the image.`,
    n: 1,
    size: '1024x1024',
  })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  const usage = (response as any).usage
  console.log(`  [gpt-image-2]    done in ${elapsed}s — tokens in:${usage?.input_tokens ?? '?'} out:${usage?.output_tokens ?? '?'}`)

  const item = response.data?.[0]
  if (!item) throw new Error('No data returned')

  let buffer: Buffer
  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, 'base64')
  } else if (item.url) {
    const res = await fetch(item.url)
    buffer = Buffer.from(await res.arrayBuffer())
  } else {
    throw new Error('No image in response')
  }

  fs.writeFileSync(path.join(OUT_DIR, `${index + 1}-gpt-image-2.png`), buffer)
}

async function runFlux(prompt: string, index: number): Promise<void> {
  console.log(`  [flux-pro/v1.1]  prompt ${index + 1}…`)
  const t0 = Date.now()
  const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
    input: {
      prompt: `${prompt} No text, no words, no captions in the image.`,
      image_size: 'square_hd',
      num_images: 1,
    },
  })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`  [flux-pro/v1.1]  done in ${elapsed}s`)

  const data = result.data as { images?: { url: string }[] }
  const imageUrl = data.images?.[0]?.url
  if (!imageUrl) throw new Error('No image URL returned')

  const res = await fetch(imageUrl)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(path.join(OUT_DIR, `${index + 1}-flux-pro.jpg`), buffer)
}

async function main() {
  console.log(`\nGenerating ${PROMPTS.length} prompts × 2 models = ${PROMPTS.length * 2} images`)
  console.log(`Output: ${OUT_DIR}\n`)

  for (let i = 0; i < PROMPTS.length; i++) {
    console.log(`\nPrompt ${i + 1}: "${PROMPTS[i].slice(0, 60)}…"`)
    // Run both models in parallel for each prompt
    await Promise.all([
      runGPT(PROMPTS[i], i).catch(e => console.error(`  [gpt-image-2] FAILED: ${e.message}`)),
      runFlux(PROMPTS[i], i).catch(e => console.error(`  [flux-pro] FAILED: ${e.message}`)),
    ])
  }

  console.log('\n──────────────────────────────────────')
  console.log(`Done. Files saved to ${OUT_DIR}:`)
  fs.readdirSync(OUT_DIR).sort().forEach(f => {
    const size = (fs.statSync(path.join(OUT_DIR, f)).size / 1024).toFixed(0)
    console.log(`  ${f.padEnd(35)} ${size} KB`)
  })

  // Open folder in Finder
  execSync(`open ${OUT_DIR}`)
  console.log('\nOpened in Finder — compare 1-gpt vs 1-flux, 2-gpt vs 2-flux, etc.\n')
}

main().catch(e => { console.error(e); process.exit(1) })
