import Dexie from 'dexie'
import { expect, it } from 'vitest'

it('al abrir la app nueva, las prendas antiguas pasan al catálogo nuevo', async () => {
  // Base con el esquema anterior (v2) y prendas del catálogo viejo
  const old = new Dexie('atelier-migracion')
  old.version(1).stores({ garments: 'id, category, archived, createdAt, lastWornAt, wearsTotal', images: 'id, status', outfits: 'id, updatedAt, *tags', plans: 'date, outfitId', wearLog: 'id, date, *garmentIds', settings: 'id' })
  old.version(2).stores({ garments: 'id, category, archived, createdAt, lastWornAt, wearsTotal, imageId' })
  await old.open()
  await old.table('garments').bulkAdd([
    { id: 'a', category: 'longsleeves', washAfter: 2 },
    { id: 'b', category: 'trousers', subcategory: 'Vaquero', washAfter: 4 },
    { id: 'c', category: 'hoodies', washAfter: 3 },
  ])
  old.close()
  // La app nueva abre la misma base (mismo esquema que src/db/db.ts, con otro nombre para el test)
  const { db } = await import('./db')
  const fresh = new Dexie('atelier-migracion')
  for (const v of [1, 2, 3] as const) {
    const def = (db as unknown as { _versions: { _cfg: { version: number; storesSource: Record<string, string>; contentUpgrade?: (tx: unknown) => unknown } }[] })._versions.find((x) => x._cfg.version === v)!
    const ver = fresh.version(v).stores(def._cfg.storesSource)
    if (def._cfg.contentUpgrade) ver.upgrade(def._cfg.contentUpgrade as never)
  }
  await fresh.open()
  const all = await fresh.table('garments').toArray()
  expect(all.find((g) => g.id === 'a')).toMatchObject({ category: 'tshirts', type: 'longsleeve' })
  expect(all.find((g) => g.id === 'b')).toMatchObject({ category: 'trousers', type: 'jeans' })
  expect(all.find((g) => g.id === 'b').subcategory).toBeUndefined()
  expect(all.find((g) => g.id === 'c')).toMatchObject({ category: 'hoodies' })
})
