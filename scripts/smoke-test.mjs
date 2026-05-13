/**
 * Smoke test — run after any compositing or font change.
 *   npm run smoke-test
 *
 * Checks:
 *   1. All 4 fonts load and render distinctly via resvg-js
 *   2. compositeGeneratedMeme produces a valid webp buffer
 *   3. compositeTemplateMeme produces a valid webp buffer for each template
 *   4. compositeTextOnly text stays within image bounds (no overflow)
 *   5. TypeScript compiles cleanly
 */

import { execSync } from 'child_process'
import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

let passed = 0
let failed = 0

function pass(msg) { console.log(`  ✓ ${msg}`); passed++ }
function fail(msg) { console.error(`  ✗ ${msg}`); failed++ }

function section(title) { console.log(`\n── ${title} ──`) }

// ─── TypeScript ───────────────────────────────────────────────────────────────
section('TypeScript')
try {
  execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe' })
  pass('No type errors')
} catch (e) {
  const out = e.stdout?.toString() || e.stderr?.toString() || ''
  const lines = out.split('\n').filter(l => l && !l.includes('node_modules')).slice(0, 10)
  fail(`Type errors:\n${lines.join('\n')}`)
}

// ─── Font loading via resvg-js ────────────────────────────────────────────────
section('Font rendering (resvg-js)')

const { Resvg } = createRequire(import.meta.url)('@resvg/resvg-js')
const fontsDir = join(root, 'public', 'fonts')

const fonts = [
  { key: 'bebas',   family: 'Bebas Neue',       file: 'bebas-neue.ttf' },
  { key: 'bangers', family: 'Bangers',           file: 'bangers.ttf' },
  { key: 'marker',  family: 'Permanent Marker',  file: 'permanent-marker.ttf' },
  { key: 'oswald',  family: 'Oswald',            file: 'oswald.ttf' },
]

const fontFiles = fonts.map(f => join(fontsDir, f.file))
const missingFonts = fontFiles.filter(f => !fs.existsSync(f))
if (missingFonts.length > 0) {
  fail(`Missing TTF files: ${missingFonts.map(f => f.split('/').pop()).join(', ')} — run: npm run setup:fonts`)
} else {
  const opts = { font: { fontFiles, loadSystemFonts: false } }
  const noFontSvg = `<svg width="400" height="70" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="70" fill="white"/><text x="10" y="55" font-size="40" fill="black">HELLO MEME</text></svg>`
  const noFontSize = Buffer.from(new Resvg(noFontSvg, { font: { loadSystemFonts: false } }).render().asPng()).length

  const sizes = new Set()
  for (const f of fonts) {
    const svg = `<svg width="400" height="70" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="70" fill="white"/><text x="10" y="55" font-family="${f.family}" font-size="40" fill="black">HELLO MEME</text></svg>`
    const size = Buffer.from(new Resvg(svg, opts).render().asPng()).length
    if (size === noFontSize) {
      fail(`${f.key} (${f.family}): rendered as fallback — font not loaded`)
    } else {
      sizes.add(size)
      pass(`${f.key} (${f.family}): loaded (${size} bytes)`)
    }
  }
  if (sizes.size < fonts.length) {
    fail(`Some fonts rendered identically — they may be the same font`)
  } else {
    pass(`All 4 fonts produce distinct output`)
  }
}

// ─── Compositing ─────────────────────────────────────────────────────────────
section('Compositing functions')

try {
  const result = execSync(
    'npx tsx scripts/smoke-test-compositing.ts',
    { cwd: root, encoding: 'utf8' }
  )
  // Print each line from the child process
  result.split('\n').filter(Boolean).forEach(l => console.log(l))
  // Count passes from output
  const childPassed = (result.match(/✓/g) || []).length
  passed += childPassed
} catch (e) {
  const output = (e.stdout || '') + (e.stderr || '')
  output.split('\n').filter(Boolean).forEach(l => console.log(l))
  const childPassed = (output.match(/✓/g) || []).length
  const childFailed = (output.match(/✗/g) || []).length
  passed += childPassed
  failed += childFailed
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`)
console.log(`  ${passed} passed  ${failed} failed`)
if (failed > 0) {
  console.error(`\nSmoke test FAILED — fix the above before handing back to the user.\n`)
  process.exit(1)
} else {
  console.log(`\nAll checks passed ✓\n`)
}
