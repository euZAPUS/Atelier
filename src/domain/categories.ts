// Catálogo de prendas en dos niveles: CATEGORÍA (filtros, outfits) → TIPO (lo concreto: vaquero, rugby…).
// Los ids nunca cambian (van en los datos); las etiquetas de categoría salen del i18n y las de tipo, de aquí.
// `washAfter`: usos antes de pasar a sucia; `null` = nunca se ensucia. El del tipo manda sobre el de la categoría.
// Nombre de cada tipo: [singular ES, género, plural?] para que salga "Zapatillas rojas" y no "Calzado rojo".

export type Gender = 'm' | 'f'
export interface GarmentType {
  id: string
  es: string
  gender: Gender
  plural?: boolean // "zapatillas", "gafas"… el color concuerda en plural
  en: string
  washAfter?: number | null
}

export const CATEGORIES = [
  {
    id: 'tshirts', washAfter: 1, icon: 'tshirt', types: [
      { id: 'tee', es: 'Camiseta', gender: 'f', en: 'T-shirt' },
      { id: 'longsleeve', es: 'Camiseta de manga larga', gender: 'f', en: 'Long sleeve tee' },
      { id: 'tank', es: 'Camiseta de tirantes', gender: 'f', en: 'Tank top' },
    ],
  },
  {
    id: 'polos', washAfter: 2, icon: 'polo', types: [
      { id: 'polo', es: 'Polo', gender: 'm', en: 'Polo' },
      { id: 'longpolo', es: 'Polo de manga larga', gender: 'm', en: 'Long sleeve polo' },
    ],
  },
  {
    id: 'shirts', washAfter: 2, icon: 'shirt', types: [
      { id: 'shirt', es: 'Camisa', gender: 'f', en: 'Shirt' },
      { id: 'overshirt', es: 'Sobrecamisa', gender: 'f', en: 'Overshirt', washAfter: 4 },
      { id: 'denimshirt', es: 'Camisa vaquera', gender: 'f', en: 'Denim shirt', washAfter: 3 },
      { id: 'flannel', es: 'Camisa de franela', gender: 'f', en: 'Flannel shirt', washAfter: 3 },
    ],
  },
  {
    id: 'hoodies', washAfter: 3, icon: 'hoodie', types: [
      { id: 'sweatshirt', es: 'Sudadera', gender: 'f', en: 'Sweatshirt' },
      { id: 'hoodie', es: 'Sudadera con capucha', gender: 'f', en: 'Hoodie' },
      { id: 'zip', es: 'Sudadera con cremallera', gender: 'f', en: 'Zip hoodie' },
      { id: 'rugby', es: 'Sudadera rugby', gender: 'f', en: 'Rugby sweatshirt' },
      { id: 'sweater', es: 'Jersey', gender: 'm', en: 'Sweater', washAfter: 4 },
      { id: 'cardigan', es: 'Cárdigan', gender: 'm', en: 'Cardigan', washAfter: 4 },
    ],
  },
  {
    id: 'jackets', washAfter: 8, icon: 'jacket', types: [
      { id: 'jacket', es: 'Cazadora', gender: 'f', en: 'Jacket' },
      { id: 'denimjacket', es: 'Chaqueta vaquera', gender: 'f', en: 'Denim jacket', washAfter: 10 },
      { id: 'puffer', es: 'Plumas', gender: 'm', en: 'Puffer', washAfter: 12 },
      { id: 'coat', es: 'Abrigo', gender: 'm', en: 'Coat', washAfter: 12 },
      { id: 'windbreaker', es: 'Cortavientos', gender: 'm', en: 'Windbreaker' },
      { id: 'blazer', es: 'Americana', gender: 'f', en: 'Blazer', washAfter: 6 },
      { id: 'vest', es: 'Chaleco', gender: 'm', en: 'Vest' },
    ],
  },
  {
    id: 'trousers', washAfter: 3, icon: 'trousers', types: [
      { id: 'jeans', es: 'Vaquero', gender: 'm', en: 'Jeans', washAfter: 4 },
      { id: 'chinos', es: 'Chino', gender: 'm', en: 'Chinos' },
      { id: 'cargo', es: 'Cargo', gender: 'm', en: 'Cargo trousers' },
      { id: 'trousers', es: 'Pantalón', gender: 'm', en: 'Trousers' },
      { id: 'shorts', es: 'Pantalón corto', gender: 'm', en: 'Shorts', washAfter: 2 },
    ],
  },
  {
    id: 'tracksuits', washAfter: 3, icon: 'tracksuit', types: [
      { id: 'trackpants', es: 'Pantalón de chándal', gender: 'm', en: 'Track pants' },
      { id: 'trackjacket', es: 'Chaqueta de chándal', gender: 'f', en: 'Track jacket' },
      { id: 'tracksuit', es: 'Chándal', gender: 'm', en: 'Tracksuit' },
    ],
  },
  {
    id: 'footwear', washAfter: null, icon: 'shoe', types: [
      { id: 'sneakers', es: 'Zapatillas', gender: 'f', plural: true, en: 'Sneakers' },
      { id: 'boots', es: 'Botas', gender: 'f', plural: true, en: 'Boots' },
      { id: 'shoes', es: 'Zapatos', gender: 'm', plural: true, en: 'Shoes' },
      { id: 'sandals', es: 'Chanclas', gender: 'f', plural: true, en: 'Sandals' },
    ],
  },
  {
    id: 'headwear', washAfter: null, icon: 'cap', types: [
      { id: 'cap', es: 'Gorra', gender: 'f', en: 'Cap' },
      { id: 'beanie', es: 'Gorro', gender: 'm', en: 'Beanie' },
      { id: 'bucket', es: 'Gorro de pescador', gender: 'm', en: 'Bucket hat' },
    ],
  },
  {
    id: 'accessories', washAfter: null, icon: 'bag', types: [
      { id: 'backpack', es: 'Mochila', gender: 'f', en: 'Backpack' },
      { id: 'bag', es: 'Bolso', gender: 'm', en: 'Bag' },
      { id: 'crossbody', es: 'Riñonera', gender: 'f', en: 'Crossbody bag' },
      { id: 'belt', es: 'Cinturón', gender: 'm', en: 'Belt' },
      { id: 'glasses', es: 'Gafas', gender: 'f', plural: true, en: 'Glasses' },
      { id: 'watch', es: 'Reloj', gender: 'm', en: 'Watch' },
      { id: 'scarf', es: 'Bufanda', gender: 'f', en: 'Scarf', washAfter: 10 },
      { id: 'socks', es: 'Calcetines', gender: 'm', plural: true, en: 'Socks', washAfter: 1 },
      { id: 'jewelry', es: 'Joya', gender: 'f', en: 'Jewellery' },
    ],
  },
] as const satisfies readonly { id: string; washAfter: number | null; icon: string; types: readonly GarmentType[] }[]

export type CategoryId = (typeof CATEGORIES)[number]['id']

export function categoryById(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

export function typesOf(category: CategoryId): readonly GarmentType[] {
  return categoryById(category).types
}

/** El tipo, solo si pertenece a esa categoría. */
export function typeById(category: CategoryId, type?: string): GarmentType | undefined {
  return type ? typesOf(category).find((t) => t.id === type) : undefined
}

/** Usos antes de lavar por defecto: los del tipo si los tiene; si no, los de la categoría. */
export function defaultWash(category: CategoryId, type?: string): number | null {
  const t = typeById(category, type)
  return t && t.washAfter !== undefined ? t.washAfter : categoryById(category).washAfter
}

/**
 * Migración de prendas guardadas con el catálogo anterior (7 categorías + tipo libre).
 * Devuelve los cambios a aplicar o null si no hay nada que cambiar.
 */
export function migrateLegacy(g: { category: string; subcategory?: string; type?: string }): { category: CategoryId; type?: string } | null {
  const sub = (g.subcategory ?? '').trim().toLowerCase()
  if (g.category === 'longsleeves') return { category: 'tshirts', type: 'longsleeve' }
  if (/vaquer|jean/.test(sub) && g.category === 'trousers') return { category: 'trousers', type: 'jeans' }
  if (/polo/.test(sub)) return { category: 'polos', type: 'polo' }
  if (/chándal|chandal/.test(sub)) return { category: 'tracksuits', type: 'trackpants' }
  if (g.category === 'accessories' && /gorr|cap/.test(sub)) return { category: 'headwear', type: 'cap' }
  if (g.category === 'accessories' && /mochil/.test(sub)) return { category: 'accessories', type: 'backpack' }
  if (g.category === 'footwear' && /zapatill|sneak/.test(sub)) return { category: 'footwear', type: 'sneakers' }
  if (!CATEGORIES.some((c) => c.id === g.category)) return { category: 'accessories' }
  return null
}
