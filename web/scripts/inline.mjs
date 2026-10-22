// Inlines the built JS and CSS into a single page at dist/single/index.html, so tools that
// encrypt one HTML file (like StatiCrypt) cover the whole app, not just its shell.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
let html = readFileSync(join(dist, 'index.html'), 'utf8')

html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/, (_, src) => {
  // keep the bundle from closing its own script tag early
  const js = readFileSync(join(dist, src), 'utf8').replace(/<\/script/gi, '<\\/script')
  return `<script type="module">${js}</script>`
})
html = html.replace(
  /<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/,
  (_, href) => `<style>${readFileSync(join(dist, href), 'utf8')}</style>`,
)

if (html.includes('./assets/')) throw new Error('Some assets were not inlined. Did the Vite output format change?')

mkdirSync(join(dist, 'single'), { recursive: true })
writeFileSync(join(dist, 'single', 'index.html'), html)
console.log(`Wrote dist/single/index.html (${Math.round(html.length / 1024)} KB)`)
