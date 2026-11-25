import { describe, expect, it } from 'vitest'
import { addDays, mondayOf, weekDays } from './week'

describe('semana', () => {
  it('lunes de la semana (también desde domingo)', () => {
    expect(mondayOf('2026-11-25')).toBe('2026-11-23') // miércoles
    expect(mondayOf('2026-11-29')).toBe('2026-11-23') // domingo
    expect(mondayOf('2026-11-23')).toBe('2026-11-23')
  })
  it('cruza meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(weekDays('2026-12-30')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
  })
  it('semana siguiente y anterior', () => {
    expect(weekDays('2026-11-25', 1)[0]).toBe('2026-11-30')
    expect(weekDays('2026-11-25', -1)[6]).toBe('2026-11-22')
  })
  it('cambio de hora (marzo) no duplica días', () => {
    expect(weekDays('2026-03-29')).toEqual(['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29'])
  })
})
