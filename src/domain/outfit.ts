// Reglas puras de los outfits: dónde colocar cada prenda en el collage y si los colores combinan.
import type { CollageItem } from '../db/types'
import type { CategoryId } from './categories'
import { combine } from './harmony'

/** Colores que van con todo: no cuentan como choque ni como "color fuerte". */
export const NEUTRALS = new Set(['black', 'white', 'grey', 'charcoal', 'lightgrey', 'cream', 'beige', 'denim', 'navy', 'camel', 'khaki'])

/** Ancho de una prenda en el lienzo (fracción del ancho) con escala 1. */
export const ITEM_W = 0.46

// Hueco de cada categoría: como si la ropa estuviera extendida sobre la cama.
const SLOTS: Record<CategoryId, { x: number; y: number; scale: number }> = {
  headwear: { x: 0.5, y: 0.11, scale: 0.55 },
  tshirts: { x: 0.5, y: 0.33, scale: 1 },
  polos: { x: 0.5, y: 0.33, scale: 1 },
  shirts: { x: 0.5, y: 0.33, scale: 1 },
  hoodies: { x: 0.5, y: 0.33, scale: 1.05 },
  jackets: { x: 0.36, y: 0.33, scale: 1.1 },
  tracksuits: { x: 0.5, y: 0.6, scale: 1.1 },
  trousers: { x: 0.5, y: 0.64, scale: 1.15 },
  footwear: { x: 0.5, y: 0.9, scale: 0.6 },
  accessories: { x: 0.84, y: 0.52, scale: 0.5 },
}

/** Posición inicial de una prenda nueva; si su hueco está ocupado se desplaza a un lado. */
export function placeItem(category: CategoryId, garmentId: string, items: CollageItem[], categoryOf: (id: string) => CategoryId | undefined): CollageItem {
  const s = SLOTS[category]
  const same = items.filter((i) => categoryOf(i.garmentId) === category).length
  const shift = same === 0 ? 0 : (same % 2 ? 1 : -1) * Math.ceil(same / 2) * 0.16
  const z = items.reduce((m, i) => Math.max(m, i.z), 0) + 1
  return { garmentId, x: clamp(s.x + shift, 0.1, 0.9), y: s.y, scale: s.scale, rotation: 0, z }
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export type Verdict = 'empty' | 'good' | 'ok' | 'busy' | 'clash'

export interface Harmony {
  verdict: Verdict
  clashes: [string, string][]
  /** Colores fuertes (no neutros), sin repetir */
  loud: string[]
}

/** ¿Combinan los colores del outfit? Usa las reglas de harmony.ts (incluidas las de ZAP). */
export function outfitHarmony(colors: string[]): Harmony {
  const list = [...new Set(colors.filter((c) => c && c !== 'pending'))]
  if (list.length === 0) return { verdict: 'empty', clashes: [], loud: [] }
  const clashes: [string, string][] = []
  let unknown = 0
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, b] = [list[i], list[j]]
      if (NEUTRALS.has(a) || NEUTRALS.has(b)) continue
      const r = combine(a, b)
      if (r === false) clashes.push([a, b])
      else if (r === null) unknown++
    }
  }
  const loud = list.filter((c) => !NEUTRALS.has(c))
  const verdict: Verdict = clashes.length ? 'clash' : loud.length > 2 ? 'busy' : unknown ? 'ok' : 'good'
  return { verdict, clashes, loud }
}

/** ¿Chocaría este color con alguno de los que ya hay? Devuelve el primero con el que choca. */
export function clashWith(color: string, others: string[]): string | undefined {
  if (NEUTRALS.has(color)) return undefined
  return others.find((o) => o !== color && !NEUTRALS.has(o) && combine(color, o) === false)
}
