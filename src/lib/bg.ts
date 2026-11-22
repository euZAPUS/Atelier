// Quitar el fondo en el dispositivo con @imgly/background-removal (ISNet, AGPL-3.0).
// Los ficheros del modelo se sirven desde la propia app (public/imgly), no desde un CDN.
import type { Config } from '@imgly/background-removal'

export type BgDevice = 'gpu' | 'cpu'
export type BgProgress = { phase: 'download' | 'compute'; ratio: number }

const publicPath = new URL(`${import.meta.env.BASE_URL}imgly/`, location.href).href

let devicePromise: Promise<BgDevice> | undefined
/** WebGPU si existe (iPhone con iOS 26), si no CPU con el modelo cuantizado. */
export function bgDevice(): Promise<BgDevice> {
  devicePromise ??= (async () => {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
      return gpu && (await gpu.requestAdapter()) ? 'gpu' : 'cpu'
    } catch { return 'cpu' }
  })()
  return devicePromise
}

const listeners = new Set<(p: BgProgress) => void>()
export function onBgProgress(fn: (p: BgProgress) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

async function config(): Promise<Config> {
  const device = await bgDevice()
  return {
    publicPath,
    device,
    model: device === 'gpu' ? 'isnet_fp16' : 'isnet_quint8',
    output: { format: 'image/png' },
    progress: (key: string, current: number, total: number) => {
      const p: BgProgress = { phase: key.startsWith('fetch') ? 'download' : 'compute', ratio: total ? current / total : 0 }
      listeners.forEach((fn) => fn(p))
    },
  }
}

// La librería pesa: se carga solo cuando hace falta.
const lib = () => import('@imgly/background-removal')

let warm: Promise<void> | undefined
/** Descarga el modelo y crea la sesión. Se llama al pulsar "+", mientras la cámara se abre. */
export function warmUp() {
  warm ??= (async () => { const { preload } = await lib(); await preload(await config()) })().catch((e) => { warm = undefined; throw e })
  return warm
}

export async function removeBackground(image: Blob): Promise<Blob> {
  const { removeBackground } = await lib()
  return removeBackground(image, await config())
}

const CACHE = 'imgly-model'
/** ¿Está el modelo en la caché del service worker? (para saber si la primera vez será lenta) */
export async function modelCached(): Promise<{ cached: boolean; bytes: number }> {
  try {
    const device = await bgDevice()
    const res = await fetch(`${publicPath}resources.json`)
    const resources = (await res.json()) as Record<string, { size: number; chunks: { name: string }[] }>
    const keys = [`/models/${device === 'gpu' ? 'isnet_fp16' : 'isnet_quint8'}`, `/onnxruntime-web/ort-wasm-simd-threaded${device === 'gpu' ? '.jsep' : ''}.wasm`]
    const cache = await caches.open(CACHE)
    let bytes = 0, cached = true
    for (const k of keys) {
      bytes += resources[k].size
      for (const ch of resources[k].chunks) if (!(await cache.match(publicPath + ch.name))) cached = false
    }
    return { cached, bytes }
  } catch { return { cached: false, bytes: 0 } }
}
