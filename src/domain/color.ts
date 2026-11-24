import type { ColorInfo } from '../db/types'

export type Lab = [number, number, number]

// ---------- sRGB ↔ CIELAB (D65) ----------
const toLinear = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const fromLinear = (c: number) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)))
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
const fInv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27))
const W = [0.95047, 1, 1.08883]

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b)
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / W[0]
  const y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / W[1]
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / W[2]
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function labToRgb([L, a, bb]: Lab): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - bb / 200
  const x = fInv(fx) * W[0], y = fInv(fy) * W[1], z = fInv(fz) * W[2]
  return [
    fromLinear(x * 3.2406 + y * -1.5372 + z * -0.4986),
    fromLinear(x * -0.9689 + y * 1.8758 + z * 0.0415),
    fromLinear(x * 0.0557 + y * -0.204 + z * 1.057),
  ]
}

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
export const deltaE = (p: Lab, q: Lab) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])

// ---------- Colores con nombre (los de la ropa, no los de un arcoíris) ----------
export const NAMED_COLORS: { id: string; hex: string }[] = [
  { id: 'black', hex: '#141414' }, { id: 'charcoal', hex: '#3d3d3f' }, { id: 'grey', hex: '#8a8a8a' },
  { id: 'lightgrey', hex: '#c9c9c7' }, { id: 'white', hex: '#f4f4f2' }, { id: 'cream', hex: '#ece3cf' },
  { id: 'beige', hex: '#d3bf9e' }, { id: 'camel', hex: '#b5864f' }, { id: 'brown', hex: '#6a4a30' },
  { id: 'khaki', hex: '#8f8a5e' }, { id: 'olive', hex: '#5a5c32' }, { id: 'darkgreen', hex: '#24443a' }, { id: 'green', hex: '#2f7a3d' },
  { id: 'mint', hex: '#a8d8bd' }, { id: 'teal', hex: '#1f7f7c' }, { id: 'navy', hex: '#1c2340' },
  { id: 'blue', hex: '#2b5cb0' }, { id: 'denim', hex: '#4c6a8e' }, { id: 'lightblue', hex: '#9ec4e6' },
  { id: 'purple', hex: '#5d3a86' }, { id: 'lilac', hex: '#b9a5d8' }, { id: 'pink', hex: '#f0a8c0' },
  { id: 'fuchsia', hex: '#d2367f' }, { id: 'red', hex: '#c32a2a' }, { id: 'burgundy', hex: '#6b1d2c' },
  { id: 'orange', hex: '#ec7a22' }, { id: 'mustard', hex: '#c8a02a' }, { id: 'yellow', hex: '#f1d33b' },
]
const NAMED_LAB = NAMED_COLORS.map((c) => ({ id: c.id, lab: rgbToLab(...hexToRgb(c.hex)) }))

export function nameColor(lab: Lab): string {
  let best = NAMED_LAB[0], bestD = Infinity
  for (const c of NAMED_LAB) {
    const d = deltaE(lab, c.lab)
    if (d < bestD) { bestD = d; best = c }
  }
  return best.id
}

// ---------- k-means en Lab ----------
// Generador determinista: la misma foto da siempre los mismos colores.
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
}

export function kmeans(points: Lab[], k: number, iterations = 12): { center: Lab; count: number }[] {
  if (points.length === 0) return []
  k = Math.min(k, points.length)
  const rand = rng(42)
  // k-means++: cada centro nuevo, lejos de los que ya hay
  const centers: Lab[] = [points[Math.floor(rand() * points.length)]]
  const dist = new Float64Array(points.length)
  while (centers.length < k) {
    let sum = 0
    for (let i = 0; i < points.length; i++) {
      let m = Infinity
      for (const c of centers) m = Math.min(m, deltaE(points[i], c) ** 2)
      dist[i] = m; sum += m
    }
    if (sum === 0) break
    let r = rand() * sum, idx = 0
    while (r > dist[idx] && idx < points.length - 1) r -= dist[idx++]
    centers.push(points[idx])
  }
  const assign = new Int32Array(points.length)
  for (let it = 0; it < iterations; it++) {
    let moved = false
    for (let i = 0; i < points.length; i++) {
      let best = 0, bd = Infinity
      for (let c = 0; c < centers.length; c++) {
        const d = deltaE(points[i], centers[c])
        if (d < bd) { bd = d; best = c }
      }
      if (assign[i] !== best) { assign[i] = best; moved = true }
    }
    const acc = centers.map(() => [0, 0, 0, 0])
    for (let i = 0; i < points.length; i++) {
      const a = acc[assign[i]], p = points[i]
      a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++
    }
    acc.forEach((a, c) => { if (a[3]) centers[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]] })
    if (!moved && it > 0) break
  }
  const counts = new Array(centers.length).fill(0)
  for (let i = 0; i < points.length; i++) counts[assign[i]]++
  return centers.map((center, i) => ({ center, count: counts[i] })).filter((c) => c.count > 0)
}

/**
 * Paleta de una prenda a partir de sus píxeles RGBA (solo los opacos: el fondo ya está quitado).
 * Devuelve los colores de mayor a menor peso; el primero es el principal.
 */
export function extractPalette(rgba: Uint8ClampedArray, opts: { k?: number; minWeight?: number; alphaMin?: number } = {}): ColorInfo[] {
  const { k = 5, minWeight = 0.06, alphaMin = 200 } = opts
  const points: Lab[] = []
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] >= alphaMin) points.push(rgbToLab(rgba[i], rgba[i + 1], rgba[i + 2]))
  }
  if (points.length === 0) return []
  let clusters = kmeans(points, k)
  // Une clusters casi iguales (la misma tela con luz y sombra)
  clusters.sort((a, b) => b.count - a.count)
  const merged: { center: Lab; count: number }[] = []
  for (const c of clusters) {
    const twin = merged.find((m) => deltaE(m.center, c.center) < 12)
    if (twin) {
      const n = twin.count + c.count
      twin.center = twin.center.map((v, i) => (v * twin.count + c.center[i] * c.count) / n) as Lab
      twin.count = n
    } else merged.push({ ...c, center: [...c.center] as Lab })
  }
  clusters = merged.sort((a, b) => b.count - a.count)
  const total = points.length
  return clusters
    .filter((c, i) => i === 0 || c.count / total >= minWeight)
    .map((c) => {
      const lab = c.center.map((v) => Math.round(v * 10) / 10) as Lab
      return { hex: rgbToHex(...labToRgb(lab)), name: nameColor(lab), lab, weight: Math.round((c.count / total) * 100) / 100 }
    })
}
