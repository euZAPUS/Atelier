// Genera los PNG del icono a partir de public/favicon.svg (usa el Chromium de Playwright).
import { createRequire } from 'node:module'
// Playwright viene preinstalado globalmente; con NODE_PATH=$(npm root -g) se encuentra.
const { chromium } = createRequire(import.meta.url)('playwright')
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/favicon.svg', 'utf8')
const targets = [
  ['public/icon-192.png', 192, 1],
  ['public/icon-512.png', 512, 1],
  ['public/apple-touch-icon.png', 180, 1],
  ['public/icon-maskable-512.png', 512, 0.78], // zona segura del icono adaptable
]
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, size, scale] of targets) {
  await page.setViewportSize({ width: size, height: size })
  const inner = Math.round(size * scale)
  await page.setContent(`<body style="margin:0;background:#09090a;display:grid;place-items:center;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`)
  await page.screenshot({ path: file, omitBackground: false })
  console.log('✓', file)
}
await browser.close()
