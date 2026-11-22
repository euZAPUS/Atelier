import type { ReactNode } from 'react'

// Cabecera de lámina: número de figura, título grande y regla.
export function PageHeader({ fig, title, meta, action }: { fig: string; title: string; meta?: string; action?: ReactNode }) {
  return (
    <header className="pt-safe px-5 pb-4">
      <div className="flex items-center justify-between">
        <span className="fig">FIG. {fig} — {title}</span>
        {meta && <span className="fig">{meta}</span>}
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <h1 className="text-[2.6rem] leading-[.95] font-semibold tracking-[-0.04em]">{title}</h1>
        {action}
      </div>
      <div className="ruler mt-4" />
    </header>
  )
}
