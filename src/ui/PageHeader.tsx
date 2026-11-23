import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { LiquidGlass } from './LiquidGlass'

/** Botón redondo de la barra superior (volver, cerrar, más…) */
export function NavButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <LiquidGlass borderRadius={14} className="press size-11">
      <button onClick={onClick} aria-label={label} className="grid size-11 place-items-center"><Icon name={icon} size={22} strokeWidth={1.8} /></button>
    </LiquidGlass>
  )
}

/** Pastilla central con icono (como "Diagnosis") */
export function HeaderPill({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[0.8125rem] font-medium">
      {icon && <Icon name={icon} size={15} strokeWidth={1.8} />}{children}
    </span>
  )
}

/** Cabecera estilo iOS: fila de navegación opcional y título grande. */
export function PageHeader({ title, subtitle, left, center, right }: { title?: string; subtitle?: string; left?: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <header className="pt-safe px-4 pb-3">
      {(left || center || right) && (
        <div className="mb-3 grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          <div>{left}</div>
          <div className="text-center">{center}</div>
          <div className="flex justify-end">{right}</div>
        </div>
      )}
      {title && <h1 className="title">{title}</h1>}
      {subtitle && <p className="mt-1 text-[0.9375rem] text-muted">{subtitle}</p>}
    </header>
  )
}
