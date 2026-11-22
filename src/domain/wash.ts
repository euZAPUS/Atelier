import type { Garment, GarmentStatus } from '../db/types'

// El estado no se guarda: se calcula a partir de los usos. Así nunca se desincroniza.
export function garmentStatus(g: Pick<Garment, 'wearsSinceWash' | 'washAfter' | 'manualDirty'>): GarmentStatus {
  if (g.washAfter === null) return 'clean'
  if (g.manualDirty || g.wearsSinceWash >= g.washAfter) return 'dirty'
  if (g.wearsSinceWash > 0) return 'worn'
  return 'clean'
}
