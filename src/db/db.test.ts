import { expect, it } from 'vitest'
import { db, newId } from './db'

it('abre la base de datos y guarda ajustes', async () => {
  await db.settings.put({ id: 'settings', theme: 'system', lang: 'es', washDefaults: {}, schemaVersion: 1 })
  expect((await db.settings.get('settings'))?.lang).toBe('es')
  expect(newId()).toMatch(/^[0-9a-f-]{36}$/)
})
