import sharp from 'sharp'
import path from 'path'
import { Resvg } from '@resvg/resvg-js'
import type { CompositeParams, FontChoice, GridPosition } from './types'
import { COLOUR_HEX, GRID_POSITIONS, IMAGE_SIZE } from './constants'
import { getTemplate, fetchTemplateBuffer } from './templates'

// ─── resvg-js font configuration ─────────────────────────────────────────────
// Sharp's bundled librsvg ignores @font-face data URIs and custom fontconfig.
// We use resvg-js (Rust SVG renderer) for text layers — it supports explicit
// TTF file loading and produces correct font rendering. Sharp is kept for all
// image compositing and output encoding.

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')
const RESVG_FONT_OPTS = {
  font: {
    fontFiles: [
      path.join(FONTS_DIR, 'bebas-neue.ttf'),
      path.join(FONTS_DIR, 'bangers.ttf'),
      path.join(FONTS_DIR, 'permanent-marker.ttf'),
      path.join(FONTS_DIR, 'oswald.ttf'),
    ],
    loadSystemFonts: false,
  },
}

/** Render an SVG string to a PNG Buffer using resvg-js with our custom fonts loaded. */
function renderTextSvg(svg: string): Buffer {
  const resvg = new Resvg(svg, RESVG_FONT_OPTS)
  return Buffer.from(resvg.render().asPng())
}

// Font family names as stored in the TTF files
const FONT_FAMILY: Record<FontChoice, string> = {
  'bebas':   'Bebas Neue',
  'bangers': 'Bangers',
  'marker':  'Permanent Marker',
  'oswald':  'Oswald',
}

const FONT_SIZES: Record<FontChoice, number> = {
  'bebas':   56,
  'bangers': 54,
  'marker':  48,
  'oswald':  50,
}

// Conservative char-width ratio per font (em units).
const CHAR_WIDTH_RATIO: Record<FontChoice, number> = {
  'bebas':   0.60,
  'bangers': 0.58,
  'marker':  0.62,
  'oswald':  0.62,
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
  templateY?: number,
  maxHeight?: number   // hard vertical budget in px — enforced for template areas
): string {
  const { font, colour } = params
  const pos = isTemplate && templateY !== undefined
    ? { x: 0.5, y: templateY, anchor: 'middle' as const, baseline: 'middle', padding: 40 }
    : GRID_POSITIONS[params.placement]

  const { fill, stroke } = COLOUR_HEX[colour]
  const fontFamily = FONT_FAMILY[font]

  // Usable width depends on anchor so text doesn't escape the frame.
  // anchor 'end': text grows left from xPx  → usable = xPx - padding
  // anchor 'middle': centered at xPx        → usable = 2 * min(xPx, w-xPx) - padding
  // anchor 'start': text grows right        → usable = width - xPx - padding
  const xPx0 = pos.x * width
  const usableWidth =
    pos.anchor === 'end'    ? xPx0 - pos.padding
    : pos.anchor === 'middle' ? 2 * Math.min(xPx0, width - xPx0) - pos.padding
    : width - xPx0 - pos.padding

  // Templates start smaller — their text areas are much tighter than the full image.
  const baseFontSize = isTemplate
    ? Math.min(FONT_SIZES[font], 28)
    : FONT_SIZES[font]

  // Templates use a more conservative char-width multiplier because:
  // (a) template images are often small/wide with tight text areas
  // (b) wide caps like M, W, G exceed the average ratio significantly
  const charWidthRatio = isTemplate
    ? CHAR_WIDTH_RATIO[font] * 1.35
    : CHAR_WIDTH_RATIO[font]

  // Scale down until text fits both horizontally (MAX_LINES) and vertically (maxHeight).
  let fontSize = baseFontSize
  let lines: string[] = []
  const MAX_LINES = 8
  for (let attempt = 0; attempt < 12; attempt++) {
    const charsPerLine = Math.floor(usableWidth / (fontSize * charWidthRatio))
    lines = wrapText(text.toUpperCase(), Math.max(charsPerLine, 1))
    const blockHeight = lines.length * (fontSize * 1.2)
    const fitsLines  = lines.length <= MAX_LINES
    const fitsHeight = maxHeight === undefined || blockHeight <= maxHeight
    if (fitsLines && fitsHeight) break
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

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .mt {
        font-family: '${fontFamily}', Impact, Arial Black, sans-serif;
        font-size: ${fontSize}px;
        font-weight: ${font === 'oswald' ? '700' : '400'};
        fill: ${fill};
        paint-order: stroke fill;
        stroke: ${stroke};
        stroke-width: ${font === 'marker' ? 1 : 2}px;
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
  const textPng = renderTextSvg(svg)

  return sharp(imageBuffer)
    .composite([{ input: textPng, top: 0, left: 0 }])
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
  const origW = meta.width  ?? IMAGE_SIZE
  const origH = meta.height ?? IMAGE_SIZE

  // ── Letterbox to square ───────────────────────────────────────────────────
  // All output is IMAGE_SIZE × IMAGE_SIZE so the feed tile always shows the
  // full meme without cropping, regardless of the template's aspect ratio.
  const squareBuffer = await sharp(templateBuffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer()

  // Work out where the template content sits inside the square so we can
  // map the template's yFraction values to the correct pixel positions.
  const scale   = Math.min(IMAGE_SIZE / origW, IMAGE_SIZE / origH)
  const scaledH = Math.round(origH * scale)
  const offsetY = Math.round((IMAGE_SIZE - scaledH) / 2)

  // Convert original yFractions → fractions of the square canvas
  const toSquareY = (frac: number) => (offsetY + frac * scaledH) / IMAGE_SIZE
  const toSquareH = (frac: number) => (frac * scaledH) / IMAGE_SIZE

  const topMaxH = toSquareH(template.topArea.heightFraction)    * IMAGE_SIZE
  const botMaxH = toSquareH(template.bottomArea.heightFraction) * IMAGE_SIZE

  const topSvg = buildTextSvg(
    topText, IMAGE_SIZE, IMAGE_SIZE,
    { ...params, placement: 2 }, true, toSquareY(template.topArea.yFraction), topMaxH,
  )
  const bottomSvg = buildTextSvg(
    bottomText, IMAGE_SIZE, IMAGE_SIZE,
    { ...params, placement: 8 }, true, toSquareY(template.bottomArea.yFraction), botMaxH,
  )

  const topPng    = renderTextSvg(topSvg)
  const bottomPng = renderTextSvg(bottomSvg)

  return sharp(squareBuffer)
    .composite([
      { input: topPng,    top: 0, left: 0 },
      { input: bottomPng, top: 0, left: 0 },
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

  // Text-only uses a custom centred position with generous padding so long
  // 2-3 sentence captions stay well within the 1024px canvas.
  // Override: larger side padding (120px each side = 240px total) and cap font at 40px
  const textOnlyPadding = 120
  const textOnlyFontSize = Math.min(FONT_SIZES[params.font], 40)
  const usableW = w - textOnlyPadding * 2
  const charWidthRatio = CHAR_WIDTH_RATIO[params.font]
  let fontSize = textOnlyFontSize
  let lines: string[] = []
  for (let attempt = 0; attempt < 14; attempt++) {
    const charsPerLine = Math.floor(usableW / (fontSize * charWidthRatio))
    lines = wrapText(captionText.toUpperCase(), Math.max(charsPerLine, 1))
    const blockH = lines.length * (fontSize * 1.2)
    if (lines.length <= 12 && blockH <= h - textOnlyPadding * 2) break
    fontSize = Math.round(fontSize * 0.85)
  }
  const lineHeight = fontSize * 1.2
  const totalH = lines.length * lineHeight
  const yStart = (h - totalH) / 2
  const { fill, stroke } = COLOUR_HEX[params.colour]
  const fontFamily = FONT_FAMILY[params.font]
  const tspans = lines.map((line, i) =>
    `<tspan x="${w / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('\n')
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <style>.mt { font-family: '${fontFamily}', Impact, sans-serif; font-size: ${fontSize}px;
    fill: ${fill}; paint-order: stroke fill; stroke: ${stroke}; stroke-width: 2px; stroke-linejoin: round; }</style>
  <text x="${w / 2}" y="${yStart}" text-anchor="middle" dominant-baseline="hanging" class="mt">${tspans}</text>
</svg>`
  const textPng = renderTextSvg(svg)

  return sharp(background)
    .composite([{ input: textPng, top: 0, left: 0 }])
    .webp({ quality: 85 })
    .toBuffer()
}
