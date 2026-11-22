import { expect, it } from 'vitest'
import { displayName } from './naming'

const g = (category: any, color: string, extra: any = {}) => ({ name: '', category, color: { name: color, hex: '', lab: [0, 0, 0] as [number, number, number] }, ...extra })

it('concuerda en género', () => {
  expect(displayName(g('hoodies', 'black'), 'es')).toBe('Sudadera negra')
  expect(displayName(g('trousers', 'black'), 'es')).toBe('Pantalón negro')
  expect(displayName(g('trousers', 'denim', { subcategory: 'Vaquero' }), 'es')).toBe('Pantalón vaquero')
  expect(displayName(g('hoodies', 'black'), 'en')).toBe('Black hoodie')
})
it('respeta el nombre puesto a mano', () => expect(displayName(g('hoodies', 'black', { name: 'La de Carhartt' }), 'es')).toBe('La de Carhartt'))
