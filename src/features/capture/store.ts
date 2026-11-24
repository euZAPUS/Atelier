// Flujo de alta rápida. La foto se procesa en segundo plano y la prenda se puede guardar
// ANTES de que acabe el recorte: cuando termina, se actualiza sola en el armario.
import { useSyncExternalStore } from 'react'
import { db, newId } from '../../db/db'
import type { ColorInfo, Garment } from '../../db/types'
import { categoryById, type CategoryId } from '../../domain/categories'
import { extractPalette } from '../../domain/color'
import { AiError, aiConfig, productShot } from '../../lib/ai'
import { removeBackground, warmUp } from '../../lib/bg'
import { chromaKey, hexToRgb } from '../../lib/chroma'
import { canvasToBlob, centerCrop, decode, encodeAlpha, hasTransparency, samplePixels, toCanvas, trimTransparent } from '../../lib/image'

export type JobStatus = 'processing' | 'ready' | 'failed'

export interface Job {
  id: string
  status: JobStatus
  previewUrl: string // la foto original, para enseñarla al momento
  cutoutUrl?: string
  color?: ColorInfo
  palette?: ColorInfo[]
  error?: string
  savedId?: string
  phase?: 'ai' | 'cutout'
  suggested?: CategoryId // categoría que propone la IA
  aiFallback?: AiError['kind'] // la IA no se pudo usar y se recortó en el móvil
  aiUsed?: boolean // la imagen es una foto de producto generada por la IA
  pickedAt: number // hora de la foto (para mostrarla)
}

interface Result { cutout: Blob; thumb: Blob; original: Blob; color: ColorInfo; palette: ColorInfo[]; suggested?: CategoryId; aiFallback?: AiError['kind']; aiUsed?: boolean }
type Phase = (p: { phase: 'ai' | 'cutout'; suggested?: CategoryId; aiFallback?: AiError['kind'] }) => void

let job: Job | null = null
let result: Promise<Result> | null = null
let jobFile: Blob | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
const set = (patch: Partial<Job>) => { if (job) { job = { ...job, ...patch }; emit() } }

export function useJob() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => job)
}

/** Al pulsar "+": mientras se abre la cámara y encuadras, se prepara el modelo. */
export function markTap() {
  warmUp().catch(() => {})
}

export const PENDING_COLOR: ColorInfo = { hex: '#9a9a96', name: 'pending', lab: [63, 0, 1] }

/** Segmentación local (ISNet en el móvil): devuelve la imagen de trabajo y su versión con fondo transparente. */
async function segment(src: HTMLCanvasElement) {
  const work = toCanvas(src, 1024) // el modelo trabaja a 1024: más no mejora y tarda más
  const png = await removeBackground(await canvasToBlob(work, 'image/jpeg', 0.9))
  const cbmp = await decode(png)
  const cut = document.createElement('canvas')
  cut.width = work.width; cut.height = work.height
  cut.getContext('2d')!.drawImage(cbmp, 0, 0, work.width, work.height)
  cbmp.close()
  return { work, cut }
}

/** Recorte local listo para guardar. */
async function cutLocal(src: HTMLCanvasElement) {
  return trimTransparent((await segment(src)).cut)
}

/**
 * Imagen que se envía a la IA: solo la zona de la prenda, con un margen, sobre gris liso.
 * Sin sábanas ni mantas alrededor, el modelo de imagen no mezcla el fondo con la prenda.
 * La máscara se agranda un poco para que, si el recorte local se queda corto, la IA vea la prenda entera.
 * null si el recorte local no parece fiable (entonces se envía la foto completa).
 */
function prepareForAi(work: HTMLCanvasElement, cut: HTMLCanvasElement) {
  const S = 256
  const small = toCanvas(cut, S)
  const sw = small.width, sh = small.height
  const a = small.getContext('2d')!.getImageData(0, 0, sw, sh).data
  const m = new Uint8Array(sw * sh)
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1, on = 0
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (a[(y * sw + x) * 4 + 3] > 60) { m[y * sw + x] = 1; on++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  const cover = on / (sw * sh)
  if (cover < 0.03 || cover > 0.95) return null
  // Dilatación (máximo en un cuadrado de radio r): la máscara crece ~2,5 %
  const r = 6
  const tmp = new Uint8Array(sw * sh), dil = new Uint8Array(sw * sh)
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    let v = 0
    for (let k = Math.max(0, x - r); k <= Math.min(sw - 1, x + r) && !v; k++) v = m[y * sw + k]
    tmp[y * sw + x] = v
  }
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    let v = 0
    for (let k = Math.max(0, y - r); k <= Math.min(sh - 1, y + r) && !v; k++) v = tmp[k * sw + x]
    dil[y * sw + x] = v
  }
  const mc = document.createElement('canvas')
  mc.width = sw; mc.height = sh
  const md = mc.getContext('2d')!.createImageData(sw, sh)
  for (let i = 0; i < sw * sh; i++) { md.data[i * 4 + 3] = dil[i] ? 255 : 0 }
  mc.getContext('2d')!.putImageData(md, 0, 0)
  // Recorte a la zona de la prenda con margen (en coordenadas de la imagen de trabajo)
  const k = work.width / sw
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.08)
  const bx = Math.max(0, (x0 - pad) * k), by = Math.max(0, (y0 - pad) * k)
  const bw = Math.min(work.width, (x1 + pad + 1) * k) - bx, bh = Math.min(work.height, (y1 + pad + 1) * k) - by
  const garment = document.createElement('canvas')
  garment.width = work.width; garment.height = work.height
  const g = garment.getContext('2d')!
  g.drawImage(work, 0, 0)
  g.globalCompositeOperation = 'destination-in'
  g.imageSmoothingEnabled = true
  g.drawImage(mc, 0, 0, work.width, work.height) // máscara ampliada: bordes suaves
  const out = document.createElement('canvas')
  out.width = Math.round(bw); out.height = Math.round(bh)
  const o = out.getContext('2d')!
  o.fillStyle = '#8a8a8a'
  o.fillRect(0, 0, out.width, out.height)
  o.drawImage(garment, bx, by, bw, bh, 0, 0, out.width, out.height)
  return out
}

/** Recorte por croma de la imagen de la IA. null si el resultado no es creíble (se usa el recorte local). */
function cutChroma(src: HTMLCanvasElement, keyHex: string) {
  const c = toCanvas(src, 1024)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const cover = chromaKey(img.data, c.width, c.height, hexToRgb(keyHex))
  if (cover < 0.04 || cover > 0.92) return null // no había un fondo de croma de verdad
  ctx.putImageData(img, 0, 0)
  return trimTransparent(c)
}

/**
 * Procesa una foto: recorte, miniatura y color.
 * Con la IA activada: recorte local para aislar la prenda → la IA genera la foto de producto sobre un
 * fondo de croma → se quita el croma. Sin IA, sin conexión o sin cuota: recorte local de la foto tal cual.
 */
async function process(file: Blob, onPhase: Phase = () => {}, hint?: CategoryId): Promise<Result> {
  const bmp = await decode(file)
  const full = toCanvas(bmp, 1600)
  bmp.close()
  const original = await canvasToBlob(full, 'image/jpeg', 0.82)
  let cut: HTMLCanvasElement | null
  let suggested: CategoryId | undefined
  let aiFallback: AiError['kind'] | undefined
  let aiUsed = false
  if (hasTransparency(full)) {
    cut = trimTransparent(full) // ya viene recortada ("Copiar sujeto" de iOS)
  } else if (await aiConfig()) {
    onPhase({ phase: 'ai' })
    // Primero el recorte local: aísla la prenda para la IA y sirve de plan B si la IA falla
    const seg = await segment(full).catch(() => null)
    const prepared = seg && prepareForAi(seg.work, seg.cut)
    try {
      const ai = await productShot(await canvasToBlob(prepared ?? toCanvas(full, 1024), 'image/jpeg', 0.9), hint)
      suggested = ai.category ?? undefined
      onPhase({ phase: 'cutout', suggested })
      const abmp = await decode(ai.image)
      const aiCanvas = toCanvas(abmp, 1024)
      abmp.close()
      cut = (ai.key && cutChroma(aiCanvas, ai.key)) || (await cutLocal(aiCanvas))
      aiUsed = true
    } catch (e) {
      aiFallback = e instanceof AiError ? e.kind : 'failed'
      console.warn('IA no disponible, recorte local:', e)
      onPhase({ phase: 'cutout', aiFallback })
      cut = seg ? trimTransparent(seg.cut) : await cutLocal(full)
    }
  } else {
    onPhase({ phase: 'cutout' })
    cut = await cutLocal(full)
  }
  if (!cut) throw new Error('No se encontró ninguna prenda en la foto')
  const cutout = await encodeAlpha(toCanvas(cut, 900))
  const thumb = await encodeAlpha(toCanvas(cut, 360), 0.8)
  const palette = extractPalette(samplePixels(cut))
  return { cutout, thumb, original, color: palette[0] ?? PENDING_COLOR, palette, suggested, aiFallback, aiUsed }
}

export function startCapture(file: Blob) {
  discard()
  const id = newId()
  job = {
    id, status: 'processing', previewUrl: URL.createObjectURL(file), pickedAt: Date.now(),
  }
  jobFile = file
  emit()
  const mine = id
  result = process(file, (p) => { if (job?.id === mine) set(p) })
  result.then(async (r) => {
    if (job?.id !== mine) { await applyIfSaved(mine, r); return }
    set({ status: 'ready', cutoutUrl: URL.createObjectURL(r.cutout), color: r.color, palette: r.palette, suggested: r.suggested, aiFallback: r.aiFallback, aiUsed: r.aiUsed })
    await applyIfSaved(mine, r)
  }).catch(async (e) => {
    console.error(e)
    if (job?.id === mine) set({ status: 'failed', error: String(e?.message ?? e) })
    await markFailed(mine, file)
  })
}

// Si la prenda ya se guardó, completa su imagen y color en la base de datos
const savedJobs = new Map<string, string>() // jobId → garmentId
async function applyIfSaved(jobId: string, r: Result) {
  const gid = savedJobs.get(jobId)
  if (!gid) return
  savedJobs.delete(jobId)
  await db.transaction('rw', db.garments, db.images, async () => {
    const g = await db.garments.get(gid)
    if (!g) return
    await db.images.put({ id: g.imageId, cutout: r.cutout, thumb: r.thumb, original: r.original, status: 'ready' })
    if (g.color.name === 'pending') await db.garments.update(gid, { color: r.color, palette: r.palette, updatedAt: Date.now() })
  })
}
async function markFailed(jobId: string, file: Blob) {
  const gid = savedJobs.get(jobId)
  if (!gid) return
  savedJobs.delete(jobId)
  const g = await db.garments.get(gid)
  if (!g) return
  const bmp = await decode(file)
  const c = toCanvas(bmp, 1600); bmp.close()
  const palette = extractPalette(samplePixels(centerCrop(c)))
  await db.images.put({ id: g.imageId, cutout: null, thumb: await canvasToBlob(toCanvas(c, 360), 'image/jpeg', 0.8), original: await canvasToBlob(c, 'image/jpeg', 0.82), status: 'failed' })
  await db.garments.update(gid, { color: palette[0] ?? PENDING_COLOR, palette, updatedAt: Date.now() })
}

/** Guarda la prenda con la categoría elegida. No espera al recorte. */
export async function saveJob(category: CategoryId, color?: ColorInfo): Promise<string> {
  if (!job || !result) throw new Error('No hay foto')
  const j = job
  const now = Date.now()
  const gid = newId()
  const imageId = newId()
  const ready = j.status === 'ready'
  const r = ready ? await result : null
  const garment: Garment = {
    id: gid, name: '', category, color: color ?? r?.color ?? PENDING_COLOR, palette: r?.palette ?? [],
    imageId, washAfter: categoryById(category).washAfter, wearsSinceWash: 0, wearsTotal: 0,
    createdAt: now, updatedAt: now, archived: false,
  }
  const file = jobFile!
  // Mientras se procesa: miniatura de la foto original, y la foto tal cual por si hay que reintentar
  const thumb = r?.thumb ?? (await canvasToBlob(toCanvas(await decode(file), 360), 'image/jpeg', 0.75))
  await db.transaction('rw', db.garments, db.images, async () => {
    await db.images.put(r ? { id: imageId, cutout: r.cutout, thumb: r.thumb, original: r.original, status: 'ready' } : { id: imageId, cutout: null, thumb, original: file, status: 'pending' })
    await db.garments.add(garment)
  })
  set({ savedId: gid })
  if (j.status === 'failed') { savedJobs.set(j.id, gid); await markFailed(j.id, file) }
  else if (!ready) savedJobs.set(j.id, gid)
  return gid
}

export function discard() {
  if (job) { URL.revokeObjectURL(job.previewUrl); if (job.cutoutUrl) URL.revokeObjectURL(job.cutoutUrl) }
  job = null
  jobFile = null
  emit()
}

/** Procesa de nuevo una prenda guardada desde su foto original (con IA si está activada). */
export async function reprocess(garmentId: string): Promise<{ ok: boolean; aiFallback?: AiError['kind'] }> {
  const g = await db.garments.get(garmentId)
  const img = g && (await db.images.get(g.imageId))
  const source = img?.original
  if (!g || !img || !source) return { ok: false }
  const before = img.status
  await db.images.update(img.id, { status: 'pending' })
  try {
    const r = await process(source, undefined, g.category)
    await db.images.put({ id: img.id, cutout: r.cutout, thumb: r.thumb, original: r.original, status: 'ready' })
    await db.garments.update(g.id, { color: r.color, palette: r.palette, updatedAt: Date.now() })
    return { ok: true, aiFallback: r.aiFallback }
  } catch (e) {
    console.error(e)
    await db.images.update(img.id, { status: before === 'ready' ? 'ready' : 'failed' })
    return { ok: false }
  }
}

/** Al abrir la app: las prendas que se quedaron a medias se procesan de nuevo. */
export async function resumePending() {
  const pending = await db.images.where('status').equals('pending').primaryKeys()
  if (!pending.length) return
  const garments = await db.garments.where('imageId').anyOf(pending as string[]).toArray().catch(() => [])
  for (const g of garments) await reprocess(g.id)
}
