import type { GarmentStatus } from '../db/types'
import { useT } from '../i18n'

const dot: Record<GarmentStatus, string> = { clean: 'bg-clean', worn: 'bg-worn', dirty: 'bg-dirty' }

/** Punto + texto (para listas) o pastilla (para cabeceras). */
export function StatusBadge({ status, pill }: { status: GarmentStatus; pill?: boolean }) {
  const t = useT()
  if (pill) return <span className={`pill pill-${status}`}><span className={`size-1.5 rounded-full ${dot[status]}`} />{t.status[status]}</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted">
      <span className={`size-1.5 rounded-full ${dot[status]}`} />
      {t.status[status]}
    </span>
  )
}
