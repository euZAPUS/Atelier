// Flujo de alta rápida. La foto se procesa en segundo plano y la prenda se puede guardar
// ANTES de que acabe el recorte: cuando termina, se actualiza sola en el armario.
import { useSyncExternalStore } from 'react'
import { db, newId } from '../../db/db'
import type { ColorInfo, Garment } from '../../db/types'
import { categoryById, type CategoryId } from '../../domain/categories'
import { extractPalette } from '../../domain/color'
import { removeBackground, warmUp } from '../../lib/bg'
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
}

interface Result { cutout: Blob; thumb: Blob; original: Blob; color: ColorInfo; palette: ColorInfo[] }

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

/** Procesa una foto: recorte, miniatura y color. */
async function process(file: Blob): Promise<Result> {
  const bmp = await decode(file)
  const full = toCanvas(bmp, 1600)
  bmp.close()
  const original = await canvasToBlob(full, 'image/jpeg', 0.82)
  let cut: HTMLCanvasElement | null
  if (hasTransparency(full)) {
    cut = trimTransparent(full) // ya viene recortada ("Copiar sujeto" de iOS)
  } else {
    const work = toCanvas(full, 1024) // el modelo trabaja a 1024: más no mejora y tarda más
    const png = await removeBackground(await canvasToBlob(work, 'image/jpeg', 0.9))
    const cbmp = await decode(png)
    const cc = toCanvas(cbmp, 1024)
    cbmp.close()
    cut = trimTransparent(cc)
  }
  if (!cut) throw new Error('No se encontró ninguna prenda en la foto')
  const cutout = await encodeAlpha(toCanvas(cut, 900))
  const thumb = await encodeAlpha(toCanvas(cut, 360), 0.8)
  const palette = extractPalette(samplePixels(cut))
  return { cutout, thumb, original, color: palette[0] ?? PENDING_COLOR, palette }
}

export function startCapture(file: Blob) {
  discard()
  const id = newId()
  job = {
    id, status: 'processing', previewUrl: URL.createObjectURL(file),
  }
  jobFile = file
  emit()
  const mine = id
  result = process(file)
  result.then(async (r) => {
    if (job?.id !== mine) { await applyIfSaved(mine, r); return }
    set({ status: 'ready', cutoutUrl: URL.createObjectURL(r.cutout), color: r.color, palette: r.palette })
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

/** Reintenta el recorte de una prenda guardada (si falló o se cerró la app a medias). */
export async function reprocess(garmentId: string) {
  const g = await db.garments.get(garmentId)
  const img = g && (await db.images.get(g.imageId))
  const source = img?.original
  if (!g || !img || !source) return
  await db.images.update(img.id, { status: 'pending' })
  try {
    const r = await process(source)
    await db.images.put({ id: img.id, cutout: r.cutout, thumb: r.thumb, original: r.original, status: 'ready' })
    await db.garments.update(g.id, { color: r.color, palette: r.palette, updatedAt: Date.now() })
  } catch (e) {
    console.error(e)
    await db.images.update(img.id, { status: 'failed' })
  }
}

/** Al abrir la app: las prendas que se quedaron a medias se procesan de nuevo. */
export async function resumePending() {
  const pending = await db.images.where('status').equals('pending').primaryKeys()
  if (!pending.length) return
  const garments = await db.garments.where('imageId').anyOf(pending as string[]).toArray().catch(() => [])
  for (const g of garments) await reprocess(g.id)
}
