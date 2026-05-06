/**
 * Downloads the four font TTF files needed by Sharp for meme text compositing.
 * Run manually: npm run setup:fonts
 *
 * Fonts (all OFL/Apache licensed):
 *   bebas-neue.ttf   — Bebas Neue (classic meme style)
 *   inter-bold.ttf   — Inter Bold (bold sans)
 *   caveat.ttf       — Caveat (handwritten)
 *   inter.ttf        — Inter Regular (modern clean)
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { get } from 'https'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fontsDir = join(__dirname, '..', 'public', 'fonts')

if (!existsSync(fontsDir)) mkdirSync(fontsDir, { recursive: true })

// Google Fonts static CDN URLs (TTF variants, latin subset)
const fonts = {
  'bebas-neue.ttf': 'https://fonts.gstatic.com/s/bebasneueby/v11/JTUSjIg69CK48gW7PXooxW5rygbi49c.ttf',
  'inter-bold.ttf': 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZFhjQ.ttf',
  'caveat.ttf':     'https://fonts.gstatic.com/s/caveat/v18/WnznHAc5bAfYB2QRah7pcpNvOx-pjcB9eIWpZA.ttf',
  'inter.ttf':      'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZFhjQ.ttf',
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (existsSync(dest)) {
      console.log(`  ✓ ${dest.split('/').pop()} (already exists)`)
      resolve()
      return
    }
    const file = createWriteStream(dest)
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        file.close()
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', reject)
  })
}

console.log('Downloading fonts to public/fonts/ …')
await Promise.all(
  Object.entries(fonts).map(([name, url]) =>
    download(url, join(fontsDir, name))
      .then(() => console.log(`  ✓ ${name}`))
      .catch((err) => console.error(`  ✗ ${name}: ${err.message}`))
  )
)
console.log('Done.')
