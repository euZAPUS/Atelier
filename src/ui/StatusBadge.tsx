import type { GarmentStatus } from '../db/types'
import { useT } from '../i18n'

const color: Record<GarmentStatus, string> = { clean: 'bg-clean', worn: 'bg-worn', dirty: 'bg-dirty' }

export function StatusBadge({ status, onDark }: { status: GarmentStatus; onDark?: boolean }) {
  const t = useT()
  return (
    <span className={`tag inline-flex items-center gap-1.5 ${onDark ? 'text-white' : 'text-ink'}`}>
      <span className={`size-2 rounded-full ${color[status]}`} />
      {t.status[status]}
    </span>
  )
}
