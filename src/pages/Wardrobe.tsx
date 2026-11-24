import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../db/db'
import type { GarmentStatus } from '../db/types'
import { CATEGORIES, typesOf, type CategoryId } from '../domain/categories'
import { NAMED_COLORS } from '../domain/color'
import { colorLabel, displayName, typeLabel } from '../domain/naming'
import { garmentStatus } from '../domain/wash'
import { CaptureInput } from '../features/capture/CaptureInput'
import { GarmentCard } from '../features/wardrobe/GarmentCard'
import { fmt, useT } from '../i18n'
import { useSettings } from '../lib/settings'
import { buttonBase, buttonStyles } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { LiquidGlass } from '../ui/LiquidGlass'

/** Filtro de texto en píldora: activo = píldora blanca, inactivo = solo texto */
function Pill({ active, onClick, children, swatch }: { active: boolean; onClick: () => void; children: React.ReactNode; swatch?: string }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium ${active ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
      {swatch && <span className="size-3 rounded-full ring-1 ring-line-strong" style={{ background: swatch }} />}
      {children}
    </button>
  )
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function Wardrobe() {
  const t = useT()
  const { lang } = useSettings()
  const all = useLiveQuery(() => db.garments.orderBy('createdAt').reverse().filter((g) => !g.archived).toArray(), [])
  const [cat, setCatRaw] = useState<CategoryId | null>(null)
  const [type, setType] = useState<string | null>(null)
  const setCat = (c: CategoryId | null) => { setCatRaw(c); setType(null) }
  const [color, setColor] = useState<string | null>(null)
  const [status, setStatus] = useState<GarmentStatus | null>(null)
  const [q, setQ] = useState('')

  const garments = all ?? []
  const byCat = useMemo(() => new Set(garments.map((g) => g.category)), [garments])
  const colors = useMemo(() => {
    const m = new Map<string, number>()
    garments.forEach((g) => g.color.name !== 'pending' && m.set(g.color.name, (m.get(g.color.name) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [garments])
  const statuses = useMemo(() => garments.map(garmentStatus), [garments])
  const query = norm(q.trim())
  const shown = garments.filter((g, i) =>
    (!cat || g.category === cat) && (!type || g.type === type) && (!color || g.color.name === color) && (!status || statuses[i] === status) &&
    (!query || norm(`${displayName(g, lang)} ${g.brand ?? ''} ${g.subcategory ?? ''} ${g.type ? typeLabel(g.category, g.type, lang) : ''} ${t.categories[g.category]} ${colorLabel(g.color.name, lang)}`).includes(query)))
  const filtered = cat || type || color || status || query
  const count = garments.length === 1 ? t.wardrobe.countOne : fmt(t.wardrobe.count, { n: garments.length })

  return (
    <div className="relative isolate pb-tab">
      <div className="aura-wrap"><div className="aura" /></div>
      <header className="pt-safe px-4 pb-2">
        <div className="flex items-end justify-between">
          <h1 className="title">{t.wardrobe.title}</h1>
          {garments.length > 0 && <span className="mb-1 text-[0.875rem] text-muted">{count}</span>}
        </div>
      </header>

      {all && garments.length === 0 ? (
        <section className="page-in px-4 pt-2">
          <div className="card flex flex-col items-center px-6 pt-10 pb-6 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-surface-2"><Icon name="hanger" size={30} strokeWidth={1.5} /></div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">{t.wardrobe.emptyTitle}</h2>
            <p className="mt-2 max-w-xs text-[0.9375rem] leading-relaxed text-muted">{t.wardrobe.emptyBody}</p>
            <CaptureInput className={`${buttonBase} ${buttonStyles.primary} mt-7 w-full`}>
              <Icon name="camera" size={20} strokeWidth={1.8} />{t.wardrobe.emptyCta}
            </CaptureInput>
          </div>
        </section>
      ) : (
        <>
          <div className="sticky z-30 space-y-2 bg-bg/80 px-4 pt-1 pb-2 backdrop-blur-xl" style={{ top: 'env(safe-area-inset-top)' }}>
            <LiquidGlass borderRadius={12} className="flex h-10 items-center gap-2 px-3">
              <Icon name="search" size={18} strokeWidth={1.8} className="shrink-0 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.wardrobe.search} enterKeyHint="search" type="search"
                className="h-full w-full bg-transparent text-[1rem] outline-none placeholder:text-muted" />
              {q && <button onClick={() => setQ('')} aria-label={t.common.close} className="press text-muted"><Icon name="close" size={16} strokeWidth={2} /></button>}
            </LiquidGlass>
            <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4">
              <Pill active={!status} onClick={() => setStatus(null)}>{t.wardrobe.all}</Pill>
              {(['clean', 'worn', 'dirty'] as const).map((s) => <Pill key={s} active={status === s} onClick={() => setStatus(status === s ? null : s)}>{t.statusPlural[s]}</Pill>)}
              <span className="mx-1 my-1.5 w-px shrink-0 bg-line-strong" />
              {CATEGORIES.filter((c) => byCat.has(c.id)).map((c) => <Pill key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>{t.categories[c.id]}</Pill>)}
              {colors.length > 1 && <span className="mx-1 my-1.5 w-px shrink-0 bg-line-strong" />}
              {colors.length > 1 && colors.map((c) => (
                <Pill key={c} active={color === c} onClick={() => setColor(color === c ? null : c)} swatch={NAMED_COLORS.find((x) => x.id === c)?.hex}>
                  <span className="first-letter:uppercase">{colorLabel(c, lang)}</span>
                </Pill>
              ))}
            </div>
            {cat && (() => {
              const present = new Set(garments.filter((g) => g.category === cat && g.type).map((g) => g.type))
              const list = typesOf(cat).filter((ty) => present.has(ty.id))
              return list.length > 1 ? (
                <div className="page-in no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4">
                  {list.map((ty) => <Pill key={ty.id} active={type === ty.id} onClick={() => setType(type === ty.id ? null : ty.id)}>{lang === 'es' ? ty.es : ty.en}</Pill>)}
                </div>
              ) : null
            })()}
          </div>
          {shown.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 pt-2">
              {shown.map((g, i) => <GarmentCard key={g.id} g={g} index={i} />)}
            </div>
          ) : filtered && (
            <div className="page-in px-4 pt-12 text-center">
              <p className="text-lg font-semibold">{t.wardrobe.noMatch}</p>
              <button className="press mt-2 text-[0.9375rem] font-medium text-muted underline" onClick={() => { setCat(null); setColor(null); setStatus(null); setQ('') }}>{t.wardrobe.clearFilters}</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
