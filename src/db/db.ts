import Dexie, { type EntityTable } from 'dexie'
import { migrateLegacy } from '../domain/categories'
import type { DayPlan, Garment, GarmentImage, Outfit, Settings, WearLog } from './types'

export const SCHEMA_VERSION = 3

// Solo se indexan los campos por los que se filtra u ordena.
export const db = new Dexie('atelier') as Dexie & {
  garments: EntityTable<Garment, 'id'>
  images: EntityTable<GarmentImage, 'id'>
  outfits: EntityTable<Outfit, 'id'>
  plans: EntityTable<DayPlan, 'date'>
  wearLog: EntityTable<WearLog, 'id'>
  settings: EntityTable<Settings, 'id'>
}

db.version(1).stores({
  garments: 'id, category, archived, createdAt, lastWornAt, wearsTotal',
  images: 'id, status',
  outfits: 'id, updatedAt, *tags',
  plans: 'date, outfitId',
  wearLog: 'id, date, *garmentIds',
  settings: 'id',
})

// v2: índice por imageId (para reanudar recortes a medias)
db.version(2).stores({
  garments: 'id, category, archived, createdAt, lastWornAt, wearsTotal, imageId',
})

// v3: catálogo de 10 categorías con tipos (polos, camisas, chándal, gorras…). Se migran las prendas antiguas.
db.version(3).stores({}).upgrade(async (tx) => {
  await tx.table('garments').toCollection().modify((g: { category: string; subcategory?: string; type?: string; washAfter: number | null }) => {
    const m = migrateLegacy(g)
    if (!m) return
    g.category = m.category
    if (m.type) { g.type = m.type; if (g.subcategory && /vaquer|jean|polo|gorr|mochil|zapatill|ch[aá]ndal/i.test(g.subcategory)) delete g.subcategory }
  })
})

export const newId = () => crypto.randomUUID()
