import { useEffect, useRef, useState, type ReactNode } from 'react'
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

/** Cabecera estilo iOS: fila de navegación opcional y título grande que, al hacer scroll, pasa a una barra pequeña. */
export function PageHeader({ title, subtitle, left, center, right }: { title?: string; subtitle?: string; left?: ReactNode; center?: ReactNode; right?: ReactNode }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [compact, setCompact] = useState(false)
  const hasNav = !!(left || center || right)
  useEffect(() => {
    const el = titleRef.current
    if (!el || hasNav) return
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNav])
  return (
    <header className="pt-safe px-4 pb-3">
      {title && !hasNav && (
        <div data-on={compact ? '1' : '0'} className="compact-bar fixed inset-x-0 top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <p className="mx-auto flex h-11 max-w-xl items-center justify-center text-[1.0625rem] font-semibold">{title}</p>
        </div>
      )}
      {hasNav && (
        <div className="mb-3 grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          <div>{left}</div>
          <div className="text-center">{center}</div>
          <div className="flex justify-end">{right}</div>
        </div>
      )}
      {title && <h1 ref={titleRef} className="title">{title}</h1>}
      {subtitle && <p className="mt-1 text-[0.9375rem] text-muted">{subtitle}</p>}
    </header>
  )
}
