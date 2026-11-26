import { expect, it } from 'vitest'
import { db } from '../db/db'
import { BackupError, exportBackup, readBackup, restoreBackup } from './backup'

it('exporta y restaura el armario completo, fotos incluidas', async () => {
  const bytes = new Uint8Array(70_000).map((_, i) => i % 251) // más grande que un trozo de base64
  await db.images.put({ id: 'i1', status: 'ready', thumb: new Blob([bytes], { type: 'image/webp' }), cutout: new Blob(['cut'], { type: 'image/webp' }) })
  await db.garments.put({ id: 'g1', name: '', category: 'tshirts', color: { hex: '#000', name: 'black', lab: [0, 0, 0] }, palette: [], imageId: 'i1', washAfter: 1, wearsSinceWash: 0, manualDirty: false, wearsTotal: 2, createdAt: 1, updatedAt: 1, archived: false } as never)
  await db.outfits.put({ id: 'o1', name: 'A', items: [{ garmentId: 'g1', x: .5, y: .5, scale: 1, rotation: 0, z: 1 }], tags: [], createdAt: 1, updatedAt: 1 })
  await db.plans.put({ date: '2026-11-25', outfitId: 'o1', worn: true })
  const blob = await exportBackup()

  await db.garments.clear(); await db.images.clear(); await db.outfits.clear(); await db.plans.clear()
  await db.garments.put({ id: 'otra' } as never) // lo que haya se sustituye
  await restoreBackup(await readBackup(blob))

  expect((await db.garments.toArray()).map((g) => g.id)).toEqual(['g1'])
  const img = await db.images.get('i1')
  expect(new Uint8Array(await img!.thumb.arrayBuffer())).toEqual(bytes)
  expect(img!.thumb.type).toBe('image/webp')
  expect(await img!.cutout!.text()).toBe('cut')
  expect((await db.plans.get('2026-11-25'))?.worn).toBe(true)
})

it('rechaza archivos que no son copias', async () => {
  await expect(readBackup(new Blob(['{"hola":1}']))).rejects.toBeInstanceOf(BackupError)
  await expect(readBackup(new Blob(['no es json']))).rejects.toBeInstanceOf(BackupError)
})

it('recordatorio de copia', async () => {
  const { backupDue } = await import('./backup')
  const now = Date.parse('2026-11-26T12:00:00Z')
  expect(backupDue(3, null, now)).toBe(false) // pocas prendas
  expect(backupDue(5, null, now)).toBe(true) // nunca
  expect(backupDue(5, '2026-11-20T12:00:00Z', now)).toBe(false)
  expect(backupDue(5, '2026-11-01T12:00:00Z', now)).toBe(true)
})
