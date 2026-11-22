import type { GarmentStatus } from '../db/types'
import { useT } from '../i18n'

const color: Record<GarmentStatus, string> = { clean: 'bg-clean', worn: 'bg-worn', dirty: 'bg-dirty' }

export function StatusBadge({ status }: { status: GarmentStatus }) {
  const t = useT()
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-widest text-ink">
      <span className={`size-2 rounded-full ${color[status]}`} />
      {t.status[status]}
    </span>
  )
}
