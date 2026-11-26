import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db/db'
import type { CollageItem, Garment } from '../db/types'
import { CATEGORIES, type CategoryId } from '../domain/categories'
import { colorLabel, displayName } from '../domain/naming'
import { clamp, clashWith, outfitHarmony, placeItem } from '../domain/outfit'
import { garmentStatus } from '../domain/wash'
import { Collage } from '../features/outfits/Collage'
import { fmt, useT } from '../i18n'
import { deleteOutfit, wearOutfit } from '../lib/actions'
import { useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { useImage } from '../lib/useImage'
import { buttonBase, buttonStyles } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'
import { NavButton, PageHeader } from '../ui/PageHeader'
import { toast } from '../ui/Toast'
import { useGarmentMap } from './Outfits'

type Pt = { x: number; y: number }
type Start = { pts: Pt[]; item: CollageItem }

/*
 * Editor de outfits: lienzo 3:4 donde las prendas se colocan solas por categoría (gorra arriba,
 * zapatillas abajo) y luego se ajustan a mano: un dedo mueve, dos dedos escalan y giran.
 * Se guarda solo, sin botón de guardar.
 */
export function OutfitEditor({ id }: { id: string }) {
  const t = useT()
  const go = useNav()
  const { lang } = useSettings()
  const outfit = useLiveQuery(() => db.outfits.get(id).then((o) => o ?? null), [id])
  const garments = useGarmentMap()
  const [items, setItems] = useState<CollageItem[] | null>(null)
  const [name, setName] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const canvas = useRef<HTMLDivElement>(null)

  // Carga inicial (después, el estado local manda y se guarda solo)
  useEffect(() => {
    if (outfit && items === null) { setItems(outfit.items); setName(outfit.name) }
  }, [outfit]) // eslint-disable-line react-hooks/exhaustive-deps

  const latest = useRef({ items, name })
  latest.current = { items, name }
  useEffect(() => {
    if (items === null) return
    const h = setTimeout(() => db.outfits.update(id, { items, name: name.trim() || outfit?.name || '', updatedAt: Date.now() }), 250)
    return () => clearTimeout(h)
  }, [items, name]) // eslint-disable-line react-hooks/exhaustive-deps
  // Al salir: guarda lo último y, si se quedó vacío, no deja un outfit fantasma
  useEffect(() => () => {
    const { items: it, name: n } = latest.current
    if (it === null) return
    if (it.length === 0) db.outfits.delete(id)
    else db.outfits.update(id, { items: it, ...(n.trim() ? { name: n.trim() } : {}), updatedAt: Date.now() })
  }, [id])

  const pieces = useMemo(() => (items ?? []).map((i) => garments?.get(i.garmentId)).filter((g): g is Garment => !!g), [items, garments])
  const harmony = outfitHarmony(pieces.map((g) => g.color.name))
  const dirty = pieces.filter((g) => garmentStatus(g) === 'dirty').length

  const update = (gid: string, patch: Partial<CollageItem>) => setItems((list) => list!.map((i) => (i.garmentId === gid ? { ...i, ...patch } : i)))
  const toFront = (gid: string) => setItems((list) => {
    const top = Math.max(...list!.map((i) => i.z))
    return list!.map((i) => (i.garmentId === gid && i.z !== top ? { ...i, z: top + 1 } : i))
  })
  const toBack = (gid: string) => setItems((list) => {
    const low = Math.min(...list!.map((i) => i.z))
    return list!.map((i) => (i.garmentId === gid ? { ...i, z: low - 1 } : i))
  })
  const toggle = (g: Garment) => setItems((list) => {
    if (list!.some((i) => i.garmentId === g.id)) { if (sel === g.id) setSel(null); return list!.filter((i) => i.garmentId !== g.id) }
    return [...list!, placeItem(g.category, g.id, list!, (gid) => garments?.get(gid)?.category as CategoryId | undefined)]
  })

  // ── Gestos: punteros sobre el lienzo (captura para que el segundo dedo valga en cualquier parte)
  const ptrs = useRef(new Map<number, Pt>())
  const start = useRef<Start | null>(null)
  const restart = (gid: string | null) => {
    const it = gid ? latest.current.items?.find((i) => i.garmentId === gid) : undefined
    start.current = it ? { pts: [...ptrs.current.values()].map((p) => ({ ...p })), item: { ...it } } : null
  }
  const onDown = (e: React.PointerEvent) => {
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-gid]')?.dataset.gid
    // Toque en vacío con un solo dedo: deseleccionar (sin capturar, para que los botones sigan funcionando)
    if (!hit && ptrs.current.size === 0) { setSel(null); return }
    canvas.current!.setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    let target = sel
    if (ptrs.current.size === 1) {
      target = hit ?? null
      setSel(target)
      if (target) toFront(target)
    }
    restart(target)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const s = start.current
    if (!s) return
    const r = canvas.current!.getBoundingClientRect()
    const now = [...ptrs.current.values()]
    if (now.length === 1 || s.pts.length === 1) {
      const [p0, p] = [s.pts[0], now[0]]
      update(s.item.garmentId, { x: clamp(s.item.x + (p.x - p0.x) / r.width, -0.05, 1.05), y: clamp(s.item.y + (p.y - p0.y) / r.height, -0.05, 1.05) })
    } else {
      const [a0, b0] = s.pts, [a, b] = now
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y), d = Math.hypot(b.x - a.x, b.y - a.y)
      const ang0 = Math.atan2(b0.y - a0.y, b0.x - a0.x), ang = Math.atan2(b.y - a.y, b.x - a.x)
      const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      update(s.item.garmentId, {
        scale: clamp(s.item.scale * (d / Math.max(1, d0)), 0.25, 3),
        rotation: s.item.rotation + ((ang - ang0) * 180) / Math.PI,
        x: clamp(s.item.x + (m.x - m0.x) / r.width, -0.05, 1.05),
        y: clamp(s.item.y + (m.y - m0.y) / r.height, -0.05, 1.05),
      })
    }
  }
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId)
    restart(start.current?.item.garmentId ?? null) // al levantar un dedo, el otro sigue moviendo sin saltos
  }
  // En el PC: rueda = escalar, Mayús + rueda = girar
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const gid = sel
      const it = gid && latest.current.items?.find((i) => i.garmentId === gid)
      if (!it) return
      e.preventDefault()
      if (e.shiftKey) update(it.garmentId, { rotation: it.rotation + e.deltaY * 0.15 })
      else update(it.garmentId, { scale: clamp(it.scale * Math.exp(-e.deltaY * 0.002), 0.25, 3) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [sel, items === null]) // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => go('/outfits')
  const remove = async () => {
    const undo = await deleteOutfit(id)
    latest.current.items = null // que el desmontaje no lo vuelva a guardar
    setItems(null)
    go('/outfits', { replace: true })
    toast(t.outfits.deleted, { label: t.common.undo, run: () => { undo() } })
  }
  const wear = async () => {
    const undo = await wearOutfit(id, pieces.map((g) => g.id))
    toast(fmt(t.outfits.woreToast, { n: pieces.length }), { label: t.common.undo, run: () => { undo() } })
  }

  if (outfit === null) return <div className="pt-safe px-4 pt-20 text-center text-muted">—</div>
  if (!items || !garments) return null

  const verdictText = harmony.verdict === 'clash'
    ? fmt(t.outfits.verdict.clash, { a: colorLabel(harmony.clashes[0][0], lang), b: colorLabel(harmony.clashes[0][1], lang) })
    : t.outfits.verdict[harmony.verdict]
  const verdictIcon: IconName = harmony.verdict === 'good' || harmony.verdict === 'ok' ? 'check' : 'alert'
  const verdictTone = harmony.verdict === 'clash' ? 'bg-dirty/15 text-dirty' : harmony.verdict === 'busy' ? 'bg-worn/15 text-worn' : 'bg-clean/15 text-clean'
  const selItem = sel && items.find((i) => i.garmentId === sel)

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        left={<NavButton icon="back" label={t.common.back} onClick={back} />}
        right={<NavButton icon="trash" label={t.outfits.delete} onClick={remove} />}
      />
      <div className="-mt-2 px-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={outfit?.name} aria-label={t.outfits.name}
          enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-full bg-transparent text-[1.75rem] leading-tight font-bold tracking-tight outline-none placeholder:text-muted" />
        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5">
          {verdictText && (
            <span key={verdictText} className={`fade-in inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.8125rem] font-semibold ${verdictTone}`}>
              <Icon name={verdictIcon} size={14} strokeWidth={2.2} /><span className="first-letter:uppercase">{verdictText}</span>
            </span>
          )}
          {dirty > 0 && (
            <span className="inline-flex h-7 items-center gap-1 rounded-full bg-dirty/15 px-2.5 text-[0.8125rem] font-semibold text-dirty">
              <Icon name="washer" size={14} strokeWidth={2} />{fmt(dirty === 1 ? t.outfits.hasDirty : t.outfits.hasDirtyMany, { n: dirty })}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-3">
        <div ref={canvas} data-no-edge-swipe onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          className="relative mx-auto aspect-[3/4] max-w-full touch-none overflow-hidden rounded-[22px] border border-line bg-tile select-none"
          // Alto que cabe en pantalla junto a la cabecera y los botones; el ancho sale de la proporción 3:4
          style={{ height: 'min(calc(100dvh - 300px - env(safe-area-inset-top) - env(safe-area-inset-bottom)), calc((100vw - 32px) * 4 / 3))' }}>
          <Collage items={items} garments={garments} kind="cutout" selected={sel} />
          {items.length === 0 && (
            <button onClick={() => setPicker(true)} className="press absolute inset-0 grid place-items-center text-[0.9375rem] text-muted">
              <span className="flex flex-col items-center gap-2"><Icon name="plus" size={28} strokeWidth={1.6} />{t.outfits.canvasEmpty}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-12 items-center justify-center gap-1.5 px-4 pt-3">
        {selItem ? (
          <div key="tools" className="fade-in flex gap-1.5">
            <Tool icon="front" label={t.outfits.front} onClick={() => toFront(selItem.garmentId)} />
            <Tool icon="behind" label={t.outfits.back} onClick={() => toBack(selItem.garmentId)} />
            <Tool icon="close" label={t.outfits.remove} onClick={() => { setItems(items.filter((i) => i.garmentId !== selItem.garmentId)); setSel(null) }} />
          </div>
        ) : items.length > 0 && <p key="hint" className="fade-in text-center text-[0.8125rem] text-muted">{t.outfits.hint}</p>}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 px-4 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <button onClick={() => setPicker(true)} className={`${buttonBase} ${buttonStyles.secondary}`}><Icon name="plus" size={20} strokeWidth={2} />{t.outfits.addShort}</button>
        <button onClick={wear} disabled={!pieces.length} className={`${buttonBase} ${buttonStyles.primary}`}><Icon name="check" size={20} strokeWidth={2.2} />{t.outfits.wear}</button>
      </div>

      {picker && <Picker inOutfit={new Set(items.map((i) => i.garmentId))} colors={pieces.map((g) => g.color.name)} garments={garments} onToggle={toggle} onClose={() => setPicker(false)} />}
    </div>
  )
}

function Tool({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[0.875rem] font-medium">
      <Icon name={icon} size={16} strokeWidth={1.8} />{label}
    </button>
  )
}

// ── Hoja para elegir prendas: tocar añade o quita. Avisa si un color chocaría con lo que ya llevas.
function Picker({ inOutfit, colors, garments, onToggle, onClose }: { inOutfit: Set<string>; colors: string[]; garments: Map<string, Garment>; onToggle: (g: Garment) => void; onClose: () => void }) {
  const t = useT()
  const [cat, setCat] = useState<CategoryId | null>(null)
  const list = [...garments.values()].filter((g) => !g.archived).sort((a, b) => b.createdAt - a.createdAt)
  const present = new Set(list.map((g) => g.category))
  const shown = list.filter((g) => !cat || g.category === cat)
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button aria-label={t.common.close} onClick={onClose} className="fade-in absolute inset-0 bg-black/50" />
      <div className="sheet-in relative flex max-h-[78dvh] flex-col rounded-t-[28px] border-t border-line bg-surface">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line-strong" />
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <h2 className="text-[1.25rem] font-semibold tracking-tight">{t.outfits.add}</h2>
          <button onClick={onClose} className="press h-9 rounded-full bg-accent px-4 text-[0.9375rem] font-semibold text-accent-ink">{t.outfits.done}</button>
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-4 py-2">
          <SheetPill active={!cat} onClick={() => setCat(null)}>{t.wardrobe.all}</SheetPill>
          {CATEGORIES.filter((c) => present.has(c.id)).map((c) => <SheetPill key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>{t.categories[c.id]}</SheetPill>)}
        </div>
        <div className="grid grid-cols-3 gap-2 overflow-y-auto overscroll-contain px-4 pt-1" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          {shown.map((g) => <PickItem key={g.id} g={g} on={inOutfit.has(g.id)} clash={inOutfit.has(g.id) ? undefined : clashWith(g.color.name, colors)} onClick={() => onToggle(g)} />)}
        </div>
      </div>
    </div>
  )
}

function SheetPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`press inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[0.875rem] font-medium ${active ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>{children}</button>
  )
}

function PickItem({ g, on, clash, onClick }: { g: Garment; on: boolean; clash?: string; onClick: () => void }) {
  const t = useT()
  const { lang } = useSettings()
  const { url, isCutout } = useImage(g.imageId)
  const dirty = garmentStatus(g) === 'dirty'
  return (
    <button onClick={onClick} aria-pressed={on} className="press self-start text-left">
      <div className={`relative aspect-square overflow-hidden rounded-[14px] bg-tile transition-shadow ${on ? 'ring-2 ring-ink' : ''}`}>
        {url && <img src={url} alt="" draggable={false} className={`absolute inset-0 size-full ${isCutout ? 'object-contain p-[12%]' : 'object-cover'} ${clash || dirty ? 'opacity-55' : ''}`} />}
        {on && <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ink text-bg"><Icon name="check" size={14} strokeWidth={2.6} /></span>}
        {!on && clash && <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-dirty text-white"><Icon name="alert" size={13} strokeWidth={2.2} /></span>}
      </div>
      <p className="mt-1 truncate text-[0.75rem] font-medium">{displayName(g, lang)}</p>
      {(clash || dirty) && (
        <p className="truncate text-[0.6875rem] text-dirty">{clash ? fmt(t.outfits.clashHint, { c: colorLabel(clash, lang) }) : t.status.dirty}</p>
      )}
    </button>
  )
}
