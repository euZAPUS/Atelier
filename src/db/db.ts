import Dexie, { type EntityTable } from 'dexie'
import type { DayPlan, Garment, GarmentImage, Outfit, Settings, WearLog } from './types'

export const SCHEMA_VERSION = 1

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

export const newId = () => crypto.randomUUID()
