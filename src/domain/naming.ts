import type { Garment } from '../db/types'
import type { CategoryId } from './categories'

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

// Singular de cada categoría y su género gramatical
const SINGULAR: Record<CategoryId, { es: [string, 'm' | 'f']; en: string }> = {
  tshirts: { es: ['Camiseta', 'f'], en: 'T-shirt' },
  longsleeves: { es: ['Camiseta de manga larga', 'f'], en: 'Long sleeve' },
  hoodies: { es: ['Sudadera', 'f'], en: 'Hoodie' },
  jackets: { es: ['Chaqueta', 'f'], en: 'Jacket' },
  trousers: { es: ['Pantalón', 'm'], en: 'Trousers' },
  footwear: { es: ['Calzado', 'm'], en: 'Shoes' },
  accessories: { es: ['Accesorio', 'm'], en: 'Accessory' },
}

export function colorLabel(colorId: string, lang: Lang, gender: 'm' | 'f' = 'm') {
  const c = COLOR_NAMES[colorId]
  if (!c) return colorId
  return lang === 'es' ? c.es[gender === 'm' ? 0 : 1] : c.en
}

// Nombre que se muestra: el que pusiste o uno automático ("Sudadera negra", "Black hoodie").
export function displayName(g: Pick<Garment, 'name' | 'category' | 'subcategory' | 'color'>, lang: Lang) {
  if (g.name.trim()) return g.name.trim()
  const s = SINGULAR[g.category]
  if (g.color.name === 'pending') return lang === 'es' ? s.es[0] : s.en
  if (lang === 'es') {
    const [noun, gender] = s.es
    const sub = g.subcategory?.trim() ? ` ${g.subcategory.trim().toLowerCase()}` : ''
    const color = colorLabel(g.color.name, 'es', gender)
    // "Pantalón vaquero", no "Pantalón vaquero azul vaquero"
    if (sub && color.includes(sub.trim())) return `${noun}${sub}`
    return `${noun}${sub} ${color}`
  }
  const sub = g.subcategory?.trim() ? `${g.subcategory.trim().toLowerCase()} ` : ''
  const label = colorLabel(g.color.name, 'en')
  return `${label[0].toUpperCase()}${label.slice(1)} ${sub}${s.en.toLowerCase()}`
}
