import type { Garment, GarmentStatus } from '../db/types'

// El estado no se guarda: se calcula a partir de los usos. Así nunca se desincroniza.
export function garmentStatus(g: Pick<Garment, 'wearsSinceWash' | 'washAfter' | 'manualDirty'>): GarmentStatus {
  if (g.manualDirty) return 'dirty' // "me he manchado" manda aunque no se ensucie por uso
  if (g.washAfter === null) return 'clean'
  if (g.wearsSinceWash >= g.washAfter) return 'dirty'
  if (g.wearsSinceWash > 0) return 'worn'
  return 'clean'
}

type WashFields = Pick<Garment, 'wearsSinceWash' | 'wearsTotal' | 'lastWornAt' | 'manualDirty'>

/** Ponérsela un día: +1 uso desde el último lavado y +1 en total. */
export function applyWear(g: WashFields, date: string): Partial<Garment> {
  return { wearsSinceWash: g.wearsSinceWash + 1, wearsTotal: g.wearsTotal + 1, lastWornAt: !g.lastWornAt || date > g.lastWornAt ? date : g.lastWornAt }
}

/** Lavarla: vuelve a estar limpia. */
export function applyWash(): Partial<Garment> {
  return { wearsSinceWash: 0, manualDirty: false }
}

/** Usos que le quedan antes de lavar (null = no se ensucia por uso). */
export function wearsLeft(g: Pick<Garment, 'wearsSinceWash' | 'washAfter' | 'manualDirty'>): number | null {
  if (g.washAfter === null) return null
  if (g.manualDirty) return 0
  return Math.max(0, g.washAfter - g.wearsSinceWash)
}

/** Fecha local de hoy en formato YYYY-MM-DD (no UTC: a las 00:30 en España sigue siendo "hoy"). */
export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Días entre una fecha YYYY-MM-DD y hoy, contando en hora local. */
export function daysAgo(date: string, now = new Date()) {
  const [y, m, d] = date.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((start.getTime() - then.getTime()) / 86_400_000))
}
