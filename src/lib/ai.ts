// Cliente de la función de servidor de Atelier (worker/ → Cloudflare Workers AI, plan gratis).
// La app nunca lleva claves de API: la función usa Workers AI directamente.
import { db } from '../db/db'
import type { CategoryId } from '../domain/categories'

export interface AiResult { image: Blob; category: CategoryId | null; type?: string; description: string; key?: string; colors: string[] }

/** La función de Atelier. Viene puesta: no hay que configurar nada (desde la web no pide contraseña). */
export const DEFAULT_AI_URL = 'https://atelier.oficcialeuzapus.workers.dev'
export class AiError extends Error {
  constructor(public kind: 'off' | 'offline' | 'quota' | 'auth' | 'failed', detail?: string) { super(detail ?? kind) }
}

/** Configuración efectiva: activada y con la URL por defecto salvo que se haya cambiado en Ajustes. */
export async function aiConfig() {
  const s = await db.settings.get('settings')
  const ai = { enabled: true, url: DEFAULT_AI_URL, ...s?.ai }
  if (!ai.url) ai.url = DEFAULT_AI_URL
  return ai.enabled ? ai : null
}

const endpoint = (url: string, path: string) => url.replace(/\/+$/, '') + path

export interface AiIdentity { category: CategoryId | null; type?: string; description: string; colors: string[]; rotation: 0 | 90 | 180 | 270; sideways?: boolean }

async function post(path: string, form: FormData, timeoutMs: number) {
  const cfg = await aiConfig()
  if (!cfg) throw new AiError('off')
  if (!navigator.onLine) throw new AiError('offline')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(endpoint(cfg.url, path), { method: 'POST', body: form, signal: ctrl.signal, headers: cfg.key ? { 'X-Atelier-Key': cfg.key } : undefined })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) throw new AiError('auth')
    if (res.status === 429 || data.error === 'quota') throw new AiError('quota', data.detail)
    if (!res.ok) throw new AiError('failed', data.detail ?? `HTTP ${res.status}`)
    return data
  } catch (e) {
    if (e instanceof AiError) throw e
    throw new AiError('failed', String((e as Error)?.message ?? e))
  } finally { clearTimeout(timer) }
}

/** Paso 1 (rápido): qué prenda es, sus colores y si la foto hay que girarla. */
export async function aiIdentify(photo: Blob, hint?: string): Promise<AiIdentity> {
  const form = new FormData()
  form.append('image', photo, 'photo.jpg')
  if (hint) form.append('hint', hint)
  const d = await post('/identify', form, 25_000)
  return { category: d.category ?? null, type: d.type ?? undefined, description: d.description ?? '', colors: d.colors ?? [], rotation: [90, 180, 270].includes(d.rotation) ? d.rotation : 0, sideways: !!d.sideways }
}

/** Paso 2: foto de producto. Si ya se conoce la prenda (paso 1), no se vuelve a analizar. */
export async function productShot(photo: Blob, hint?: string, id?: AiIdentity | null): Promise<AiResult> {
  if (id?.description) {
    const form = new FormData()
    form.append('image', photo, 'photo.jpg')
    form.append('description', id.description)
    form.append('colors', id.colors.join(','))
    if (id.category) form.append('category', id.category)
    const d = await post('/garment', form, 60_000)
    if (!d.image) throw new AiError('failed', 'sin imagen')
    return { image: b64ToBlob(d.image), category: id.category, type: id.type, description: id.description, key: d.key, colors: id.colors }
  }
  return productShotOneStep(photo, hint)
}

function b64ToBlob(b64: string) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const type = bin[0] === 0x89 ? 'image/png' : bin[0] === 0x52 ? 'image/webp' : 'image/jpeg'
  return new Blob([bin], { type })
}

/** Una sola llamada (visión + imagen en el servidor). */
async function productShotOneStep(photo: Blob, hint?: string): Promise<AiResult> {
  const cfg = await aiConfig()
  if (!cfg) throw new AiError('off')
  if (!navigator.onLine) throw new AiError('offline')
  const form = new FormData()
  form.append('image', photo, 'photo.jpg')
  if (hint) form.append('hint', hint)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 60_000)
  try {
    const res = await fetch(endpoint(cfg.url, '/garment'), {
      method: 'POST', body: form, signal: ctrl.signal,
      headers: cfg.key ? { 'X-Atelier-Key': cfg.key } : undefined,
    })
    const data = (await res.json().catch(() => ({}))) as { image?: string; key?: string; colors?: string[]; category?: CategoryId | null; description?: string; error?: string; detail?: string }
    if (res.status === 401) throw new AiError('auth')
    if (res.status === 429 || data.error === 'quota') throw new AiError('quota', data.detail)
    if (!res.ok || !data.image) throw new AiError('failed', data.detail ?? `HTTP ${res.status}`)
    const bin = Uint8Array.from(atob(data.image), (c) => c.charCodeAt(0))
    const type = bin[0] === 0x89 ? 'image/png' : bin[0] === 0x52 ? 'image/webp' : 'image/jpeg'
    return { image: new Blob([bin], { type }), category: data.category ?? null, description: data.description ?? '', key: data.key, colors: data.colors ?? [] }
  } catch (e) {
    if (e instanceof AiError) throw e
    throw new AiError('failed', String((e as Error)?.message ?? e))
  } finally { clearTimeout(timer) }
}

/** Comprueba que la URL y la clave funcionan. */
export async function aiPing(url: string, key?: string): Promise<'ok' | 'auth' | 'unreachable'> {
  try {
    const res = await fetch(endpoint(url, '/ping'), { headers: key ? { 'X-Atelier-Key': key } : undefined })
    if (res.status === 401) return 'auth'
    return res.ok ? 'ok' : 'unreachable'
  } catch { return 'unreachable' }
}
