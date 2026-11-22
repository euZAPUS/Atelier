// Categorías fijas. El id nunca cambia (va en los datos); la etiqueta sale del i18n.
// `washAfter`: usos antes de pasar a sucia. `null` = nunca se ensucia.
export const CATEGORIES = [
  { id: 'tshirts', washAfter: 1, icon: 'tshirt' },
  { id: 'longsleeves', washAfter: 2, icon: 'longsleeve' },
  { id: 'hoodies', washAfter: 3, icon: 'hoodie' },
  { id: 'jackets', washAfter: 8, icon: 'jacket' },
  { id: 'trousers', washAfter: 3, icon: 'trousers' },
  { id: 'footwear', washAfter: null, icon: 'shoe' },
  { id: 'accessories', washAfter: null, icon: 'cap' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

// Subcategorías sugeridas con su propio valor de lavado (la prenda puede sobrescribirlo igualmente).
export const SUBCATEGORY_WASH: Record<string, number | null> = {
  jeans: 4,
}

export function categoryById(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!
}
