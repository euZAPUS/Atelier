import type { CategoryId } from '../domain/categories'

export type GarmentStatus = 'clean' | 'worn' | 'dirty'

// Color en tres formas: hex para pintar, nombre para mostrar y Lab para comparar
// (distancias y armonías del futuro recomendador, sin migrar datos).
export interface ColorInfo {
  hex: string
  name: string // id de nombre de color (se traduce con i18n)
  lab: [number, number, number]
  weight?: number // proporción de la prenda (0–1), solo en la paleta
}

export interface Garment {
  id: string
  name: string
  category: CategoryId
  type?: string // tipo del catálogo (categories.ts): "jeans", "rugby", "sneakers"…
  subcategory?: string // (antiguo) tipo escrito a mano; se migra a `type` cuando se puede
  color: ColorInfo
  palette: ColorInfo[]
  brand?: string
  notes?: string
  imageId: string // → images
  // Lavado
  washAfter: number | null // copia del valor por defecto al crearla; editable; null = nunca
  wearsSinceWash: number
  manualDirty?: boolean // "me he manchado": sucia aunque no llegue al límite
  // Historial
  wearsTotal: number
  lastWornAt?: string // YYYY-MM-DD
  createdAt: number
  updatedAt: number
  archived: boolean
  /** Subida en bloque: la categoría la puso la IA y falta que la confirmes */
  review?: boolean
}

// Imágenes aparte para que la cuadrícula solo cargue miniaturas.
export interface GarmentImage {
  id: string
  cutout: Blob | null // WebP con transparencia (null mientras se procesa)
  thumb: Blob // WebP ~320px para la cuadrícula
  original?: Blob // opcional, para recortar de nuevo
  status: 'pending' | 'ready' | 'failed'
}

export interface CollageItem {
  garmentId: string
  x: number // 0–1 relativo al lienzo
  y: number
  scale: number
  rotation: number // grados
  z: number
}

export interface Outfit {
  id: string
  name: string
  items: CollageItem[]
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface DayPlan {
  date: string // YYYY-MM-DD (clave)
  outfitId: string
  worn: boolean
}

// Copia de las prendas usadas ese día: si luego editas el outfit, la estadística no cambia.
export interface WearLog {
  id: string
  date: string
  outfitId?: string
  garmentIds: string[]
}

export interface Settings {
  id: 'settings'
  theme: 'system' | 'light' | 'dark'
  lang: 'es' | 'en'
  washDefaults: Partial<Record<CategoryId, number | null>>
  schemaVersion: number
  /** Función de servidor propia (Cloudflare Workers AI) para fotos de producto. La clave es la tuya, no de un proveedor. */
  ai?: { enabled: boolean; url: string; key?: string }
}
