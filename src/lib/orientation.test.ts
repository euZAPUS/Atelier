import { describe, expect, it } from 'vitest'
import { voteRotation } from './orientation'

const up = { rotation: 0 as const }, down = { rotation: 180 as const }, side = { rotation: 90 as const, sideways: true }

describe('voteRotation', () => {
  it('foto derecha', () => expect(voteRotation([up, side, down, side])).toBe(0))
  it('foto del revés', () => expect(voteRotation([down, side, up, side])).toBe(180))
  it('cuello a la derecha (hay que girar 270)', () => expect(voteRotation([side, down, side, up])).toBe(270))
  it('cuello a la izquierda (hay que girar 90)', () => expect(voteRotation([side, up, side, down])).toBe(90))
  it('caso real: con el cuello a la izquierda el modelo dijo "abajo" en la original', () => {
    // original: dice 180 (falso); girada 90: derecha (bien); girada 180: de lado; girada 270: del revés (bien)
    expect(voteRotation([down, up, side, down])).toBe(90)
  })
  it('sin respuestas útiles, no se gira', () => expect(voteRotation([side, side, null, undefined])).toBe(0))
})
