/**
 * Compositing smoke tests — invoked as a child process by smoke-test.mjs
 * Exits 0 on success, 1 on any failure.
 */
import sharp from 'sharp'
import { compositeGeneratedMeme, compositeTemplateMeme, compositeTextOnly } from '../lib/compositing'

let passed = 0
let failed = 0
const pass = (msg: string) => { console.log(`  ✓ ${msg}`); passed++ }
const fail = (msg: string) => { console.error(`  ✗ ${msg}`); failed++ }

async function main() {
  // Solid grey 1024×1024 base image
  const baseImage = await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: { r: 100, g: 100, b: 100 } },
  }).jpeg().toBuffer()

  const defaultParams = { font: 'bebas' as const, colour: 'white-stroke' as const, placement: 9 as const, captionText: 'TEST CAPTION' }

  // 1. compositeGeneratedMeme
  try {
    const result = await compositeGeneratedMeme(baseImage, defaultParams)
    result.length > 1_000
      ? pass(`compositeGeneratedMeme: ${result.length} bytes`)
      : fail(`compositeGeneratedMeme: suspiciously small (${result.length} bytes)`)
  } catch (e: unknown) {
    fail(`compositeGeneratedMeme threw: ${(e as Error).message}`)
  }

  // 2. compositeTextOnly — long caption to verify it wraps and stays in bounds
  const longCaption = "When your WiFi drops during a video call and you have to pretend it was the other person's connection and then it happens again immediately."
  try {
    const result = await compositeTextOnly(longCaption, { ...defaultParams, font: 'marker' })
    result.length > 5_000
      ? pass(`compositeTextOnly: ${result.length} bytes`)
      : fail(`compositeTextOnly: suspiciously small (${result.length} bytes)`)
  } catch (e: unknown) {
    fail(`compositeTextOnly threw: ${(e as Error).message}`)
  }

  // 3. compositeTemplateMeme — all 5 templates
  const templates = ['drake', 'distracted-boyfriend', 'two-buttons', 'this-is-fine', 'change-my-mind']
  for (const tid of templates) {
    try {
      const result = await compositeTemplateMeme(tid, 'SETUP TEXT', 'PUNCHLINE HERE', defaultParams)
      result.length > 10_000
        ? pass(`compositeTemplateMeme(${tid}): ${result.length} bytes`)
        : fail(`compositeTemplateMeme(${tid}): suspiciously small (${result.length} bytes)`)
    } catch (e: unknown) {
      fail(`compositeTemplateMeme(${tid}) threw: ${(e as Error).message}`)
    }
  }

  // 4. All 4 fonts produce distinct composites
  const fontKeys = ['bebas', 'bangers', 'marker', 'oswald'] as const
  const fontSizes = new Set<number>()
  for (const font of fontKeys) {
    try {
      const result = await compositeGeneratedMeme(baseImage, { ...defaultParams, font })
      fontSizes.add(result.length)
      pass(`font '${font}': ${result.length} bytes`)
    } catch (e: unknown) {
      fail(`font '${font}' threw: ${(e as Error).message}`)
    }
  }
  fontSizes.size < fontKeys.length
    ? fail('Some fonts produced identical output — check font loading')
    : pass('All 4 fonts produce distinct composites')

  console.log(`\n  ${passed} passed  ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
