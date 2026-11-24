import { describe, expect, it } from 'vitest'
import { displayName } from './naming'

const g = (category: any, color: string, extra: any = {}) => ({ name: '', category, color: { name: color, hex: '', lab: [0, 0, 0] as [number, number, number] }, ...extra })

describe('nombres automáticos', () => {
  it('concuerda en género con el tipo', () => {
    expect(displayName(g('hoodies', 'black', { type: 'hoodie' }), 'es')).toBe('Sudadera con capucha negra')
    expect(displayName(g('hoodies', 'darkgreen', { type: 'rugby' }), 'es')).toBe('Sudadera rugby verde botella')
    expect(displayName(g('hoodies', 'white', { type: 'sweater' }), 'es')).toBe('Jersey blanco')
    expect(displayName(g('polos', 'navy', { type: 'polo' }), 'es')).toBe('Polo azul marino')
  })
  it('concuerda en plural (zapatillas, gafas, calcetines)', () => {
    expect(displayName(g('footwear', 'red', { type: 'sneakers' }), 'es')).toBe('Zapatillas rojas')
    expect(displayName(g('footwear', 'blue', { type: 'boots' }), 'es')).toBe('Botas azules')
    expect(displayName(g('footwear', 'brown', { type: 'shoes' }), 'es')).toBe('Zapatos marrones')
    expect(displayName(g('accessories', 'grey', { type: 'glasses' }), 'es')).toBe('Gafas grises')
    expect(displayName(g('accessories', 'pink', { type: 'socks' }), 'es')).toBe('Calcetines rosa')
    expect(displayName(g('footwear', 'lightgrey', { type: 'sneakers' }), 'es')).toBe('Zapatillas gris claro')
  })
  it('no repite el vaquero', () => {
    expect(displayName(g('trousers', 'denim', { type: 'jeans' }), 'es')).toBe('Vaquero')
    expect(displayName(g('shirts', 'denim', { type: 'denimshirt' }), 'es')).toBe('Camisa vaquera')
    expect(displayName(g('trousers', 'black', { type: 'jeans' }), 'es')).toBe('Vaquero negro')
  })
  it('sin tipo usa el nombre de la categoría', () => {
    expect(displayName(g('hoodies', 'black'), 'es')).toBe('Sudadera negra')
    expect(displayName(g('trousers', 'black'), 'es')).toBe('Pantalón negro')
    expect(displayName(g('headwear', 'olive', { type: 'cap' }), 'es')).toBe('Gorra verde oliva')
  })
  it('en inglés', () => {
    expect(displayName(g('hoodies', 'black', { type: 'hoodie' }), 'en')).toBe('Black hoodie')
    expect(displayName(g('footwear', 'red', { type: 'sneakers' }), 'en')).toBe('Red sneakers')
  })
  it('respeta el nombre puesto a mano', () => expect(displayName(g('hoodies', 'black', { name: 'La de Carhartt' }), 'es')).toBe('La de Carhartt'))
})
