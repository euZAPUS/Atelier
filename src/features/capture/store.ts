// Flujo de alta rápida. La foto se procesa en segundo plano y la prenda se puede guardar
// ANTES de que acabe el recorte: cuando termina, se actualiza sola en el armario.
import { useSyncExternalStore } from 'react'
import { db, newId } from '../../db/db'
import type { ColorInfo, Garment } from '../../db/types'
import { defaultWash, typeById, type CategoryId } from '../../domain/categories'
import { extractPalette, nameWithWords } from '../../domain/color'
import { AiError, aiConfig, aiIdentify, productShot } from '../../lib/ai'
import { removeBackground, warmUp } from '../../lib/bg'
import { keyOut } from '../../lib/chroma'
import { ROTS, voteRotation } from '../../lib/orientation'
import { canvasToBlob, centerCrop, decode, encodeAlpha, hasTransparency, rotateCanvas, samplePixels, toCanvas, trimTransparent } from '../../lib/image'

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
  suggestedType?: string // tipo que propone la IA (dentro de esa categoría)
  aiFallback?: AiError['kind'] // la IA no se pudo usar y se recortó en el móvil
  aiUsed?: boolean // la imagen es una foto de producto generada por la IA
  pickedAt: number // hora de la foto (para mostrarla)
}

interface Result { cutout: Blob; thumb: Blob; original: Blob; color: ColorInfo; palette: ColorInfo[]; suggested?: CategoryId; suggestedType?: string; aiFallback?: AiError['kind']; aiUsed?: boolean }
type Phase = (p: { phase: 'ai' | 'cutout'; suggested?: CategoryId; suggestedType?: string; aiFallback?: AiError['kind'] }) => void

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

/** Recorte del fondo liso de la imagen de la IA. null si el resultado no es creíble (se usa el recorte local). */
function cutPlain(src: HTMLCanvasElement) {
  const c = toCanvas(src, 1024)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const cover = keyOut(img.data, c.width, c.height)
  if (cover < 0.04 || cover > 0.92) return null // no había un fondo liso de verdad
  ctx.putImageData(img, 0, 0)
  return trimTransparent(c)
}

/**
 * Procesa una foto: recorte, miniatura y color.
 * Con la IA activada: recorte local para aislar la prenda → la IA genera la foto de producto sobre un
 * fondo neutro liso → se quita ese fondo. Los nombres de color los pone la IA (los ve mejor). Sin IA, sin conexión o sin cuota: recorte local de la foto tal cual.
 */
async function process(file: Blob, onPhase: Phase = () => {}, hint?: CategoryId): Promise<Result> {
  const bmp = await decode(file)
  const full = toCanvas(bmp, 1600)
  bmp.close()
  let original = await canvasToBlob(full, 'image/jpeg', 0.82)
  let cut: HTMLCanvasElement | null
  let suggested: CategoryId | undefined
  let suggestedType: string | undefined
  let aiFallback: AiError['kind'] | undefined
  let aiUsed = false
  let words: string[] = []
  if (hasTransparency(full)) {
    cut = trimTransparent(full) // ya viene recortada ("Copiar sujeto" de iOS)
  } else if (await aiConfig()) {
    onPhase({ phase: 'ai' })
    let src = full
    try {
      // 1. Qué prenda es y si la foto está girada (rápido)
      const ask = (c: HTMLCanvasElement) => canvasToBlob(toCanvas(c, 768), 'image/jpeg', 0.85).then((b) => aiIdentify(b, hint)).catch((e) => {
        if (e instanceof AiError && e.kind !== 'failed') throw e // sin conexión / sin cuota: directo al plan B
        return null
      })
      // Orientación: si la IA ve el cuello arriba (lo normal, y ahí no falla) basta una pregunta.
      // Si no, se pregunta a la vez por los 4 giros y se vota: cada respuesta implica un giro
      // (el de esa foto + el que pide la IA) y gana la mayoría. Un fallo suelto del modelo ya no decide.
      let id = await ask(full)
      let rotation: (typeof ROTS)[number] = 0
      if (id && (id.rotation !== 0 || id.sideways)) {
        const answers = await Promise.all(ROTS.map((r) => (r === 0 ? Promise.resolve(id) : ask(rotateCanvas(full, r)))))
        rotation = voteRotation(answers)
        // Categoría y tipo, de la respuesta que vio la foto ya derecha
        id = answers[ROTS.indexOf(rotation)] ?? id
      }
      if (rotation) {
        src = rotateCanvas(full, rotation) // la prenda, derecha (cuello arriba)
        original = await canvasToBlob(src, 'image/jpeg', 0.82)
      }
      if (id?.category) onPhase({ phase: 'ai', suggested: id.category, suggestedType: id.type })
      // 2. Foto de producto sobre fondo neutro
      const ai = await productShot(await canvasToBlob(toCanvas(src, 1024), 'image/jpeg', 0.9), hint, id)
      suggested = ai.category ?? undefined
      suggestedType = id?.type ?? ai.type
      onPhase({ phase: 'cutout', suggested, suggestedType })
      const abmp = await decode(ai.image)
      const aiCanvas = toCanvas(abmp, 1024)
      abmp.close()
      cut = cutPlain(aiCanvas) || (await cutLocal(aiCanvas))
      words = ai.colors
      aiUsed = true
    } catch (e) {
      aiFallback = e instanceof AiError ? e.kind : 'failed'
      console.warn('IA no disponible, recorte local:', e)
      onPhase({ phase: 'cutout', aiFallback })
      cut = await cutLocal(src)
    }
  } else {
    onPhase({ phase: 'cutout' })
    cut = await cutLocal(full)
  }
  if (!cut) throw new Error('No se encontró ninguna prenda en la foto')
  const cutout = await encodeAlpha(toCanvas(cut, 900))
  const thumb = await encodeAlpha(toCanvas(cut, 360), 0.8)
  const palette = nameWithWords(extractPalette(samplePixels(cut)), words)
  return { cutout, thumb, original, color: palette[0] ?? PENDING_COLOR, palette, suggested, suggestedType, aiFallback, aiUsed }
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
    set({ status: 'ready', cutoutUrl: URL.createObjectURL(r.cutout), color: r.color, palette: r.palette, suggested: r.suggested, suggestedType: r.suggestedType, aiFallback: r.aiFallback, aiUsed: r.aiUsed })
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
  // El tipo que propuso la IA, si la categoría elegida es la suya
  const sType = j.suggested === category && typeById(category, j.suggestedType) ? j.suggestedType : undefined
  const garment: Garment = {
    id: gid, name: '', category, type: sType, color: color ?? r?.color ?? PENDING_COLOR, palette: r?.palette ?? [],
    imageId, washAfter: defaultWash(category, sType), wearsSinceWash: 0, wearsTotal: 0,
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

/** Vuelve a procesar la foto actual; con `rotate`, girada 90° en sentido horario. */
export async function retryJob(rotate: boolean) {
  if (!jobFile || job?.savedId) return
  let file = jobFile
  if (rotate) {
    const bmp = await decode(file)
    const c = rotateCanvas(toCanvas(bmp, 2048), 90)
    bmp.close()
    file = await canvasToBlob(c, 'image/jpeg', 0.92)
  }
  startCapture(file)
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
