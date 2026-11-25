// Copia de seguridad: todo el armario (prendas, fotos, outfits, semana y registro de usos) en un único
// archivo .json que guardas donde quieras (Archivos, iCloud, correo…). Los ajustes del dispositivo no van.
import { db, SCHEMA_VERSION } from '../db/db'
import type { DayPlan, Garment, GarmentImage, Outfit, WearLog } from '../db/types'

const APP = 'atelier-backup'
type Img = { mime: string; b64: string }
type ImageOut = { id: string; status: GarmentImage['status']; cutout: Img | null; thumb: Img; original?: Img }
export interface BackupFile {
  app: typeof APP; schema: number; exportedAt: string
  garments: Garment[]; images: ImageOut[]; outfits: Outfit[]; plans: DayPlan[]; wearLog: WearLog[]
}

async function toB64(b: Blob): Promise<Img> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { mime: b.type || 'application/octet-stream', b64: btoa(s) }
}
function fromB64(i: Img): Blob {
  const s = atob(i.b64)
  const bytes = new Uint8Array(s.length)
  for (let k = 0; k < s.length; k++) bytes[k] = s.charCodeAt(k)
  return new Blob([bytes], { type: i.mime })
}

export async function exportBackup(): Promise<Blob> {
  const [garments, imgs, outfits, plans, wearLog] = await Promise.all([
    db.garments.toArray(), db.images.toArray(), db.outfits.toArray(), db.plans.toArray(), db.wearLog.toArray(),
  ])
  const images: ImageOut[] = []
  for (const i of imgs) {
    images.push({
      id: i.id, status: i.status, thumb: await toB64(i.thumb),
      cutout: i.cutout ? await toB64(i.cutout) : null,
      ...(i.original ? { original: await toB64(i.original) } : {}),
    })
  }
  const file: BackupFile = { app: APP, schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), garments, images, outfits, plans, wearLog }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

export class BackupError extends Error {}

/** Lee y comprueba un archivo de copia (sin tocar la base de datos). */
export async function readBackup(file: Blob): Promise<BackupFile> {
  let data: BackupFile
  try { data = JSON.parse(await file.text()) } catch { throw new BackupError('invalid') }
  if (data?.app !== APP || !Array.isArray(data.garments) || !Array.isArray(data.images)) throw new BackupError('invalid')
  if (data.schema > SCHEMA_VERSION) throw new BackupError('newer')
  return data
}

/** Sustituye TODO el armario por el de la copia. */
export async function restoreBackup(data: BackupFile) {
  const images: GarmentImage[] = data.images.map((i) => ({
    id: i.id, status: i.status, thumb: fromB64(i.thumb), cutout: i.cutout ? fromB64(i.cutout) : null,
    ...(i.original ? { original: fromB64(i.original) } : {}),
  }))
  await db.transaction('rw', [db.garments, db.images, db.outfits, db.plans, db.wearLog], async () => {
    await Promise.all([db.garments.clear(), db.images.clear(), db.outfits.clear(), db.plans.clear(), db.wearLog.clear()])
    await db.garments.bulkPut(data.garments)
    await db.images.bulkPut(images)
    await db.outfits.bulkPut(data.outfits ?? [])
    await db.plans.bulkPut(data.plans ?? [])
    await db.wearLog.bulkPut(data.wearLog ?? [])
  })
}

export const backupName = (d = new Date()) => `atelier-${d.toISOString().slice(0, 10)}.json`

/** Guardar: en el iPhone abre la hoja de compartir (Guardar en Archivos); si no, descarga. */
export async function saveBackup(blob: Blob) {
  const file = new File([blob], backupName(), { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ files: [file] }); return 'shared' as const } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled' as const }
  }
  const url = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded' as const
}
