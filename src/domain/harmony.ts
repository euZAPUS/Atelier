// Qué colores combinan con cada color de prenda. Reglas escritas a mano (más fiables que la teoría
// del color pura para ropa) e incluyen las reglas de ZAP: rojo y verde no; beige y mostaza no.
// Base para el futuro recomendador de outfits.

export const MATCHES: Record<string, string[]> = {
  black: ['white', 'grey', 'camel', 'red', 'denim', 'beige'],
  charcoal: ['white', 'lightblue', 'burgundy', 'camel', 'black', 'pink'],
  grey: ['black', 'white', 'navy', 'burgundy', 'pink', 'mustard'],
  lightgrey: ['navy', 'black', 'white', 'lilac', 'denim', 'burgundy'],
  white: ['black', 'navy', 'denim', 'beige', 'olive', 'red'],
  cream: ['brown', 'navy', 'olive', 'camel', 'denim', 'burgundy'],
  beige: ['white', 'navy', 'brown', 'olive', 'black', 'denim'],
  camel: ['black', 'white', 'navy', 'cream', 'denim', 'burgundy'],
  brown: ['cream', 'beige', 'white', 'denim', 'olive', 'lightblue'],
  khaki: ['white', 'navy', 'black', 'denim', 'brown', 'cream'],
  olive: ['white', 'cream', 'black', 'beige', 'denim', 'mustard'],
  darkgreen: ['white', 'cream', 'beige', 'camel', 'navy', 'denim'],
  green: ['white', 'beige', 'navy', 'denim', 'cream', 'black'],
  mint: ['white', 'navy', 'grey', 'beige', 'denim', 'lightgrey'],
  teal: ['white', 'beige', 'navy', 'grey', 'mustard', 'black'],
  navy: ['white', 'beige', 'camel', 'grey', 'lightblue', 'burgundy'],
  blue: ['white', 'beige', 'grey', 'navy', 'camel', 'denim'],
  denim: ['white', 'black', 'grey', 'camel', 'red', 'navy'],
  lightblue: ['navy', 'white', 'beige', 'grey', 'brown', 'denim'],
  purple: ['grey', 'black', 'white', 'denim', 'mustard', 'lilac'],
  lilac: ['grey', 'white', 'navy', 'denim', 'lightgrey', 'beige'],
  pink: ['grey', 'white', 'navy', 'denim', 'burgundy', 'black'],
  fuchsia: ['black', 'white', 'navy', 'grey', 'denim', 'camel'],
  // Zapatillas rojas: con negro, blanco, gris o vaquero
  red: ['black', 'white', 'grey', 'denim', 'navy', 'beige'],
  burgundy: ['grey', 'navy', 'camel', 'cream', 'denim', 'black'],
  orange: ['navy', 'white', 'denim', 'beige', 'black', 'brown'],
  mustard: ['navy', 'grey', 'black', 'denim', 'olive', 'white'],
  yellow: ['navy', 'grey', 'white', 'denim', 'black', 'lightblue'],
}

/** Parejas que chocan (en los dos sentidos). */
export const CLASHES: [string, string][] = [
  ['red', 'green'],
  ['red', 'darkgreen'],
  ['beige', 'mustard'],
  ['orange', 'fuchsia'],
  ['red', 'pink'],
]

export function matchesFor(color: string): string[] {
  return MATCHES[color] ?? []
}

export function clashesFor(color: string): string[] {
  return CLASHES.flatMap(([a, b]) => (a === color ? [b] : b === color ? [a] : []))
}

/** ¿Combinan dos colores? true = sí, false = chocan, null = sin opinión. */
export function combine(a: string, b: string): boolean | null {
  if (clashesFor(a).includes(b)) return false
  if (MATCHES[a]?.includes(b) || MATCHES[b]?.includes(a)) return true
  return null
}
