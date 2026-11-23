import { describe, expect, it } from 'vitest'
import { NAMED_COLORS } from './color'
import { clashesFor, combine, MATCHES, matchesFor } from './harmony'

describe('harmony', () => {
  it('todos los colores con nombre tienen combinaciones válidas', () => {
    const ids = NAMED_COLORS.map((c) => c.id)
    for (const id of ids) {
      expect(matchesFor(id).length).toBeGreaterThan(0)
      for (const m of MATCHES[id]) expect(ids).toContain(m)
    }
  })
  it('reglas de ZAP', () => {
    expect(combine('red', 'green')).toBe(false)
    expect(combine('green', 'red')).toBe(false)
    expect(combine('beige', 'mustard')).toBe(false)
    for (const c of ['black', 'white', 'grey', 'denim']) expect(combine('red', c)).toBe(true)
  })
  it('una combinación nunca es a la vez un choque', () => {
    for (const [c, list] of Object.entries(MATCHES)) for (const m of list) expect(clashesFor(c)).not.toContain(m)
  })
})
