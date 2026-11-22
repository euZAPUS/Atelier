import { useState } from 'react'
import { CATEGORIES } from '../domain/categories'
import { NAMED_COLORS } from '../domain/color'
import { colorLabel } from '../domain/naming'
import { useT } from '../i18n'
import { useSettings } from '../lib/settings'
import { Barcode } from '../ui/Barcode'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon, type IconName } from '../ui/Icon'
import { Marquee } from '../ui/Marquee'
import { StatusBadge } from '../ui/StatusBadge'

const swatches = [['--bg', 'BG'], ['--surface', 'SURFACE'], ['--tile', 'TILE'], ['--ink', 'INK'], ['--accent', 'ACCENT'], ['--clean', 'CLEAN'], ['--worn', 'WORN'], ['--dirty', 'DIRTY']]
const icons: IconName[] = ['hanger', 'outfit', 'calendar', 'settings', 'camera', 'gallery', 'paste', 'washer', 'refresh', 'archive', 'trash', 'bolt', 'tshirt', 'longsleeve', 'hoodie', 'jacket', 'trousers', 'shoe', 'cap', 'check']

// Hoja de referencia del sistema de diseño, para revisarlo en el iPhone en los dos temas.
export function Kit() {
  const t = useT()
  const { lang } = useSettings()
  const [cat, setCat] = useState<string>('tshirts')
  const H = ({ n, children }: { n: string; children: string }) => <h2 className="mb-3 flex items-baseline gap-3"><span className="tag text-muted">{n}</span><span className="display text-3xl">{children}</span></h2>
  return (
    <div className="pb-tab">
      <header className="pt-safe px-4 pb-3">
        <button onClick={() => history.back()} className="press -ml-2 inline-flex h-11 items-center gap-1 pr-3 text-sm font-bold uppercase"><Icon name="back" size={20} strokeWidth={2} />{t.common.back}</button>
        <h1 className="display slam mt-2 text-[clamp(3.6rem,19vw,6rem)]">{t.kit.title}</h1>
      </header>
      <Marquee className="display-wide border-y-2 border-ink bg-accent py-1.5 text-[0.8rem] text-accent-ink" items={['Atelier', 'Design system', 'Drop 001', 'Archivo + Mono']} />
      <div className="page-in space-y-10 px-4 pt-6">
        <section>
          <H n="A">Color</H>
          <div className="grid grid-cols-4 gap-2">
            {swatches.map(([v, n]) => (
              <div key={v}><div className="aspect-square ring-1 ring-line-soft" style={{ background: `var(${v})` }} /><span className="tag mt-1 block text-muted">{n}</span></div>
            ))}
          </div>
        </section>
        <section>
          <H n="B">Tipo</H>
          <p className="display text-7xl">Atelier</p>
          <p className="display-wide mt-2 text-xl">Archivo expanded</p>
          <p className="mt-2 text-sm text-muted">Archivo variable para el cuerpo del texto.</p>
          <div className="mt-2 flex items-center gap-3"><span className="tag">SKU · N.º 001 · 0123456789</span><Barcode value="atelier" className="h-5 w-20" /></div>
        </section>
        <section>
          <H n="C">Botones</H>
          <div className="space-y-2">
            <Button variant="primary" icon="camera" block>Primario</Button>
            <div className="grid grid-cols-2 gap-2"><Button variant="ink" icon="washer">Tinta</Button><Button icon="refresh">Línea</Button></div>
            <div className="grid grid-cols-2 gap-2"><Button variant="ghost">Fantasma</Button><Button variant="danger" icon="trash">Peligro</Button></div>
          </div>
        </section>
        <section>
          <H n="D">Filtros</H>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {CATEGORIES.map((c, i) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} count={i + 2}>{t.categories[c.id]}</Chip>)}
          </div>
          <div className="mt-4 flex gap-5"><StatusBadge status="clean" /><StatusBadge status="worn" /><StatusBadge status="dirty" /></div>
        </section>
        <section>
          <H n="E">Colores de ropa</H>
          <div className="grid grid-cols-3 gap-2">
            {NAMED_COLORS.map((c) => (
              <div key={c.id} className="flex items-center gap-2"><span className="size-5 shrink-0 rounded-full ring-1 ring-line-soft" style={{ background: c.hex }} /><span className="truncate text-xs font-bold uppercase">{colorLabel(c.id, lang)}</span></div>
            ))}
          </div>
        </section>
        <section>
          <H n="F">Iconos</H>
          <div className="grid grid-cols-5 gap-y-5">{icons.map((n) => <div key={n} className="grid place-items-center"><Icon name={n} size={26} /></div>)}</div>
        </section>
        <section>
          <H n="G">Movimiento</H>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative aspect-square overflow-hidden bg-tile"><div className="scan absolute inset-0" /><span className="tag absolute bottom-2 left-2">Escaneo</span></div>
            <div className="grid aspect-square place-items-center bg-accent"><Icon name="hoodie" size={80} strokeWidth={1.2} className="pop text-accent-ink" /></div>
          </div>
        </section>
      </div>
    </div>
  )
}
