import { describe, expect, it } from 'vitest'
import { extractPalette, hexToRgb, labToRgb, nameColor, rgbToLab } from './color'

function pixels(spec: [string, number][], transparent = 0) {
  const arr: number[] = []
  for (const [hex, n] of spec) { const [r, g, b] = hexToRgb(hex); for (let i = 0; i < n; i++) arr.push(r, g, b, 255) }
  for (let i = 0; i < transparent; i++) arr.push(0, 255, 0, 0) // fondo verde transparente: debe ignorarse
  return new Uint8ClampedArray(arr)
}

describe('color', () => {
  it('Lab ida y vuelta', () => {
    for (const hex of ['#000000', '#ffffff', '#c32a2a', '#1c2340']) {
      const rgb = hexToRgb(hex)
      expect(labToRgb(rgbToLab(...rgb)).map((v, i) => Math.abs(v - rgb[i])).every((d) => d <= 1)).toBe(true)
    }
  })
  it('nombra colores de ropa', () => {
    expect(nameColor(rgbToLab(10, 10, 12))).toBe('black')
    expect(nameColor(rgbToLab(250, 250, 248))).toBe('white')
    expect(nameColor(rgbToLab(30, 38, 70))).toBe('navy')
    expect(nameColor(rgbToLab(80, 108, 140))).toBe('denim')
    expect(nameColor(rgbToLab(200, 160, 45))).toBe('mustard')
    // la sudadera rugby verde de la prueba real (salía 'gris marengo')
    expect(nameColor(rgbToLab(47, 74, 64))).toBe('darkgreen')
    expect(nameColor(rgbToLab(61, 61, 63))).toBe('charcoal')
  })
  it('principal = el que más ocupa; ignora el fondo transparente', () => {
    const p = extractPalette(pixels([['#1c2340', 700], ['#f4f4f2', 200], ['#c32a2a', 100]], 5000))
    expect(p[0].name).toBe('navy')
    expect(p.map((c) => c.name)).toEqual(['navy', 'white', 'red'])
    expect(p[0].weight).toBeCloseTo(0.7, 1)
  })
  it('luces y sombras de la misma tela cuentan como un color', () => {
    const p = extractPalette(pixels([['#c32a2a', 500], ['#b02424', 300], ['#d23232', 200]]))
    expect(p).toHaveLength(1)
    expect(p[0].name).toBe('red')
  })
  it('sin píxeles opacos no hay paleta', () => expect(extractPalette(pixels([], 100))).toEqual([]))
})
