import { Link } from 'wouter'
import { useState } from 'react'
import { useT } from '../i18n'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { HangerDrawing } from '../ui/Drawing'
import { Icon, type IconName } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { CATEGORIES } from '../domain/categories'

const swatches = [
  ['--bg', 'BG'], ['--surface', 'SURFACE'], ['--ink', 'INK'], ['--ink-muted', 'MUTED'],
  ['--accent', 'ACCENT'], ['--clean', 'CLEAN'], ['--worn', 'WORN'], ['--dirty', 'DIRTY'],
]
const icons: IconName[] = ['hanger', 'outfit', 'calendar', 'settings', 'camera', 'washer', 'check', 'sun', 'moon', 'ruler']

// Hoja de referencia del sistema de diseño (FIG. 00). Útil para revisar ambos temas en el iPhone.
export function Kit() {
  const t = useT()
  const [cat, setCat] = useState<string>('tshirts')
  return (
    <div className="page-in pb-tab">
      <header className="pt-safe px-5 pb-4">
        <Link href="/ajustes" className="press -ml-2 inline-flex h-11 items-center gap-1 pr-3 text-sm text-muted"><Icon name="back" size={20} />{t.common.back}</Link>
        <span className="fig mt-2 block">FIG. 00 — {t.kit.title}</span>
        <h1 className="mt-2 text-[2.6rem] leading-[.95] font-semibold tracking-[-0.04em]">{t.kit.title}</h1>
        <div className="ruler mt-4" />
      </header>
      <div className="space-y-8 px-5">
        <section>
          <h2 className="fig mb-3">00.A — Color</h2>
          <div className="grid grid-cols-4 gap-2">
            {swatches.map(([v, n]) => (
              <div key={v} className="plate p-1.5">
                <div className="aspect-square border border-line-soft" style={{ background: `var(${v})` }} />
                <span className="fig mt-1.5 block text-[0.5625rem]">{n}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="fig mb-3">00.B — Tipografía</h2>
          <div className="plate space-y-2 p-4">
            <p className="text-[2.6rem] leading-[.95] font-semibold tracking-[-0.04em]">Atelier</p>
            <p className="text-xl font-semibold tracking-tight">Inter Variable · títulos</p>
            <p className="text-sm text-muted">Texto de cuerpo para descripciones y notas.</p>
            <p className="fig">SF Mono · etiquetas técnicas · 0123456789</p>
          </div>
        </section>
        <section>
          <h2 className="fig mb-3">00.C — Botones</h2>
          <div className="space-y-2">
            <Button variant="primary" icon="camera" block>Primario</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button icon="washer">Línea</Button>
              <Button variant="ghost">Fantasma</Button>
            </div>
          </div>
        </section>
        <section>
          <h2 className="fig mb-3">00.D — Filtros y estados</h2>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {CATEGORIES.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{t.categories[c.id]}</Chip>)}
          </div>
          <div className="mt-3 flex gap-2"><Chip swatch="#1d2b53">Navy</Chip><Chip swatch="#c9b28f">Beige</Chip></div>
          <div className="mt-4 flex gap-5"><StatusBadge status="clean" /><StatusBadge status="worn" /><StatusBadge status="dirty" /></div>
        </section>
        <section>
          <h2 className="fig mb-3">00.E — Ficha de prenda</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['clean', 'dirty'] as const).map((st, i) => (
              <div key={st} className="plate p-2">
                <div className="grid aspect-[4/5] place-items-center bg-bg-soft text-muted"><Icon name={i ? 'hoodie' : 'tshirt'} size={64} strokeWidth={1} /></div>
                <div className="mt-2 flex items-center justify-between px-0.5">
                  <span className="fig text-[0.5625rem]">N.º 0{i + 1}</span><StatusBadge status={st} />
                </div>
                <p className="mt-1 truncate px-0.5 text-sm font-medium">{i ? 'Sudadera gris' : 'Camiseta blanca'}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="fig mb-3">00.F — Iconos y dibujo</h2>
          <div className="plate grid grid-cols-5 gap-y-4 p-4">
            {icons.map((n) => <div key={n} className="grid place-items-center"><Icon name={n} /></div>)}
            {CATEGORIES.map((c) => <div key={c.id} className="grid place-items-center"><Icon name={c.icon as IconName} /></div>)}
          </div>
          <div className="plate mt-3 grid place-items-center py-6"><HangerDrawing className="w-48" /></div>
        </section>
      </div>
    </div>
  )
}
