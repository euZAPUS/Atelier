import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { db } from '../db/db'
import type { Garment } from '../db/types'
import { CATEGORIES, defaultWash, typesOf, type CategoryId } from '../domain/categories'
import { NAMED_COLORS } from '../domain/color'
import { clashesFor, matchesFor } from '../domain/harmony'
import { colorLabel, displayName, typeLabel } from '../domain/naming'
import { daysAgo, garmentStatus } from '../domain/wash'
import { reprocess } from '../features/capture/store'
import { MatchRow } from '../features/wardrobe/MatchRow'
import { fmt, useT } from '../i18n'
import { setDirty, wearGarment } from '../lib/actions'
import { useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { useImage } from '../lib/useImage'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'
import { LiquidGlass } from '../ui/LiquidGlass'
import { HeaderPill, NavButton, PageHeader } from '../ui/PageHeader'
import { StatusBadge } from '../ui/StatusBadge'
import { toast } from '../ui/Toast'

const update = (id: string, patch: Partial<Garment>) => db.garments.update(id, { ...patch, updatedAt: Date.now() })

/** Fila de lista agrupada: etiqueta a la izquierda, control a la derecha o debajo. */
function Row({ label, children, stacked }: { label: string; children: ReactNode; stacked?: boolean }) {
  return (
    <label className={`block px-4 py-3 ${stacked ? '' : 'flex items-center justify-between gap-4'}`}>
      <span className={`shrink-0 text-[0.9375rem] ${stacked ? 'mb-2 block text-muted' : ''}`}>{label}</span>
      {children}
    </label>
  )
}

// Campo de texto que guarda al salir (sin botón de guardar)
function TextField({ value, placeholder, onSave, list, multiline }: { value?: string; placeholder?: string; onSave: (v: string) => void; list?: string; multiline?: boolean }) {
  const cls = 'w-full min-w-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-faint'
  return multiline
    ? <textarea defaultValue={value} placeholder={placeholder} rows={3} onBlur={(e) => e.target.value !== (value ?? '') && onSave(e.target.value)} className={`${cls} resize-none`} />
    : <input defaultValue={value} placeholder={placeholder} list={list} enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onBlur={(e) => e.target.value !== (value ?? '') && onSave(e.target.value)} className={`${cls} text-right`} />
}

const hexOf = (id: string) => NAMED_COLORS.find((c) => c.id === id)?.hex ?? '#888'

/** Muestra de color con su nombre debajo */
function Swatch({ hex, label, selected, onClick, crossed }: { hex: string; label: string; selected?: boolean; onClick?: () => void; crossed?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`flex w-14 shrink-0 flex-col items-center gap-1.5 ${onClick ? 'press' : ''}`}>
      <span className={`relative size-10 rounded-full ring-offset-2 ring-offset-bg ${selected ? 'ring-2 ring-ink' : 'ring-1 ring-line-strong'}`} style={{ background: hex }}>
        {crossed && <span className="absolute inset-0 m-auto h-[2px] w-[120%] -translate-x-[8%] rotate-45 rounded bg-dirty" />}
      </span>
      <span className="line-clamp-2 text-center text-[0.6875rem] leading-tight text-muted first-letter:uppercase">{label}</span>
    </Tag>
  )
}

export function GarmentDetail({ id }: { id: string }) {
  const t = useT()
  const go = useNav()
  const { lang, ai } = useSettings()
  const g = useLiveQuery(() => db.garments.get(id), [id], null)
  const { url, status, isCutout } = useImage(g?.imageId, 'cutout')
  const [busy, setBusy] = useState(false)
  const aiOn = ai?.enabled !== false // activada por defecto

  if (g === null) return null // cargando
  const back = () => (history.length > 1 ? history.back() : go('/'))
  if (!g) return <div className="px-4"><PageHeader left={<NavButton icon="back" label={t.common.back} onClick={back} />} title={t.garment.notFound} /></div>

  const st = garmentStatus(g)
  const fmtDate = (d: number | string) => new Date(d).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })
  // Si los usos antes de lavar eran los de serie, se actualizan al cambiar de categoría o de tipo
  const isDefaultWash = g.washAfter === defaultWash(g.category, g.type)
  const setType = (type?: string) => {
    if (type === g.type) type = undefined // tocar el tipo activo lo quita
    update(g.id, { type, ...(isDefaultWash ? { washAfter: defaultWash(g.category, type) } : {}) })
  }
  const setCategory = (c: CategoryId) => {
    if (c === g.category) return
    update(g.id, { category: c, type: undefined, ...(isDefaultWash ? { washAfter: defaultWash(c) } : {}) })
  }
  const remove = async () => {
    if (!confirm(t.garment.confirmDelete)) return
    await db.transaction('rw', db.garments, db.images, async () => { await db.images.delete(g.imageId); await db.garments.delete(g.id) })
    go('/', { replace: true })
  }
  const redo = async () => {
    setBusy(true)
    const r = await reprocess(g.id)
    setBusy(false)
    if (r.aiFallback) alert(t.capture.fallback[r.aiFallback])
  }
  const washText = g.washAfter === null ? t.garment.washNever : fmt(t.garment.washProgress, { n: g.wearsSinceWash, max: g.washAfter })

  const daysSince = g.lastWornAt ? daysAgo(g.lastWornAt) : null
  const subtitle = [g.brand, g.type ? typeLabel(g.category, g.type, lang) : t.categories[g.category]].filter(Boolean).join(' · ')
  const matches = g.color.name !== 'pending' ? matchesFor(g.color.name) : []
  const clashes = g.color.name !== 'pending' ? clashesFor(g.color.name) : []

  return (
    <div className="pb-tab">
      {/* Prenda a todo lo ancho, con los controles flotando encima */}
      <div className={`relative h-[56vh] min-h-80 bg-tile ${status === 'pending' ? 'processing' : ''}`}>
        {url && <img src={url} alt="" style={{ viewTransitionName: `g-${g.id}` }}
          className={`absolute inset-0 size-full ${isCutout ? 'product-shadow object-contain px-[16%] pt-[22%] pb-[10%]' : 'object-cover'}`} />}
        <div className="pt-safe absolute inset-x-0 top-0 flex items-center justify-between px-4">
          <NavButton icon="back" label={t.common.back} onClick={back} />
          <HeaderPill icon="tag">{t.categories[g.category]}</HeaderPill>
          {(aiOn || status !== 'ready') ? (
            <LiquidGlass borderRadius={14} className="press size-11">
              <button onClick={redo} disabled={busy} aria-label={aiOn ? t.garment.enhance : t.garment.retry} className="grid size-11 place-items-center disabled:opacity-40">
                <Icon name={aiOn ? 'sparkle' : 'refresh'} size={20} strokeWidth={1.8} className={busy ? 'pulse-dot' : ''} />
              </button>
            </LiquidGlass>
          ) : <span className="size-11" />}
        </div>
        {(status === 'failed' || status === 'pending' || busy) && (
          <span className="absolute bottom-3 left-4 rounded-full bg-black/60 px-2.5 py-1 text-[0.75rem] font-medium text-white backdrop-blur">
            {busy ? t.garment.enhancing : status === 'failed' ? t.garment.cutFailed : t.wardrobe.processing}
          </span>
        )}
      </div>

      <div className="page-in space-y-7 px-4 pt-5">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">{displayName(g, lang)}</h1>
          <p className="mt-1 text-[0.9375rem] text-muted">{subtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={st} pill />
            <span className="text-[0.875rem] text-muted">{washText}</span>
          </div>
          {/* Acciones del día a día */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" icon="check" onClick={async () => {
              const undo = await wearGarment(g.id)
              toast(t.garment.woreToast, { label: t.common.undo, run: undo })
            }}>{t.garment.wore}</Button>
            {st === 'dirty' ? (
              <Button icon="washer" onClick={async () => {
                const undo = await setDirty(g.id, false)
                toast(t.garment.washedToast, { label: t.common.undo, run: undo })
              }}>{t.garment.washed}</Button>
            ) : (
              <Button icon="washer" onClick={async () => {
                const undo = await setDirty(g.id, true)
                toast(t.garment.dirtyToast, { label: t.common.undo, run: undo })
              }}>{t.garment.dirtyManual}</Button>
            )}
          </div>
        </div>

        {/* Cifras grandes */}
        <div className="grid grid-cols-3 border-t border-line-strong pt-4">
          {[
            [g.washAfter === null ? '∞' : `${g.wearsSinceWash}/${g.washAfter}`, t.garment.statWash],
            [String(g.wearsTotal), t.garment.statTotal],
            [daysSince === null ? '—' : daysSince === 0 ? t.garment.todayShort : fmt(t.garment.days, { n: daysSince }), t.garment.statLast],
          ].map(([v, k]) => (
            <div key={k}><b className="block text-[1.5rem] font-normal tracking-tight tabular-nums">{v}</b><span className="block pr-2 text-[0.75rem] leading-tight text-muted">{k}</span></div>
          ))}
        </div>

        {/* Colores: los suyos, con qué combina y qué evitar */}
        {g.color.name !== 'pending' && (
          <section className="space-y-4">
            <div>
              <h2 className="section-label mb-2 px-1">{t.garment.ownColors}</h2>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {(g.palette.length ? g.palette : [g.color]).map((c) => (
                  <Swatch key={c.hex} hex={c.hex} label={colorLabel(c.name, lang)} selected={c.hex === g.color.hex}
                    onClick={g.palette.length > 1 ? () => update(g.id, { color: c }) : undefined} />
                ))}
              </div>
            </div>
            {matches.length > 0 && (
              <div>
                <h2 className="section-label mb-2 px-1">{t.garment.matches}</h2>
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                  {matches.map((c) => <Swatch key={c} hex={hexOf(c)} label={colorLabel(c, lang)} />)}
                </div>
              </div>
            )}
            {clashes.length > 0 && (
              <div>
                <h2 className="section-label mb-2 px-1">{t.garment.avoid}</h2>
                <div className="flex gap-2">{clashes.map((c) => <Swatch key={c} hex={hexOf(c)} label={colorLabel(c, lang)} crossed />)}</div>
              </div>
            )}
            <MatchRow g={g} label={t.garment.matchesOwned} />
            <MatchRow g={g} label={t.garment.clashesOwned} clash />
          </section>
        )}

        <section>
          <h2 className="section-label mb-2 px-1">{t.garment.category}</h2>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {CATEGORIES.map((c) => <Chip key={c.id} active={g.category === c.id} onClick={() => setCategory(c.id)}>{t.categories[c.id]}</Chip>)}
          </div>
          <h2 className="section-label mt-4 mb-2 px-1">{t.garment.subcategory}</h2>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {typesOf(g.category).map((ty) => <Chip key={ty.id} active={g.type === ty.id} onClick={() => setType(ty.id)}>{lang === 'es' ? ty.es : ty.en}</Chip>)}
          </div>
        </section>

        <section>
          <h2 className="section-label mb-2 px-1">{t.garment.details}</h2>
          <div className="group">
            <Row label={t.garment.name}><TextField value={g.name} placeholder={displayName({ ...g, name: '' }, lang)} onSave={(name) => update(g.id, { name: name.trim() })} /></Row>
            <Row label={t.garment.brand}><TextField value={g.brand} placeholder="—" onSave={(brand) => update(g.id, { brand: brand.trim() || undefined })} /></Row>
            <Row label={t.garment.notes} stacked><TextField value={g.notes} placeholder={t.garment.notesPlaceholder} multiline onSave={(notes) => update(g.id, { notes: notes.trim() || undefined })} /></Row>
          </div>
        </section>

        <section>
          <h2 className="section-label mb-2 px-1">{t.garment.washSection}</h2>
          <div className="group">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-[0.9375rem]">{t.garment.wash}</span>
              <div className="flex items-center gap-1">
                <button aria-label="−" disabled={g.washAfter === null || g.washAfter <= 1} onClick={() => update(g.id, { washAfter: (g.washAfter ?? 2) - 1 })}
                  className="press grid size-9 place-items-center rounded-[10px] bg-surface-2 disabled:opacity-30"><Icon name="minus" size={18} strokeWidth={2} /></button>
                <span className="w-9 text-center text-[1.0625rem] font-semibold tabular-nums">{g.washAfter ?? '∞'}</span>
                <button aria-label="+" onClick={() => update(g.id, { washAfter: (g.washAfter ?? 0) + 1 })}
                  className="press grid size-9 place-items-center rounded-[10px] bg-surface-2"><Icon name="plus" size={18} strokeWidth={2} /></button>
              </div>
            </div>
            <label className="flex items-center justify-between px-4 py-3">
              <span className="text-[0.9375rem]">{t.garment.never}</span>
              <input type="checkbox" checked={g.washAfter === null} className="size-5 accent-[var(--ink)]"
                onChange={() => update(g.id, { washAfter: g.washAfter === null ? defaultWash(g.category, g.type) ?? 3 : null })} />
            </label>
          </div>
        </section>

        <section>
          <h2 className="section-label mb-2 px-1">{t.garment.stats}</h2>
          <div className="group">
            {[
              [t.garment.wearsTotal, String(g.wearsTotal)],
              [t.garment.lastWorn, g.lastWornAt ? fmtDate(g.lastWornAt) : t.garment.neverWorn],
              [t.garment.added, fmtDate(g.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-4 py-3 text-[0.9375rem]">
                <span>{k}</span><span className="text-muted">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button icon="archive" onClick={async () => { await update(g.id, { archived: !g.archived }); if (!g.archived) go('/', { replace: true }) }}>
            {g.archived ? t.garment.unarchive : t.garment.archive}
          </Button>
          <Button variant="danger" icon="trash" onClick={remove}>{t.garment.delete}</Button>
        </div>
      </div>
    </div>
  )
}
