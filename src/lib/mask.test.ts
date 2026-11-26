import { expect, it } from 'vitest'
import { keepMainBlob } from './mask'

const img = (w: number, h: number, rects: [number, number, number, number][]) => {
  const d = new Uint8ClampedArray(w * h * 4)
  for (const [x0, y0, x1, y1] of rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d[(y * w + x) * 4 + 3] = 255
  return d
}
const alphaAt = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3]

it('se queda con la prenda y borra lo suelto (chanclas abajo, esquina de la cama)', () => {
  const d = img(100, 100, [[25, 15, 75, 70], [40, 85, 60, 99], [0, 0, 8, 8]])
  const removed = keepMainBlob(d, 100, 100)
  expect(alphaAt(d, 100, 50, 40)).toBe(255) // prenda
  expect(alphaAt(d, 100, 50, 90)).toBe(0) // chanclas
  expect(alphaAt(d, 100, 3, 3)).toBe(0) // esquina
  expect(removed).toBeGreaterThan(0)
})

it('si solo hay una mancha no toca nada', () => {
  const d = img(50, 50, [[10, 10, 40, 40]])
  expect(keepMainBlob(d, 50, 50)).toBe(0)
})

it('prefiere lo centrado a algo algo mayor pegado al borde', () => {
  const d = img(100, 100, [[35, 35, 65, 65], [0, 0, 100, 10]]) // 900 px centro vs 1000 px en el borde
  keepMainBlob(d, 100, 100)
  expect(alphaAt(d, 100, 50, 50)).toBe(255)
  expect(alphaAt(d, 100, 50, 5)).toBe(0)
})
