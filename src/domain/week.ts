// Semanas de lunes a domingo, en hora local. Las fechas son 'YYYY-MM-DD' (como DayPlan y WearLog).
import { today } from './wash'

export const parseDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s: string, n: number) => { const d = parseDate(s); d.setDate(d.getDate() + n); return today(d) }

/** Lunes de la semana de esa fecha. */
export function mondayOf(s: string) {
  const dow = (parseDate(s).getDay() + 6) % 7 // lunes = 0
  return addDays(s, -dow)
}

/** Los 7 días de la semana desplazada `offset` semanas desde la de `ref`. */
export function weekDays(ref: string, offset = 0) {
  const mon = addDays(mondayOf(ref), offset * 7)
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}
