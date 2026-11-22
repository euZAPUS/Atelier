import { describe, expect, it } from 'vitest'
import { garmentStatus } from './wash'

describe('garmentStatus', () => {
  it('limpia sin usos', () => expect(garmentStatus({ wearsSinceWash: 0, washAfter: 3 })).toBe('clean'))
  it('usada antes del límite', () => expect(garmentStatus({ wearsSinceWash: 2, washAfter: 3 })).toBe('worn'))
  it('sucia al llegar al límite', () => expect(garmentStatus({ wearsSinceWash: 1, washAfter: 1 })).toBe('dirty'))
  it('sucia a mano', () => expect(garmentStatus({ wearsSinceWash: 0, washAfter: 3, manualDirty: true })).toBe('dirty'))
  it('calzado nunca se ensucia', () => expect(garmentStatus({ wearsSinceWash: 40, washAfter: null })).toBe('clean'))
})
