// Descarga los datos de @imgly/background-removal (modelo ONNX + WASM) y copia a public/imgly/
// solo lo que usa Atelier. No se sube a git (pesa ~170 MB); se ejecuta en CI y una vez en local.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const pkg = JSON.parse(readFileSync('node_modules/@imgly/background-removal/package.json', 'utf8'))
const version = pkg.version
const out = 'public/imgly'
// isnet_fp16 para WebGPU; isnet_quint8 (la mitad) si hay que tirar de CPU
const KEEP = [
  '/models/isnet_fp16',
  '/models/isnet_quint8',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
]

const stamp = join(out, '.version')
if (existsSync(stamp) && readFileSync(stamp, 'utf8') === version) {
  console.log(`✓ modelo ${version} ya descargado`)
  process.exit(0)
}

const tmp = mkdtempSync(join(tmpdir(), 'imgly-'))
const tgz = join(tmp, 'data.tgz')
const url = `https://staticimgly.com/@imgly/background-removal-data/${version}/package.tgz`
console.log(`↓ ${url}`)
execFileSync('curl', ['-sSfL', '--retry', '3', '-o', tgz, url], { stdio: 'inherit' })
execFileSync('tar', ['xzf', tgz, '-C', tmp])

const src = join(tmp, 'package/dist')
const all = JSON.parse(readFileSync(join(src, 'resources.json'), 'utf8'))
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const kept = {}
let bytes = 0
for (const key of KEEP) {
  const entry = all[key]
  if (!entry) throw new Error(`Falta ${key} en resources.json`)
  kept[key] = entry
  for (const chunk of entry.chunks) copyFileSync(join(src, chunk.name), join(out, chunk.name))
  bytes += entry.size
}
writeFileSync(join(out, 'resources.json'), JSON.stringify(kept))
writeFileSync(stamp, version)
rmSync(tmp, { recursive: true, force: true })
console.log(`✓ ${Object.keys(kept).length} recursos, ${(bytes / 1e6).toFixed(0)} MB en ${out}/`)
