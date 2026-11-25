import { expect, it } from 'vitest'
import { Spring } from './spring'

it('llega al objetivo y rebota un poco por encima (como iOS)', () => {
  const s = new Spring(0, 420, 22)
  s.target = 100
  let max = 0, t = 0
  while (s.step(1 / 60) && t < 5) { max = Math.max(max, s.value); t += 1 / 60 }
  expect(s.value).toBe(100)
  expect(max).toBeGreaterThan(100) // rebote
  expect(max).toBeLessThan(115)
  expect(t).toBeLessThan(1.5)
})
