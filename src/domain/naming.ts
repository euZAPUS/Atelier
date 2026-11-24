import type { Garment } from '../db/types'
import { typeById, type CategoryId, type Gender } from './categories'

type Lang = 'es' | 'en'

// Nombres de color: en español concuerdan en género con la prenda ([masculino, femenino]).
const COLOR_NAMES: Record<string, { es: [string, string]; en: string }> = {
  black: { es: ['negro', 'negra'], en: 'black' },
  charcoal: { es: ['gris marengo', 'gris marengo'], en: 'charcoal' },
  grey: { es: ['gris', 'gris'], en: 'grey' },
  lightgrey: { es: ['gris claro', 'gris claro'], en: 'light grey' },
  white: { es: ['blanco', 'blanca'], en: 'white' },
  cream: { es: ['crudo', 'cruda'], en: 'cream' },
  beige: { es: ['beige', 'beige'], en: 'beige' },
  camel: { es: ['camel', 'camel'], en: 'camel' },
  brown: { es: ['marrón', 'marrón'], en: 'brown' },
  khaki: { es: ['caqui', 'caqui'], en: 'khaki' },
  olive: { es: ['verde oliva', 'verde oliva'], en: 'olive' },
  darkgreen: { es: ['verde botella', 'verde botella'], en: 'bottle green' },
  green: { es: ['verde', 'verde'], en: 'green' },
  mint: { es: ['verde menta', 'verde menta'], en: 'mint' },
  teal: { es: ['verde azulado', 'verde azulado'], en: 'teal' },
  navy: { es: ['azul marino', 'azul marino'], en: 'navy' },
  blue: { es: ['azul', 'azul'], en: 'blue' },
  denim: { es: ['azul vaquero', 'azul vaquero'], en: 'denim blue' },
  lightblue: { es: ['azul claro', 'azul claro'], en: 'light blue' },
  purple: { es: ['morado', 'morada'], en: 'purple' },
  lilac: { es: ['lila', 'lila'], en: 'lilac' },
  pink: { es: ['rosa', 'rosa'], en: 'pink' },
  fuchsia: { es: ['fucsia', 'fucsia'], en: 'fuchsia' },
  red: { es: ['rojo', 'roja'], en: 'red' },
  burgundy: { es: ['burdeos', 'burdeos'], en: 'burgundy' },
  orange: { es: ['naranja', 'naranja'], en: 'orange' },
  mustard: { es: ['mostaza', 'mostaza'], en: 'mustard' },
  yellow: { es: ['amarillo', 'amarilla'], en: 'yellow' },
}

// Nombre por defecto de cada categoría cuando la prenda no tiene tipo
const CATEGORY_NOUN: Record<CategoryId, { es: [string, Gender]; en: string }> = {
  tshirts: { es: ['Camiseta', 'f'], en: 'T-shirt' },
  polos: { es: ['Polo', 'm'], en: 'Polo' },
  shirts: { es: ['Camisa', 'f'], en: 'Shirt' },
  hoodies: { es: ['Sudadera', 'f'], en: 'Sweatshirt' },
  jackets: { es: ['Chaqueta', 'f'], en: 'Jacket' },
  trousers: { es: ['Pantalón', 'm'], en: 'Trousers' },
  tracksuits: { es: ['Chándal', 'm'], en: 'Tracksuit' },
  footwear: { es: ['Calzado', 'm'], en: 'Shoes' },
  headwear: { es: ['Gorro', 'm'], en: 'Hat' },
  accessories: { es: ['Accesorio', 'm'], en: 'Accessory' },
}

// Colores que en español no cambian en plural ("pantalones beige", "zapatillas rosa")
const INVARIABLE = new Set(['beige', 'camel', 'caqui', 'rosa', 'naranja', 'mostaza', 'burdeos', 'lila', 'fucsia'])
function pluralEs(word: string) {
  if (word.includes(' ') || INVARIABLE.has(word)) return word // "azul marino", "gris claro": no cambian
  if (/[aeiouáéó]$/.test(word)) return word + 's'
  return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '') + 'es' // azul → azules, marrón → marrones, gris → grises
}

export function colorLabel(colorId: string, lang: Lang, gender: Gender = 'm', plural = false) {
  const c = COLOR_NAMES[colorId]
  if (!c) return colorId
  if (lang !== 'es') return c.en
  const w = c.es[gender === 'm' ? 0 : 1]
  return plural ? pluralEs(w) : w
}

/** Nombre del tipo (o de la categoría si no tiene) en el idioma pedido. */
export function typeLabel(category: CategoryId, type: string | undefined, lang: Lang) {
  const t = typeById(category, type)
  if (t) return lang === 'es' ? t.es : t.en
  const n = CATEGORY_NOUN[category] ?? CATEGORY_NOUN.accessories
  return lang === 'es' ? n.es[0] : n.en
}

// Nombre que se muestra: el que pusiste o uno automático ("Sudadera rugby verde botella", "Zapatillas rojas", "Black hoodie").
export function displayName(g: Pick<Garment, 'name' | 'category' | 'type' | 'subcategory' | 'color'>, lang: Lang) {
  if (g.name.trim()) return g.name.trim()
  const t = typeById(g.category, g.type)
  const fallback = CATEGORY_NOUN[g.category] ?? CATEGORY_NOUN.accessories
  // Prendas antiguas con "tipo" escrito a mano y sin tipo del catálogo
  const legacy = !t && g.subcategory?.trim() ? g.subcategory.trim().toLowerCase() : ''
  if (lang === 'es') {
    const noun = t ? t.es : fallback.es[0] + (legacy ? ` ${legacy}` : '')
    if (g.color.name === 'pending') return noun
    const color = colorLabel(g.color.name, 'es', t ? t.gender : fallback.es[1], t?.plural)
    // "Vaquero azul vaquero" → "Vaquero azul"; "Camisa vaquera azul vaquero" → "Camisa vaquera"
    if (noun.toLowerCase().includes(color.split(' ').pop()!.slice(0, 5))) return noun
    return `${noun} ${color}`
  }
  const noun = (t ? t.en : (legacy ? `${legacy} ` : '') + fallback.en).toLowerCase()
  if (g.color.name === 'pending') return noun[0].toUpperCase() + noun.slice(1)
  const label = colorLabel(g.color.name, 'en')
  return `${label[0].toUpperCase()}${label.slice(1)} ${noun}`
}
