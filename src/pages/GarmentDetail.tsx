import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { db } from '../db/db'
import type { Garment } from '../db/types'
import { CATEGORIES, categoryById, SUBCATEGORY_WASH, type CategoryId } from '../domain/categories'
import { colorLabel, displayName } from '../domain/naming'
import { garmentStatus } from '../domain/wash'
import { reprocess } from '../features/capture/store'
import { useT } from '../i18n'
import { useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { useImage } from '../lib/useImage'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'
import { LiquidGlass } from '../ui/LiquidGlass'
import { StatusBadge } from '../ui/StatusBadge'

const update = (id: string, patch: Partial<Garment>) => db.garments.update(id, { ...patch, updatedAt: Date.now() })

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block border-b border-line-soft py-3">
      <span className="tag text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

// Campo de texto que guarda al salir (sin botón de guardar)
function TextField({ value, placeholder, onSave, list, multiline }: { value?: string; placeholder?: string; onSave: (v: string) => void; list?: string; multiline?: boolean }) {
  const cls = 'w-full bg-transparent text-lg font-bold outline-none placeholder:text-muted/60'
  return multiline
    ? <textarea defaultValue={value} placeholder={placeholder} rows={2} onBlur={(e) => e.target.value !== (value ?? '') && onSave(e.target.value)} className={`${cls} resize-none text-base font-medium`} />
    : <input defaultValue={value} placeholder={placeholder} list={list} enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onBlur={(e) => e.target.value !== (value ?? '') && onSave(e.target.value)} className={cls} />
}

export function GarmentDetail({ id }: { id: string }) {
  const t = useT()
  const go = useNav()
  const { lang } = useSettings()
  const g = useLiveQuery(() => db.garments.get(id), [id], null)
  const { url, status, isCutout } = useImage(g?.imageId, 'cutout')
  const [retrying, setRetrying] = useState(false)

  if (g === null) return null // cargando
  if (!g) return <div className="pt-safe px-4"><p className="display mt-10 text-5xl">{t.garment.notFound}</p></div>

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

  return (
    <div className="pb-tab">
      <div className="relative bg-tile">
        <div className="pt-safe absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2">
          <LiquidGlass borderRadius={24} className="press">
            <button onClick={() => history.length > 1 ? history.back() : go('/')} aria-label={t.common.back}
              className="grid size-12 place-items-center"><Icon name="back" size={24} strokeWidth={2} /></button>
          </LiquidGlass>
          <StatusBadge status={st} />
          <span className="w-12" />
        </div>
        <div className="relative mx-auto aspect-[4/5] max-h-[58vh]">
          {url && <img src={url} alt="" style={{ viewTransitionName: `g-${g.id}` }}
            className={`absolute inset-0 size-full ${isCutout ? 'sticker object-contain p-10 pt-20' : 'object-cover'}`} />}
          {status === 'pending' && <div className="scan absolute inset-0" />}
        </div>
      </div>

      <div className="page-in px-4">
        <div className="flex items-end justify-between gap-3 pt-4">
          <h1 className="display text-5xl">{displayName(g, lang)}</h1>
          <span className="mb-1 size-10 shrink-0 rounded-full ring-2 ring-line-soft" style={{ background: g.color.hex }} />
        </div>

        {(status === 'failed' || status === 'pending') && (
          <div className="mt-4 flex items-center justify-between gap-3 border-2 border-dirty p-3">
            <span className="text-sm font-bold">{status === 'failed' ? t.garment.cutFailed : t.wardrobe.processing}</span>
            <Button variant="ink" icon="refresh" disabled={retrying} className="min-h-11"
              onClick={async () => { setRetrying(true); await reprocess(g.id); setRetrying(false) }}>
              {retrying ? t.garment.retrying : t.garment.retry}
            </Button>
          </div>
        )}

        <div className="mt-2">
          <Field label={t.garment.name}><TextField value={g.name} placeholder={displayName({ ...g, name: '' }, lang)} onSave={(name) => update(g.id, { name: name.trim() })} /></Field>
          <div className="border-b border-line-soft py-3">
            <span className="tag text-muted">{t.garment.category}</span>
            <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
              {CATEGORIES.map((c) => <Chip key={c.id} active={g.category === c.id} onClick={() => setCategory(c.id)}>{t.categories[c.id]}</Chip>)}
            </div>
          </div>
          <Field label={t.garment.subcategory}><TextField value={g.subcategory} placeholder={t.garment.subPlaceholder} onSave={setSub} list="subcats" /></Field>
          <datalist id="subcats"><option value="Vaquero" /><option value="Chino" /><option value="Cargo" /><option value="Polo" /><option value="Zapatillas" /><option value="Gorra" /></datalist>
          {g.palette.length > 1 && (
            <div className="border-b border-line-soft py-3">
              <span className="tag text-muted">{t.garment.color}</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.palette.map((c) => (
                  <Chip key={c.hex} active={c.hex === g.color.hex} swatch={c.hex} onClick={() => update(g.id, { color: c })}>{colorLabel(c.name, lang)}</Chip>
                ))}
              </div>
            </div>
          )}
          <Field label={t.garment.brand}><TextField value={g.brand} placeholder="—" onSave={(brand) => update(g.id, { brand: brand.trim() || undefined })} /></Field>

          <div className="border-b border-line-soft py-3">
            <span className="tag text-muted">{t.garment.wash}</span>
            <div className="mt-2 flex items-center gap-2">
              <button aria-label="−" disabled={g.washAfter === null || g.washAfter <= 1} onClick={() => update(g.id, { washAfter: (g.washAfter ?? 2) - 1 })}
                className="press grid size-12 place-items-center border-2 border-ink disabled:opacity-30"><Icon name="minus" strokeWidth={2.2} /></button>
              <span className="display w-16 text-center text-5xl">{g.washAfter ?? '∞'}</span>
              <button aria-label="+" onClick={() => update(g.id, { washAfter: (g.washAfter ?? 0) + 1 })}
                className="press grid size-12 place-items-center border-2 border-ink"><Icon name="plus" strokeWidth={2.2} /></button>
              <span className="flex-1" />
              <Chip active={g.washAfter === null} onClick={() => update(g.id, { washAfter: g.washAfter === null ? categoryById(g.category).washAfter ?? 3 : null })}>{t.garment.never}</Chip>
            </div>
          </div>

          <Field label={t.garment.notes}><TextField value={g.notes} placeholder="—" multiline onSave={(notes) => update(g.id, { notes: notes.trim() || undefined })} /></Field>
        </div>

        <div className="mt-6 grid grid-cols-3 border-2 border-ink">
          {[
            [t.garment.wearsTotal, String(g.wearsTotal)],
            [t.garment.lastWorn, g.lastWornAt ? fmtDate(g.lastWornAt) : t.garment.neverWorn],
            [t.garment.added, fmtDate(g.createdAt)],
          ].map(([k, v], i) => (
            <div key={k} className={`p-3 ${i ? 'border-l-2 border-ink' : ''}`}>
              <span className="tag block text-muted">{k}</span>
              <span className="mt-1 block text-sm font-extrabold uppercase">{v}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button icon="archive" onClick={async () => { await update(g.id, { archived: !g.archived }); if (!g.archived) go('/', { replace: true }) }}>
            {g.archived ? t.garment.unarchive : t.garment.archive}
          </Button>
          <Button variant="danger" icon="trash" onClick={remove}>{t.garment.delete}</Button>
        </div>
      </div>
    </div>
  )
}
