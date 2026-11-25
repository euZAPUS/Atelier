import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db/db'
import type { DayPlan, Garment, Outfit, WearLog } from '../db/types'
import { displayName } from '../domain/naming'
import { garmentStatus, today } from '../domain/wash'
import { addDays, parseDate, weekDays } from '../domain/week'
import { Collage } from '../features/outfits/Collage'
import { fmt, useT } from '../i18n'
import { planDay, wearOutfit } from '../lib/actions'
import { useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { buttonBase, buttonStyles } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { toast } from '../ui/Toast'
import { createOutfit, useGarmentMap } from './Outfits'

const locale = (lang: string) => (lang === 'es' ? 'es-ES' : 'en-GB')
const fmtDate = (d: string, lang: string, o: Intl.DateTimeFormatOptions) => parseDate(d).toLocaleDateString(locale(lang), o)

/** Prendas del outfit que están sucias ahora mismo (hay que lavarlas antes de ese día). */
const dirtyIn = (o: Outfit | undefined, garments: Map<string, Garment>) =>
  (o?.items ?? []).map((i) => garments.get(i.garmentId)).filter((g): g is Garment => !!g && garmentStatus(g) === 'dirty')

export function Week() {
  const t = useT()
  const go = useNav()
  const { lang } = useSettings()
  const [offset, setOffset] = useState(0)
  const [sheet, setSheet] = useState<string | null>(null)
  const now = today()
  const days = weekDays(now, offset)
  const plans = useLiveQuery(() => db.plans.where('date').between(days[0], days[6], true, true).toArray(), [days[0]])
  const logs = useLiveQuery(() => db.wearLog.where('date').between(days[0], days[6], true, true).toArray(), [days[0]])
  const outfitList = useLiveQuery(() => db.outfits.orderBy('updatedAt').reverse().toArray(), [])
  const todayPlan = useLiveQuery(() => db.plans.get(now), [now])
  const garments = useGarmentMap()
  if (!plans || !logs || !outfitList || !garments) return null

  const outfits = new Map(outfitList.map((o) => [o.id, o]))
  const planOf = new Map(plans.map((p) => [p.date, p]))
  const logsOf = (d: string) => logs.filter((l) => l.date === d)
  const dayName = (d: string) => (d === now ? t.week.today : d === addDays(now, 1) ? t.week.tomorrow : fmtDate(d, lang, { weekday: 'long', day: 'numeric' }))
  const range = `${fmtDate(days[0], lang, { day: 'numeric', month: days[0].slice(5, 7) === days[6].slice(5, 7) ? undefined : 'short' })} – ${fmtDate(days[6], lang, { day: 'numeric', month: 'short' })}`

  const wear = async (outfit: Outfit) => {
    const ids = outfit.items.map((i) => i.garmentId).filter((id) => garments.has(id))
    const undo = await wearOutfit(outfit.id, ids)
    toast(fmt(t.outfits.woreToast, { n: ids.length }), { label: t.common.undo, run: () => { undo() } })
  }

  return (
    <div className="pb-tab">
      <header className="pt-safe px-4 pb-3">
        <div className="flex items-end justify-between gap-2">
          <h1 className="title">{t.week.title}</h1>
          <div className="mb-1 flex items-center gap-0.5">
            <button onClick={() => setOffset(offset - 1)} aria-label={t.week.prev} className="press grid size-9 place-items-center rounded-full text-muted"><Icon name="back" size={20} strokeWidth={1.9} /></button>
            <button onClick={() => setOffset(0)} className={`press h-8 rounded-full px-2.5 text-[0.875rem] font-semibold tabular-nums ${offset ? 'bg-surface-2' : ''}`}>{offset ? range : t.week.thisWeek}</button>
            <button onClick={() => setOffset(offset + 1)} aria-label={t.week.next} className="press grid size-9 place-items-center rounded-full text-muted"><Icon name="chevron" size={20} strokeWidth={1.9} /></button>
          </div>
        </div>
      </header>

      {offset === 0 && <Today plan={todayPlan ?? undefined} outfits={outfits} garments={garments} onPick={() => setSheet(now)} onWear={wear} />}

      <section key={offset} className="page-in px-4 pt-5">
        {offset === 0 && <h2 className="section-label mb-2 px-1">{range}</h2>}
        <div className="group">
          {days.map((d) => (
            <DayRow key={d} date={d} isToday={d === now} past={d < now} label={dayName(d)} plan={planOf.get(d)} logs={logsOf(d)}
              outfits={outfits} garments={garments} onClick={() => setSheet(d)} />
          ))}
        </div>
      </section>

      {sheet && (
        <DaySheet date={sheet} title={dayName(sheet)} plan={planOf.get(sheet) ?? (sheet === now ? todayPlan ?? undefined : undefined)} outfits={outfitList} garments={garments}
          onClose={() => setSheet(null)}
          onCreate={() => { setSheet(null); createOutfit(go, t.outfits.untitled) }}
          onPick={async (id) => {
            const undo = await planDay(sheet, id)
            setSheet(null)
            toast(id ? fmt(t.week.plannedToast, { day: dayName(sheet).charAt(0).toUpperCase() + dayName(sheet).slice(1) }) : t.week.clearedToast, { label: t.common.undo, run: () => { undo() } })
          }} />
      )}
    </div>
  )
}

function Today({ plan, outfits, garments, onPick, onWear }: { plan?: DayPlan; outfits: Map<string, Outfit>; garments: Map<string, Garment>; onPick: () => void; onWear: (o: Outfit) => void }) {
  const t = useT()
  const { lang } = useSettings()
  const o = plan ? outfits.get(plan.outfitId) : undefined
  if (!o) {
    return (
      <section className="page-in px-4">
        <button onClick={onPick} className="card press flex w-full items-center gap-3 p-4 text-left">
          <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-surface-2"><Icon name="outfit" size={24} strokeWidth={1.6} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[1.0625rem] font-semibold">{t.week.todayQ}</span>
            <span className="block text-[0.875rem] text-muted">{t.week.pick}</span>
          </span>
          <Icon name="chevron" size={20} className="text-muted" />
        </button>
      </section>
    )
  }
  const dirty = dirtyIn(o, garments)
  const pieces = o.items.filter((i) => garments.has(i.garmentId)).length
  return (
    <section className="page-in px-4">
      <div className="card flex overflow-hidden">
        <button onClick={onPick} className="relative aspect-[3/4] w-[44%] shrink-0 bg-tile" aria-label={t.week.change}>
          <Collage items={o.items} garments={garments} kind="cutout" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <span className="text-[0.75rem] font-semibold tracking-wide text-muted uppercase">{t.week.today}</span>
          <p className="mt-1 text-[1.375rem] leading-tight font-bold tracking-tight break-words">{o.name}</p>
          <p className={`mt-1 text-[0.8125rem] ${dirty.length && !plan!.worn ? 'text-dirty' : 'text-muted'}`}>
            {dirty.length && !plan!.worn ? fmt(t.week.washFirst, { list: dirty.map((g) => displayName(g, lang)).join(', ') }) : pieces === 1 ? t.outfits.piecesOne : fmt(t.outfits.pieces, { n: pieces })}
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-4">
            {plan!.worn ? (
              <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-clean/15 px-3.5 text-[0.9375rem] font-semibold text-clean"><Icon name="check" size={17} strokeWidth={2.4} />{t.week.worn}</span>
            ) : (
              <button onClick={() => onWear(o)} className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-[0.9375rem] font-semibold text-accent-ink"><Icon name="check" size={17} strokeWidth={2.4} />{t.week.wear}</button>
            )}
            <button onClick={onPick} className="press h-9 rounded-full text-[0.875rem] font-medium text-muted">{t.week.change}</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function DayRow({ date, isToday, past, plan, logs, outfits, garments, onClick }: {
  date: string; label?: string; isToday: boolean; past: boolean; plan?: DayPlan; logs: WearLog[]
  outfits: Map<string, Outfit>; garments: Map<string, Garment>; onClick: () => void
}) {
  const t = useT()
  const { lang } = useSettings()
  const o = plan ? outfits.get(plan.outfitId) : undefined
  const loose = logs.filter((l) => !l.outfitId).flatMap((l) => l.garmentIds).filter((id, i, a) => a.indexOf(id) === i)
  const dirty = !past && !plan?.worn ? dirtyIn(o, garments) : []
  const status = plan?.worn ? t.week.worn
    : o && dirty.length ? fmt(t.week.washFirst, { list: dirty.map((g) => displayName(g, lang)).join(', ') })
    : o ? (past ? t.week.notLogged : t.week.planned)
    : loose.length ? t.week.worn
    : past ? '' : t.week.pick
  const d = parseDate(date)
  return (
    <button onClick={onClick} className={`press flex w-full items-center gap-3 px-3 py-2.5 text-left ${past && !plan?.worn && !loose.length ? 'opacity-60' : ''}`}>
      <span className={`flex w-11 shrink-0 flex-col items-center rounded-[12px] py-1 ${isToday ? 'bg-accent text-accent-ink' : ''}`}>
        <span className="text-[0.6875rem] font-semibold uppercase opacity-70">{d.toLocaleDateString(locale(lang), { weekday: 'short' }).replace('.', '')}</span>
        <span className="text-[1.25rem] leading-tight font-bold tabular-nums">{d.getDate()}</span>
      </span>
      <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[10px] bg-tile">
        {o ? <Collage items={o.items} garments={garments} /> : <span className="grid size-full place-items-center text-muted"><Icon name="plus" size={18} strokeWidth={1.8} /></span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[0.9375rem] font-medium ${o ? '' : 'text-muted'}`}>{o ? o.name : loose.length ? (loose.length === 1 ? t.week.looseOne : fmt(t.week.loose, { n: loose.length })) : t.week.noPlan}</span>
        <span className={`flex items-center gap-1 truncate text-[0.8125rem] ${plan?.worn ? 'text-clean' : dirty.length ? 'text-dirty' : 'text-muted'}`}>
          {plan?.worn && <Icon name="check" size={13} strokeWidth={2.4} />}{status}
        </span>
      </span>
      <Icon name="chevron" size={18} className="shrink-0 text-muted" />
    </button>
  )
}

function DaySheet({ date, title, plan, outfits, garments, onClose, onPick, onCreate }: {
  date: string; title: string; plan?: DayPlan; outfits: Outfit[]; garments: Map<string, Garment>
  onClose: () => void; onPick: (id: string | null) => void; onCreate: () => void
}) {
  const t = useT()
  const list = outfits.filter((o) => o.items.length)
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" data-date={date}>
      <button aria-label={t.common.close} onClick={onClose} className="fade-in absolute inset-0 bg-black/50" />
      <div className="sheet-in relative flex max-h-[80dvh] flex-col rounded-t-[28px] border-t border-line bg-surface">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line-strong" />
        <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-3">
          <div className="min-w-0">
            <h2 className="truncate text-[1.25rem] font-semibold tracking-tight first-letter:uppercase">{title}</h2>
            <p className="text-[0.8125rem] text-muted">{t.week.choose}</p>
          </div>
          {plan && !plan.worn && <button onClick={() => onPick(null)} className="press h-9 shrink-0 rounded-full bg-surface-2 px-3.5 text-[0.875rem] font-semibold text-dirty">{t.week.clear}</button>}
        </div>
        {list.length ? (
          <div className="grid grid-cols-2 gap-3 overflow-y-auto overscroll-contain px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
            {list.map((o) => {
              const on = plan?.outfitId === o.id
              const dirty = dirtyIn(o, garments).length
              return (
                <button key={o.id} onClick={() => onPick(o.id)} aria-pressed={on} className="press self-start text-left">
                  <div className={`relative aspect-[3/4] overflow-hidden rounded-[16px] bg-tile ${on ? 'ring-2 ring-ink' : ''}`}>
                    <Collage items={o.items} garments={garments} />
                    {on && <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-ink text-bg"><Icon name="check" size={14} strokeWidth={2.6} /></span>}
                  </div>
                  <p className="mt-1.5 truncate text-[0.875rem] font-medium">{o.name}</p>
                  {dirty > 0 && <p className="text-[0.75rem] text-dirty">{fmt(dirty === 1 ? t.outfits.hasDirty : t.outfits.hasDirtyMany, { n: dirty })}</p>}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="px-4 pt-4 text-center" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
            <p className="text-[0.9375rem] text-muted">{t.week.noOutfits}</p>
            <button onClick={onCreate} className={`${buttonBase} ${buttonStyles.primary} mt-4 w-full`}><Icon name="plus" size={20} strokeWidth={2} />{t.week.create}</button>
          </div>
        )}
      </div>
    </div>
  )
}
