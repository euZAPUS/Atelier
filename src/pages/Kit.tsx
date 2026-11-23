import { useState } from 'react'
import { CATEGORIES } from '../domain/categories'
import { NAMED_COLORS } from '../domain/color'
import { colorLabel } from '../domain/naming'
import { useT } from '../i18n'
import { useSettings } from '../lib/settings'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon, type IconName } from '../ui/Icon'
import { HeaderPill, NavButton, PageHeader } from '../ui/PageHeader'
import { StatusBadge } from '../ui/StatusBadge'
import { Toggle } from '../ui/Toggle'

const swatches = [['--bg', 'Fondo'], ['--surface', 'Superficie'], ['--tile', 'Foto'], ['--ink', 'Tinta'], ['--ink-muted', 'Secundario'], ['--clean', 'Limpia'], ['--worn', 'Usada'], ['--dirty', 'Sucia']]
const icons: IconName[] = ['hanger', 'outfit', 'scan', 'calendar', 'settings', 'camera', 'gallery', 'paste', 'sparkle', 'palette', 'washer', 'refresh', 'archive', 'trash', 'clock', 'tshirt', 'longsleeve', 'hoodie', 'jacket', 'trousers', 'shoe', 'cap', 'tag', 'info', 'check']

// Hoja de referencia del sistema de diseño, para revisarlo en el iPhone en los dos temas.
export function Kit() {
  const t = useT()
  const { lang } = useSettings()
  const [cat, setCat] = useState<string>('tshirts')
  const [on, setOn] = useState(true)
  const H = ({ children }: { children: string }) => <h2 className="section-label mb-2 px-1">{children}</h2>
  return (
    <div className="pb-tab">
      <PageHeader left={<NavButton icon="back" label={t.common.back} onClick={() => history.back()} />} center={<HeaderPill icon="ruler">Atelier</HeaderPill>} title={t.kit.title} subtitle="Blanco y negro, foto de estudio y tipografía del sistema." />
      <div className="page-in space-y-7 px-4">
        <section>
          <H>Color</H>
          <div className="grid grid-cols-4 gap-2">
            {swatches.map(([v, n]) => (
              <div key={v}><div className="aspect-square rounded-xl ring-1 ring-line-strong" style={{ background: `var(${v})` }} /><span className="mt-1 block text-[0.75rem] text-muted">{n}</span></div>
            ))}
          </div>
        </section>
        <section>
          <H>Tipografía</H>
          <div className="card space-y-1 p-4">
            <p className="title">Título grande</p>
            <p className="text-[1.0625rem] font-semibold">Titular de tarjeta</p>
            <p className="text-[0.9375rem]">Texto de lectura, 15 px.</p>
            <p className="text-[0.8125rem] text-muted">Texto secundario, 13 px.</p>
            <p className="section-label pt-2">Etiqueta de sección</p>
          </div>
        </section>
        <section>
          <H>Botones</H>
          <div className="space-y-2">
            <Button variant="primary" icon="camera" block>Principal</Button>
            <div className="grid grid-cols-2 gap-2"><Button icon="gallery">Secundario</Button><Button variant="danger" icon="trash">Eliminar</Button></div>
          </div>
        </section>
        <section>
          <H>Controles</H>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {CATEGORIES.map((c, i) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} count={i + 2}>{t.categories[c.id]}</Chip>)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status="clean" pill /><StatusBadge status="worn" pill /><StatusBadge status="dirty" pill /><Toggle checked={on} onChange={setOn} label="Toggle" /></div>
        </section>
        <section>
          <H>Colores de ropa</H>
          <div className="card grid grid-cols-3 gap-2 p-3">
            {NAMED_COLORS.map((c) => (
              <div key={c.id} className="flex items-center gap-2"><span className="size-4 shrink-0 rounded-full ring-1 ring-line-strong" style={{ background: c.hex }} /><span className="truncate text-[0.8125rem] capitalize">{colorLabel(c.id, lang)}</span></div>
            ))}
          </div>
        </section>
        <section>
          <H>Iconos</H>
          <div className="card grid grid-cols-5 gap-y-5 p-4">{icons.map((n) => <div key={n} className="grid place-items-center"><Icon name={n} size={24} strokeWidth={1.6} /></div>)}</div>
        </section>
      </div>
    </div>
  )
}
