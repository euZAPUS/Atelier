import { describe, expect, it } from 'vitest'
import { applyWash, applyWear, daysAgo, garmentStatus, today, wearsLeft } from './wash'

const base = { wearsSinceWash: 0, wearsTotal: 0, washAfter: 3 as number | null, manualDirty: false, lastWornAt: undefined as string | undefined }

describe('estados', () => {
  it('limpia sin usos', () => expect(garmentStatus({ wearsSinceWash: 0, washAfter: 3 })).toBe('clean'))
  it('usada antes del límite', () => expect(garmentStatus({ wearsSinceWash: 2, washAfter: 3 })).toBe('worn'))
  it('sucia al llegar al límite', () => expect(garmentStatus({ wearsSinceWash: 1, washAfter: 1 })).toBe('dirty'))
  it('sucia a mano', () => expect(garmentStatus({ wearsSinceWash: 0, washAfter: 3, manualDirty: true })).toBe('dirty'))
  it('calzado nunca se ensucia por uso…', () => expect(garmentStatus({ wearsSinceWash: 40, washAfter: null })).toBe('clean'))
  it('…pero sí si la marcas a mano', () => expect(garmentStatus({ wearsSinceWash: 0, washAfter: null, manualDirty: true })).toBe('dirty'))
})

describe('usar y lavar', () => {
  it('una camiseta (1 uso) queda sucia al ponérsela', () => {
    const g = { ...base, washAfter: 1 }
    const after = { ...g, ...applyWear(g, '2026-11-25') }
    expect(after).toMatchObject({ wearsSinceWash: 1, wearsTotal: 1, lastWornAt: '2026-11-25' })
    expect(garmentStatus(after)).toBe('dirty')
  })
  it('un vaquero (4 usos) pasa por usada antes de sucia', () => {
    let g: typeof base = { ...base, washAfter: 4 }
    const seen: string[] = []
    for (let i = 0; i < 4; i++) { g = { ...g, ...applyWear(g, `2026-11-2${i}`) } as typeof base; seen.push(garmentStatus(g)) }
    expect(seen).toEqual(['worn', 'worn', 'worn', 'dirty'])
    expect(wearsLeft(g)).toBe(0)
  })
  it('lavar la deja limpia y conserva el total', () => {
    const g = { ...base, wearsSinceWash: 4, wearsTotal: 9, manualDirty: true }
    const after = { ...g, ...applyWash() }
    expect(garmentStatus(after)).toBe('clean')
    expect(after.wearsTotal).toBe(9)
  })
  it('un uso de una fecha anterior no retrasa el último uso', () => {
    expect(applyWear({ ...base, lastWornAt: '2026-11-25' }, '2026-11-20').lastWornAt).toBe('2026-11-25')
  })
  it('hoy en hora local', () => expect(today(new Date(2026, 10, 25, 0, 30))).toBe('2026-11-25'))
})

describe('daysAgo', () => {
  it('hoy, aunque sean las 00:30', () => expect(daysAgo('2026-11-25', new Date(2026, 10, 25, 0, 30))).toBe(0))
  it('ayer por la noche', () => expect(daysAgo('2026-11-24', new Date(2026, 10, 25, 23, 50))).toBe(1))
  it('hace una semana', () => expect(daysAgo('2026-11-18', new Date(2026, 10, 25, 12))).toBe(7))
})
