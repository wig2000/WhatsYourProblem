import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import type { CompositeParams, FontChoice, GridPosition } from './types'
import { COLOUR_HEX, GRID_POSITIONS, IMAGE_SIZE } from './constants'
import { getTemplate, fetchTemplateBuffer } from './templates'

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')

const FONT_FILES: Record<FontChoice, string> = {
  'bebas':      'bebas-neue.ttf',
  'inter-bold': 'inter-bold.ttf',
  'caveat':     'caveat.ttf',
  'inter':      'inter.ttf',
}

const FONT_SIZES: Record<FontChoice, number> = {
  'bebas':      56,
  'inter-bold': 46,
  'caveat':     52,
  'inter':      42,
}

// Conservative char-width ratio per font (em units).
// Bebas Neue / Impact are all-caps and wide — use 0.70 to avoid overflow.
const CHAR_WIDTH_RATIO: Record<FontChoice, number> = {
  'bebas':      0.70,
  'inter-bold': 0.62,
  'caveat':     0.57,
  'inter':      0.52,
}

// Load font as base64 for embedding in SVG (Vercel-safe — no system font dependency)
function loadFontBase64(font: FontChoice): string {
  const fontPath = path.join(FONTS_DIR, FONT_FILES[font])
  if (!fs.existsSync(fontPath)) {
    console.warn(`Font not found: ${fontPath}. Run: npm run setup:fonts`)
    return ''
  }
  return fs.readFileSync(fontPath).toString('base64')
}

// Cache font data in memory across invocations (warm Lambda reuse)
const fontCache = new Map<FontChoice, string>()

function getFontBase64(font: FontChoice): string {
  if (!fontCache.has(font)) fontCache.set(font, loadFontBase64(font))
  return fontCache.get(font)!
}

// Wrap text into lines that fit within maxWidth pixels at the given font size
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function buildTextSvg(
  text: string,
  width: number,
  height: number,
  params: CompositeParams,
  isTemplate = false,
  templateY?: number
): string {
  const { font, colour } = params
  const pos = isTemplate && templateY !== undefined
    ? { x: 0.5, y: templateY, anchor: 'middle' as const, baseline: 'middle', padding: 16 }
    : GRID_POSITIONS[params.placement]

  const { fill, stroke } = COLOUR_HEX[colour]
  const fontBase64 = getFontBase64(font)
  const fontFamily = font === 'bebas' ? 'BebasNeue'
    : font === 'inter-bold' ? 'InterBold'
    : font === 'caveat' ? 'Caveat'
    : 'Inter'

  // Usable width depends on anchor so text doesn't escape the frame.
  // anchor 'end': text grows left from xPx  → usable = xPx - padding
  // anchor 'middle': centered at xPx        → usable = 2 * min(xPx, w-xPx) - padding
  // anchor 'start': text grows right        → usable = width - xPx - padding
  const xPx0 = pos.x * width
  const usableWidth =
    pos.anchor === 'end'    ? xPx0 - pos.padding
    : pos.anchor === 'middle' ? 2 * Math.min(xPx0, width - xPx0) - pos.padding
    : width - xPx0 - pos.padding

  // Scale down until all lines fit horizontally (max 8 attempts, ~15% each step)
  let fontSize = FONT_SIZES[font]
  let lines: string[] = []
  const MAX_LINES = 8
  for (let attempt = 0; attempt < 8; attempt++) {
    const charsPerLine = Math.floor(usableWidth / (fontSize * CHAR_WIDTH_RATIO[font]))
    lines = wrapText(text.toUpperCase(), Math.max(charsPerLine, 1))
    if (lines.length <= MAX_LINES) break
    fontSize = Math.round(fontSize * 0.85)
  }

  const lineHeight = fontSize * 1.2
  const totalTextHeight = lines.length * lineHeight

  const xPx = xPx0
  let yPx = pos.y * height

  // Nudge baseline/hanging positions so text stays in frame
  if (pos.baseline === 'hanging') yPx = Math.max(pos.padding, yPx)
  if (pos.baseline === 'auto') yPx = Math.min(height - totalTextHeight - pos.padding, yPx)

  const tspans = lines.map((line, i) => {
    const dy = i === 0 ? 0 : lineHeight
    return `<tspan x="${xPx}" dy="${dy}">${escapeXml(line)}</tspan>`
  }).join('\n')

  const fontFaceDecl = fontBase64
    ? `@font-face { font-family: '${fontFamily}'; src: url('data:font/truetype;base64,${fontBase64}'); }`
    : ''

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>${fontFaceDecl}
      .mt {
        font-family: '${fontFamily}', Impact, Arial Black, sans-serif;
        font-size: ${fontSize}px;
        font-weight: ${font === 'inter' ? '400' : '700'};
        fill: ${fill};
        paint-order: stroke fill;
        stroke: ${stroke};
        stroke-width: ${font === 'bebas' ? 3 : 2}px;
        stroke-linejoin: round;
      }
    </style>
  </defs>
  <text
    x="${xPx}"
    y="${yPx}"
    text-anchor="${pos.anchor}"
    dominant-baseline="${pos.baseline}"
    class="mt"
  >${tspans}</text>
</svg>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function compositeGeneratedMeme(
  imageBuffer: Buffer,
  params: CompositeParams
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata()
  const w = meta.width ?? IMAGE_SIZE
  const h = meta.height ?? IMAGE_SIZE

  const svg = buildTextSvg(params.captionText, w, h, params)

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .webp({ quality: 85 })
    .toBuffer()
}

export async function compositeTemplateMeme(
  templateId: string,
  topText: string,
  bottomText: string,
  params: CompositeParams
): Promise<Buffer> {
  const template = getTemplate(templateId)
  if (!template) throw new Error(`Unknown template: ${templateId}`)

  const templateBuffer = await fetchTemplateBuffer(template)
  const meta = await sharp(templateBuffer).metadata()
  const w = meta.width ?? IMAGE_SIZE
  const h = meta.height ?? IMAGE_SIZE

  const topSvg = buildTextSvg(topText, w, h, { ...params, placement: 2 }, true, template.topArea.yFraction)
  const bottomSvg = buildTextSvg(bottomText, w, h, { ...params, placement: 8 }, true, template.bottomArea.yFraction)

  return sharp(templateBuffer)
    .composite([
      { input: Buffer.from(topSvg), top: 0, left: 0 },
      { input: Buffer.from(bottomSvg), top: 0, left: 0 },
    ])
    .webp({ quality: 85 })
    .toBuffer()
}

export async function compositeTextOnly(
  captionText: string,
  params: CompositeParams
): Promise<Buffer> {
  const w = IMAGE_SIZE
  const h = IMAGE_SIZE

  // Dark gradient background
  const background = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 15, g: 15, b: 15, alpha: 1 } },
  })
    .png()
    .toBuffer()

  // For text-only, force centre placement and larger font
  const centredParams: CompositeParams = { ...params, placement: 5 as GridPosition }
  const svg = buildTextSvg(captionText, w, h, centredParams)

  return sharp(background)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .webp({ quality: 85 })
    .toBuffer()
}
