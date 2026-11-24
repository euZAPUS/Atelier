import { describe, expect, it } from 'vitest'
import { chromaKey, type RGB } from './chroma'

// Imagen 40×40 con fondo de croma, una prenda verde oscura con franja blanca y un hueco cerrado de fondo
function scene(key: RGB) {
  const w = 40, h = 40, d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    let c: RGB = key
    if (x >= 8 && x < 32 && y >= 8 && y < 32) c = [31, 64, 48] // verde botella
    if (x >= 8 && x < 32 && y >= 16 && y < 22) c = [245, 245, 240] // franja blanca que llega al borde de la prenda
    if (x >= 24 && x < 28 && y >= 24 && y < 28) c = key // hueco cerrado (entre brazo y cuerpo)
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255
  }
  return { d, w, h, a: (x: number, y: number) => d[(y * w + x) * 4 + 3] }
}

describe('chromaKey', () => {
  for (const key of [[255, 0, 255], [0, 255, 0], [0, 0, 255]] as RGB[]) {
    it(`fondo ${key.join(',')}: quita el fondo y respeta blanco y oscuro`, () => {
      const s = scene(key)
      const cover = chromaKey(s.d, s.w, s.h, key)
      expect(s.a(2, 2)).toBe(0) // fondo
      expect(s.a(20, 19)).toBe(255) // franja blanca
      expect(s.a(9, 19)).toBe(255) // franja blanca en el borde de la prenda
      expect(s.a(12, 12)).toBe(255) // verde oscuro
      expect(s.a(25, 25)).toBe(0) // hueco cerrado
      expect(cover).toBeGreaterThan(0.3)
      expect(cover).toBeLessThan(0.4)
    })
  }
  it('quita el reflejo de magenta en los bordes', () => {
    const d = new Uint8ClampedArray([200, 120, 200, 255]) // píxel de borde teñido de magenta
    chromaKey(d, 1, 1, [255, 0, 255])
    expect(d[0]).toBeLessThanOrEqual(d[1] + 1)
  })
})
