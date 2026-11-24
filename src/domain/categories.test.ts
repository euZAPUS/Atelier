import { describe, expect, it } from 'vitest'
import { CATEGORIES, defaultWash, migrateLegacy, typeById } from './categories'
import { es } from '../i18n/es'

describe('catálogo', () => {
  it('ids de tipo únicos y cada categoría con tipos y etiqueta', () => {
    const ids = CATEGORIES.flatMap((c) => c.types.map((t) => t.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of CATEGORIES) {
      expect(c.types.length).toBeGreaterThan(0)
      expect(es.categories[c.id]).toBeTruthy()
    }
  })
  it('usos antes de lavar: el tipo manda', () => {
    expect(defaultWash('trousers', 'jeans')).toBe(4)
    expect(defaultWash('trousers')).toBe(3)
    expect(defaultWash('accessories', 'socks')).toBe(1)
    expect(defaultWash('footwear', 'sneakers')).toBeNull()
    expect(defaultWash('tshirts', 'tee')).toBe(1)
  })
  it('el tipo solo vale dentro de su categoría', () => {
    expect(typeById('trousers', 'jeans')?.es).toBe('Vaquero')
    expect(typeById('hoodies', 'jeans')).toBeUndefined()
  })
  it('migra las prendas del catálogo anterior', () => {
    expect(migrateLegacy({ category: 'longsleeves' })).toEqual({ category: 'tshirts', type: 'longsleeve' })
    expect(migrateLegacy({ category: 'trousers', subcategory: 'Vaquero' })).toEqual({ category: 'trousers', type: 'jeans' })
    expect(migrateLegacy({ category: 'accessories', subcategory: 'Gorra' })).toEqual({ category: 'headwear', type: 'cap' })
    expect(migrateLegacy({ category: 'hoodies' })).toBeNull()
  })
})
