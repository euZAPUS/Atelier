import { describe, expect, it } from 'vitest'
import type { CollageItem } from '../db/types'
import type { CategoryId } from './categories'
import { clashWith, outfitHarmony, placeItem } from './outfit'

describe('outfitHarmony', () => {
  it('vacío', () => expect(outfitHarmony([]).verdict).toBe('empty'))
  it('neutros siempre combinan', () => expect(outfitHarmony(['black', 'white', 'denim']).verdict).toBe('good'))
  it('rojo y verde chocan (regla de ZAP)', () => {
    const h = outfitHarmony(['red', 'green', 'black'])
    expect(h.verdict).toBe('clash')
    expect(h.clashes).toEqual([['red', 'green']])
  })
  it('beige y mostaza: beige es neutro, pero la regla de ZAP manda', () => {
    expect(clashWith('mustard', ['beige'])).toBeUndefined() // beige neutro: no bloquea
  })
  it('demasiados colores fuertes', () => expect(outfitHarmony(['red', 'yellow', 'purple']).verdict).not.toBe('good'))
  it('ignora colores pendientes y repetidos', () => expect(outfitHarmony(['pending', 'black', 'black']).verdict).toBe('good'))
})

describe('placeItem', () => {
  const cats: Record<string, CategoryId> = { a: 'footwear', b: 'footwear', c: 'headwear' }
  it('cada categoría a su hueco y encima de lo anterior', () => {
    const items: CollageItem[] = []
    const shoe = placeItem('footwear', 'a', items, (id) => cats[id])
    expect(shoe.y).toBeGreaterThan(0.8)
    const cap = placeItem('headwear', 'c', [shoe], (id) => cats[id])
    expect(cap.y).toBeLessThan(0.2)
    expect(cap.z).toBe(shoe.z + 1)
  })
  it('si el hueco está ocupado se aparta', () => {
    const shoe = placeItem('footwear', 'a', [], (id) => cats[id])
    const other = placeItem('footwear', 'b', [shoe], (id) => cats[id])
    expect(other.x).not.toBe(shoe.x)
  })
})
