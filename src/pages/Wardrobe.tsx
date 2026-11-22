import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../db/db'
import type { GarmentStatus } from '../db/types'
import { CATEGORIES, type CategoryId } from '../domain/categories'
import { NAMED_COLORS } from '../domain/color'
import { colorLabel } from '../domain/naming'
import { garmentStatus } from '../domain/wash'
import { CaptureInput } from '../features/capture/CaptureInput'
import { GarmentCard } from '../features/wardrobe/GarmentCard'
import { fmt, useT } from '../i18n'
import { useSettings } from '../lib/settings'
import { buttonBase, buttonStyles } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'
import { Marquee } from '../ui/Marquee'
import { LiquidGlass } from '../ui/LiquidGlass'
import { PageHeader } from '../ui/PageHeader'

export function Wardrobe() {
  const t = useT()
  const { lang } = useSettings()
  const all = useLiveQuery(() => db.garments.orderBy('createdAt').reverse().filter((g) => !g.archived).toArray(), [])
  const [cat, setCat] = useState<CategoryId | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [status, setStatus] = useState<GarmentStatus | null>(null)

  const garments = all ?? []
  // Número de prenda por orden de alta (N.º 001 = la primera)
  const numbers = useMemo(() => new Map([...garments].reverse().map((g, i) => [g.id, i + 1])), [garments])
  const byCat = useMemo(() => {
    const m = new Map<string, number>()
    garments.forEach((g) => m.set(g.category, (m.get(g.category) ?? 0) + 1))
    return m
  }, [garments])
  const colors = useMemo(() => {
    const m = new Map<string, number>()
    garments.forEach((g) => g.color.name !== 'pending' && m.set(g.color.name, (m.get(g.color.name) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [garments])
  const statuses = useMemo(() => garments.map(garmentStatus), [garments])
  const shown = garments.filter((g, i) => (!cat || g.category === cat) && (!color || g.color.name === color) && (!status || statuses[i] === status))
  const filtered = cat || color || status
  const cleanCount = statuses.filter((s) => s === 'clean').length
  const countLabel = garments.length === 1 ? t.wardrobe.countOne : fmt(t.wardrobe.count, { n: garments.length })

  return (
    <div className="pb-tab">
      <PageHeader code="01 / WARDROBE" title={t.wardrobe.title} meta={countLabel} />
      <Marquee className="display-wide border-y-2 border-ink bg-accent py-1.5 text-[0.8rem] text-accent-ink"
        items={t.wardrobe.marquee.map((s) => fmt(s, { count: countLabel, clean: cleanCount, drop: String(garments.length).padStart(3, '0') }))} />

      {all && garments.length === 0 ? (
        <section className="page-in px-4 pt-8">
          <div className="relative overflow-hidden bg-ink px-5 pt-10 pb-6 text-bg">
            <span className="display pointer-events-none absolute -right-3 -bottom-6 text-[9rem] text-bg/10">000</span>
            <span className="tag text-accent">N.º 000</span>
            <h2 className="display mt-2 text-6xl">{t.wardrobe.emptyTitle}</h2>
            <p className="mt-4 max-w-xs text-sm leading-relaxed opacity-75">{t.wardrobe.emptyBody}</p>
            <CaptureInput className={`${buttonBase} ${buttonStyles.primary} mt-8 w-full`}>
              <Icon name="camera" size={20} strokeWidth={2} />{t.wardrobe.emptyCta}
            </CaptureInput>
          </div>
        </section>
      ) : (
        <>
          <div className="sticky z-30 px-2 py-2" style={{ top: 'env(safe-area-inset-top)' }}>
          <LiquidGlass borderRadius={26} className="space-y-2 overflow-hidden py-2.5">
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-2.5">
              <Chip active={!cat} onClick={() => setCat(null)} count={garments.length}>{t.wardrobe.all}</Chip>
              {CATEGORIES.filter((c) => byCat.has(c.id)).map((c) => (
                <Chip key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)} count={byCat.get(c.id)}>{t.categories[c.id]}</Chip>
              ))}
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-2.5">
              {(['clean', 'worn', 'dirty'] as const).map((s) => (
                <Chip key={s} active={status === s} onClick={() => setStatus(status === s ? null : s)}>{t.statusPlural[s]}</Chip>
              ))}
              <span className="mx-1 w-px shrink-0 bg-line-soft" />
              {colors.map(([c, n]) => (
                <Chip key={c} active={color === c} onClick={() => setColor(color === c ? null : c)} count={n}
                  swatch={NAMED_COLORS.find((x) => x.id === c)?.hex}>{colorLabel(c, lang)}</Chip>
              ))}
            </div>
          </LiquidGlass>
          </div>
          {shown.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-4 pt-2">
              {shown.map((g, i) => <GarmentCard key={g.id} g={g} index={i} number={numbers.get(g.id) ?? 0} />)}
            </div>
          ) : filtered && (
            <div className="page-in px-4 pt-12 text-center">
              <p className="display text-4xl">{t.wardrobe.noMatch}</p>
              <button className="press tag mt-4 underline" onClick={() => { setCat(null); setColor(null); setStatus(null) }}>{t.wardrobe.clearFilters}</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
