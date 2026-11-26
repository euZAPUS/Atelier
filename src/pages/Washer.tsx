import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db/db'
import type { Garment } from '../db/types'
import { displayName } from '../domain/naming'
import { garmentStatus } from '../domain/wash'
import { fmt, useT } from '../i18n'
import { washGarments } from '../lib/actions'
import { useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { useImage } from '../lib/useImage'
import { buttonBase, buttonStyles } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { HeaderPill, NavButton, PageHeader } from '../ui/PageHeader'
import { StatusBadge } from '../ui/StatusBadge'
import { toast } from '../ui/Toast'

function Row({ g, on, toggle, index }: { g: Garment; on: boolean; toggle: () => void; index: number }) {
  const { lang } = useSettings()
  const t = useT()
  const { url, isCutout } = useImage(g.imageId)
  return (
    <button onClick={toggle} aria-pressed={on} style={{ ['--i' as string]: index }} className="rise press flex w-full items-center gap-3 px-3 py-2.5 text-left">
      <span className="relative size-14 shrink-0 overflow-hidden rounded-[12px] bg-tile">
        {url && <img src={url} alt="" className={`absolute inset-0 size-full ${isCutout ? 'object-contain p-1.5' : 'object-cover'}`} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium">{displayName(g, lang)}</span>
        <span className="mt-0.5 flex items-center gap-2"><StatusBadge status={garmentStatus(g)} />
          {g.washAfter !== null && <span className="text-[0.8125rem] text-muted">{fmt(g.wearsSinceWash >= g.washAfter ? t.washer.usesDue : t.washer.uses, { n: g.wearsSinceWash, max: g.washAfter })}</span>}
        </span>
      </span>
      <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${on ? 'border-transparent bg-accent text-accent-ink' : 'border-line-strong'}`}>
        {on && <Icon name="check" size={16} strokeWidth={2.6} />}
      </span>
    </button>
  )
}

// Poner lavadora: las sucias vienen marcadas; las usadas se pueden añadir.
export function Washer() {
  const t = useT()
  const go = useNav()
  const all = useLiveQuery(() => db.garments.filter((g) => !g.archived).toArray(), [])
  const dirty = useMemo(() => (all ?? []).filter((g) => garmentStatus(g) === 'dirty'), [all])
  const worn = useMemo(() => (all ?? []).filter((g) => garmentStatus(g) === 'worn').sort((a, b) => b.wearsSinceWash - a.wearsSinceWash), [all])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)
  // Al abrir: todas las sucias marcadas
  useEffect(() => { if (all && !ready) { setSel(new Set(dirty.map((g) => g.id))); setReady(true) } }, [all, dirty, ready])
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const back = () => (history.length > 1 ? history.back() : go('/'))
  const wash = async () => {
    const ids = [...sel]
    const undo = await washGarments(ids)
    toast(fmt(ids.length === 1 ? t.washer.doneOne : t.washer.done, { n: ids.length }), { label: t.common.undo, run: undo })
    back()
  }
  const List = ({ label, list, offset }: { label: string; list: Garment[]; offset: number }) => list.length ? (
    <section>
      <h2 className="section-label mb-2 px-1">{label}</h2>
      <div className="group">{list.map((g, i) => <Row key={g.id} g={g} index={offset + i} on={sel.has(g.id)} toggle={() => toggle(g.id)} />)}</div>
    </section>
  ) : null

  return (
    <div className="flex min-h-dvh flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <PageHeader left={<NavButton icon="back" label={t.common.back} onClick={back} />} center={<HeaderPill icon="washer">{t.washer.pill}</HeaderPill>}
        title={t.washer.title} subtitle={all ? fmt(t.washer.subtitle, { dirty: dirty.length === 1 ? t.washer.dirtyOne : fmt(t.washer.dirtyN, { n: dirty.length }), worn: worn.length === 1 ? t.washer.wornOne : fmt(t.washer.wornN, { n: worn.length }) }) : undefined} />
      {all && !dirty.length && !worn.length ? (
        <div className="page-in px-4">
          <div className="card flex flex-col items-center px-6 py-10 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-surface-2"><Icon name="washer" size={30} strokeWidth={1.5} /></div>
            <p className="mt-4 text-lg font-semibold">{t.washer.empty}</p>
            <p className="mt-1 text-[0.9375rem] text-muted">{t.washer.emptyBody}</p>
          </div>
        </div>
      ) : (
        <div className="page-in flex-1 space-y-6 px-4 pb-28">
          <List label={t.statusPlural.dirty} list={dirty} offset={0} />
          <List label={t.washer.alsoWorn} list={worn} offset={dirty.length} />
        </div>
      )}
      {(dirty.length > 0 || worn.length > 0) && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <button disabled={!sel.size} onClick={wash} className={`${buttonBase} ${buttonStyles.primary} mx-auto w-full max-w-md`}>
            <Icon name="washer" size={20} strokeWidth={1.8} />{fmt(t.washer.cta, { n: sel.size })}
          </button>
        </div>
      )}
    </div>
  )
}
