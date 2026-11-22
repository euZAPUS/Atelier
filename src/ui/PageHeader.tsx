import type { ReactNode } from 'react'
import { Barcode } from './Barcode'

// Cabecera: código de sección, titular gigante condensado y acción opcional.
export function PageHeader({ code, title, meta, action }: { code: string; title: string; meta?: string; action?: ReactNode }) {
  return (
    <header className="pt-safe px-4 pb-3">
      <div className="flex items-center justify-between">
        <span className="tag text-muted">{code}</span>
        <div className="flex items-center gap-2">
          {meta && <span className="tag text-muted">{meta}</span>}
          <Barcode value={title} className="h-4 w-14 text-ink" />
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <h1 className="display slam text-[clamp(3.6rem,19vw,6rem)]">{title}</h1>
        {action}
      </div>
    </header>
  )
}
