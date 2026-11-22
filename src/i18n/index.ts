import { es, type Dict } from './es'
import { en } from './en'
import { useSettings } from '../lib/settings'

export type Lang = 'es' | 'en'
const dicts: Record<Lang, Dict> = { es, en }

// Sustituye {clave} por valores: fmt(t.wardrobe.count, { n: 3 })
export function fmt(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

export function useT(): Dict {
  return dicts[useSettings().lang]
}
