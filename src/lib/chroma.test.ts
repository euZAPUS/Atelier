import { describe, expect, it } from 'vitest'
import { borderColor, keyOut, type RGB } from './chroma'

// 40×40: fondo liso (con algo de ruido), prenda verde botella con franja blanca hasta el borde, y un hueco cerrado
function scene(bg: RGB, body: RGB = [31, 64, 48], noise = 4) {
  const w = 40, h = 40, d = new Uint8ClampedArray(w * h * 4)
  let seed = 7
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x7fffffff - 0.5) * 2 * noise }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    let c: RGB = [bg[0] + rnd(), bg[1] + rnd(), bg[2] + rnd()] as RGB
    if (x >= 8 && x < 32 && y >= 8 && y < 32) c = body
    if (x >= 8 && x < 32 && y >= 16 && y < 22) c = [238, 236, 228]
    if (x >= 24 && x < 28 && y >= 24 && y < 28) c = bg
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255
  }
  return { d, w, h, a: (x: number, y: number) => d[(y * w + x) * 4 + 3] }
}

describe('keyOut (fondo neutro)', () => {
  // gris medio para prendas de color; negro solo para prendas grises y blancas (así lo elige la función)
  for (const [bg, body] of [[[128, 128, 128], [31, 64, 48]], [[128, 128, 128], [20, 20, 22]], [[17, 17, 17], [140, 140, 142]]] as [RGB, RGB][]) {
    it(`fondo ${bg.join(',')} con prenda ${body.join(',')}: quita el fondo y respeta la prenda y la franja blanca`, () => {
      const s = scene(bg, body)
      expect(borderColor(s.d, s.w, s.h).every((v, i) => Math.abs(v - bg[i]) < 6)).toBe(true)
      const cover = keyOut(s.d, s.w, s.h)
      expect(s.a(2, 2)).toBe(0)
      expect(s.a(20, 19)).toBe(255)
      expect(s.a(9, 19)).toBe(255)
      expect(s.a(12, 12)).toBe(255)
      expect(s.a(25, 25)).toBe(0)
      expect(cover).toBeGreaterThan(0.3)
      expect(cover).toBeLessThan(0.4)
    })
  }
  it('fondo blanco con prenda gris: la prenda queda entera', () => {
    const w = 20, h = 20, d = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      const x = i % w, y = (i / w) | 0, garment = x > 4 && x < 15 && y > 4 && y < 15
      const v = garment ? 140 : 252
      d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255
    }
    keyOut(d, w, h)
    expect(d[(10 * w + 10) * 4 + 3]).toBe(255)
    expect(d[3]).toBe(0)
  })
})
