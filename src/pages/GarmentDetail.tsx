import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { db } from '../db/db'
import type { Garment } from '../db/types'
import { CATEGORIES, categoryById, SUBCATEGORY_WASH, type CategoryId } from '../domain/categories'
import { colorLabel, displayName } from '../domain/naming'
import { garmentStatus } from '../domain/wash'
import { reprocess } from '../features/capture/store'
import { fmt, useT } from '../i18n'
import { useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { useImage } from '../lib/useImage'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'
import { HeaderPill, NavButton, PageHeader } from '../ui/PageHeader'
import { StatusBadge } from '../ui/StatusBadge'

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

export function GarmentDetail({ id }: { id: string }) {
  const t = useT()
  const go = useNav()
  const { lang, ai } = useSettings()
  const g = useLiveQuery(() => db.garments.get(id), [id], null)
  const { url, status, isCutout } = useImage(g?.imageId, 'cutout')
  const [busy, setBusy] = useState(false)
  const aiOn = ai?.enabled === true

  if (g === null) return null // cargando
  const back = () => (history.length > 1 ? history.back() : go('/'))
  if (!g) return <div className="px-4"><PageHeader left={<NavButton icon="back" label={t.common.back} onClick={back} />} title={t.garment.notFound} /></div>

  const st = garmentStatus(g)
  const fmtDate = (d: number | string) => new Date(d).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })
  const setSub = (v: string) => {
    const w = SUBCATEGORY_WASH[v.trim().toLowerCase()]
    const isDefault = g.washAfter === categoryById(g.category).washAfter
    update(g.id, { subcategory: v.trim() || undefined, ...(w !== undefined && isDefault ? { washAfter: w } : {}) })
  }
  const setCategory = (c: CategoryId) => {
    if (c === g.category) return
    const wasDefault = g.washAfter === categoryById(g.category).washAfter
    update(g.id, { category: c, ...(wasDefault ? { washAfter: categoryById(c).washAfter } : {}) })
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

  return (
    <div className="pb-tab">
      <PageHeader left={<NavButton icon="back" label={t.common.back} onClick={back} />} center={<HeaderPill icon="tag">{t.categories[g.category]}</HeaderPill>} title={displayName(g, lang)} />

      <div className="page-in space-y-6 px-4">
        <div className="card overflow-hidden">
          <div className={`relative h-[44vh] bg-tile ${status === 'pending' ? 'processing' : ''}`}>
            {url && <img src={url} alt="" style={{ viewTransitionName: `g-${g.id}` }}
              className={`absolute inset-0 size-full ${isCutout ? 'product-shadow object-contain p-[10%]' : 'object-cover'}`} />}
            <span className="absolute top-3 left-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-black/55 px-2.5 text-[0.75rem] font-medium text-white backdrop-blur">
              <Icon name="clock" size={14} strokeWidth={1.8} />{fmtDate(g.createdAt)}
            </span>
            <span className="absolute top-3 right-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-white/90 px-2.5 text-[0.75rem] font-semibold text-black">
              <span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: g.color.hex }} />{colorLabel(g.color.name, lang)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[0.875rem] text-muted">{status === 'failed' ? t.garment.cutFailed : status === 'pending' ? t.wardrobe.processing : g.brand || t.garment.noBrand}</span>
            {(aiOn || status !== 'ready') && (
              <button onClick={redo} disabled={busy} className="press inline-flex items-center gap-1.5 text-[0.875rem] font-semibold disabled:opacity-40">
                <Icon name={aiOn ? 'sparkle' : 'refresh'} size={16} strokeWidth={1.8} />
                {busy ? t.garment.enhancing : aiOn ? t.garment.enhance : t.garment.retry}
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={st} pill />
            <span className="text-[0.9375rem] text-muted">{washText}</span>
          </div>
        </div>

        <section>
          <h2 className="section-label mb-2 px-1">{t.garment.category}</h2>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {CATEGORIES.map((c) => <Chip key={c.id} active={g.category === c.id} onClick={() => setCategory(c.id)}>{t.categories[c.id]}</Chip>)}
          </div>
        </section>

        <section>
          <h2 className="section-label mb-2 px-1">{t.garment.details}</h2>
          <div className="group">
            <Row label={t.garment.name}><TextField value={g.name} placeholder={displayName({ ...g, name: '' }, lang)} onSave={(name) => update(g.id, { name: name.trim() })} /></Row>
            <Row label={t.garment.subcategory}><TextField value={g.subcategory} placeholder={t.garment.subPlaceholder} onSave={setSub} list="subcats" /></Row>
            <Row label={t.garment.brand}><TextField value={g.brand} placeholder="—" onSave={(brand) => update(g.id, { brand: brand.trim() || undefined })} /></Row>
            {g.palette.length > 1 && (
              <Row label={t.garment.color} stacked>
                <div className="flex flex-wrap gap-1.5">
                  {g.palette.map((c) => <Chip key={c.hex} active={c.hex === g.color.hex} swatch={c.hex} onClick={() => update(g.id, { color: c })}>{colorLabel(c.name, lang)}</Chip>)}
                </div>
              </Row>
            )}
            <Row label={t.garment.notes} stacked><TextField value={g.notes} placeholder={t.garment.notesPlaceholder} multiline onSave={(notes) => update(g.id, { notes: notes.trim() || undefined })} /></Row>
          </div>
          <datalist id="subcats"><option value="Vaquero" /><option value="Chino" /><option value="Cargo" /><option value="Polo" /><option value="Zapatillas" /><option value="Gorra" /></datalist>
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
                onChange={() => update(g.id, { washAfter: g.washAfter === null ? categoryById(g.category).washAfter ?? 3 : null })} />
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
