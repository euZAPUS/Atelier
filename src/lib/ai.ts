// Cliente de la función de servidor de Atelier (worker/ → Cloudflare Workers AI, plan gratis).
// La app nunca lleva claves de API: la función usa Workers AI directamente.
import { db } from '../db/db'
import type { CategoryId } from '../domain/categories'

export interface AiResult { image: Blob; category: CategoryId | null; description: string; key?: string; colors: string[] }

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

/** Envía la foto (ya reducida) y devuelve la foto de producto generada. */
export async function productShot(photo: Blob, hint?: string): Promise<AiResult> {
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
