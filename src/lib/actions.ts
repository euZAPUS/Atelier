// Acciones del día a día sobre las prendas. Cada una devuelve cómo deshacerla.
import { db, newId } from '../db/db'
import type { DayPlan, Garment } from '../db/types'
import { applyWash, applyWear, today } from '../domain/wash'

type Undo = () => Promise<void>
const snapshot = (g: Garment) => ({ wearsSinceWash: g.wearsSinceWash, wearsTotal: g.wearsTotal, lastWornAt: g.lastWornAt, manualDirty: g.manualDirty, updatedAt: g.updatedAt })

/** "Me la he puesto": +1 uso y queda anotado en el registro de usos (para estadísticas y calendario). */
export async function wearGarment(id: string, date = today()): Promise<Undo> {
  const logId = newId()
  let before: ReturnType<typeof snapshot> | undefined
  await db.transaction('rw', db.garments, db.wearLog, async () => {
    const g = await db.garments.get(id)
    if (!g) return
    before = snapshot(g)
    await db.garments.update(id, { ...applyWear(g, date), updatedAt: Date.now() })
    await db.wearLog.add({ id: logId, date, garmentIds: [id] })
  })
  return async () => {
    if (!before) return
    await db.transaction('rw', db.garments, db.wearLog, async () => {
      await db.garments.update(id, before!)
      await db.wearLog.delete(logId)
    })
  }
}

/** Lavadora: todas las prendas elegidas vuelven a estar limpias. */
export async function washGarments(ids: string[]): Promise<Undo> {
  const before = new Map<string, ReturnType<typeof snapshot>>()
  await db.transaction('rw', db.garments, async () => {
    for (const g of await db.garments.bulkGet(ids)) {
      if (!g) continue
      before.set(g.id, snapshot(g))
      await db.garments.update(g.id, { ...applyWash(), updatedAt: Date.now() })
    }
  })
  return async () => {
    await db.transaction('rw', db.garments, async () => {
      for (const [id, s] of before) await db.garments.update(id, s)
    })
  }
}

/** Marcar a mano como sucia (o quitar la marca). */
export async function setDirty(id: string, dirty: boolean): Promise<Undo> {
  const g = await db.garments.get(id)
  if (!g) return async () => {}
  const before = snapshot(g)
  // Quitar la marca de sucia a una prenda sucia por usos = lavarla
  await db.garments.update(id, dirty ? { manualDirty: true, updatedAt: Date.now() } : { ...applyWash(), updatedAt: Date.now() })
  return async () => { await db.garments.update(id, before) }
}

/** "Me lo pongo hoy" con un outfit: +1 uso a cada prenda y una sola entrada en el registro, ligada al outfit. */
export async function wearOutfit(outfitId: string, garmentIds: string[], date = today()): Promise<Undo> {
  const logId = newId()
  const before = new Map<string, ReturnType<typeof snapshot>>()
  let plan: DayPlan | undefined
  await db.transaction('rw', db.garments, db.wearLog, db.plans, async () => {
    for (const g of await db.garments.bulkGet(garmentIds)) {
      if (!g) continue
      before.set(g.id, snapshot(g))
      await db.garments.update(g.id, { ...applyWear(g, date), updatedAt: Date.now() })
    }
    await db.wearLog.add({ id: logId, date, outfitId, garmentIds: [...before.keys()] })
    // El día queda como "puesto" en la semana
    plan = await db.plans.get(date)
    await db.plans.put({ date, outfitId, worn: true })
  })
  return async () => {
    await db.transaction('rw', db.garments, db.wearLog, db.plans, async () => {
      for (const [id, s] of before) await db.garments.update(id, s)
      await db.wearLog.delete(logId)
      if (plan) await db.plans.put(plan); else await db.plans.delete(date)
    })
  }
}

/** Eliminar un outfit (con deshacer). */
export async function deleteOutfit(id: string): Promise<Undo> {
  const o = await db.outfits.get(id)
  // Los días planificados con este outfit (y aún no puestos) se quedan sin plan
  const plans = (await db.plans.where('outfitId').equals(id).toArray()).filter((p) => !p.worn)
  await db.transaction('rw', db.outfits, db.plans, async () => {
    await db.outfits.delete(id)
    await db.plans.bulkDelete(plans.map((p) => p.date))
  })
  return async () => { if (o) await db.outfits.put(o); await db.plans.bulkPut(plans) }
}

/** Planificar un outfit para un día (o quitarlo con null). */
export async function planDay(date: string, outfitId: string | null): Promise<Undo> {
  const prev = await db.plans.get(date)
  if (outfitId) await db.plans.put({ date, outfitId, worn: false })
  else await db.plans.delete(date)
  return async () => { if (prev) await db.plans.put(prev); else await db.plans.delete(date) }
}
