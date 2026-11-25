import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, newId } from '../db/db'
import type { Garment, Outfit } from '../db/types'
import { colorLabel } from '../domain/naming'
import { outfitHarmony } from '../domain/outfit'
import { garmentStatus } from '../domain/wash'
import { CaptureInput } from '../features/capture/CaptureInput'
import { Collage } from '../features/outfits/Collage'
import { fmt, useT } from '../i18n'
import { TLink, useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { buttonBase, buttonStyles } from '../ui/Button'
import { Icon } from '../ui/Icon'

/** Todas las prendas (también archivadas: un outfit antiguo puede tenerlas) por id. */
export function useGarmentMap() {
  const list = useLiveQuery(() => db.garments.toArray(), [])
  return useMemo(() => (list ? new Map(list.map((g) => [g.id, g])) : undefined), [list])
}

/** Crea un outfit vacío y abre el editor. */
export async function createOutfit(go: ReturnType<typeof useNav>, untitled: string) {
  const id = newId()
  const n = (await db.outfits.count()) + 1
  await db.outfits.add({ id, name: fmt(untitled, { n }), items: [], tags: [], createdAt: Date.now(), updatedAt: Date.now() })
  go(`/outfits/${id}`)
}

function OutfitCard({ o, garments, index }: { o: Outfit; garments: Map<string, Garment>; index: number }) {
  const t = useT()
  const { lang } = useSettings()
  const pieces = o.items.map((i) => garments.get(i.garmentId)).filter((g): g is Garment => !!g)
  const h = outfitHarmony(pieces.map((g) => g.color.name))
  const dirty = pieces.filter((g) => garmentStatus(g) === 'dirty').length
  const line = dirty ? fmt(dirty === 1 ? t.outfits.hasDirty : t.outfits.hasDirtyMany, { n: dirty })
    : h.verdict === 'clash' ? fmt(t.outfits.verdict.clash, { a: colorLabel(h.clashes[0][0], lang), b: colorLabel(h.clashes[0][1], lang) })
    : pieces.length === 1 ? t.outfits.piecesOne : fmt(t.outfits.pieces, { n: pieces.length })
  return (
    <TLink href={`/outfits/${o.id}`} className="rise press block" style={{ ['--i' as string]: index }}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-tile">
        <Collage items={o.items} garments={garments} />
      </div>
      <p className="mt-2 truncate px-0.5 text-[0.9375rem] font-medium">{o.name}</p>
      <p className="flex items-center gap-1.5 px-0.5 text-[0.8125rem] text-muted">
        <span className={`size-1.5 shrink-0 rounded-full ${dirty || h.verdict === 'clash' ? 'bg-dirty' : 'bg-clean'}`} />
        <span className="truncate first-letter:uppercase">{line}</span>
      </p>
    </TLink>
  )
}

export function Outfits() {
  const t = useT()
  const go = useNav()
  const outfits = useLiveQuery(() => db.outfits.orderBy('updatedAt').reverse().toArray(), [])
  const garments = useGarmentMap()
  const shown = outfits?.filter((o) => o.items.length > 0)
  const hasClothes = garments && [...garments.values()].some((g) => !g.archived)
  const create = () => createOutfit(go, t.outfits.untitled)

  return (
    <div className="pb-tab">
      <header className="pt-safe px-4 pb-3">
        <div className="flex items-end justify-between">
          <h1 className="title">{t.outfits.title}</h1>
          {!!shown?.length && (
            <button onClick={create} className="press mb-1 inline-flex h-9 items-center gap-1 rounded-full bg-accent px-3.5 text-[0.875rem] font-semibold text-accent-ink">
              <Icon name="plus" size={17} strokeWidth={2.2} />{t.outfits.new}
            </button>
          )}
        </div>
      </header>
      {shown && garments && (shown.length === 0 ? (
        <section className="page-in px-4 pt-2">
          <div className="card flex flex-col items-center px-6 pt-10 pb-6 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-surface-2"><Icon name="outfit" size={30} strokeWidth={1.5} /></div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">{t.outfits.emptyTitle}</h2>
            <p className="mt-2 max-w-xs text-[0.9375rem] leading-relaxed text-muted">{hasClothes ? t.outfits.emptyBody : t.outfits.emptyNoClothes}</p>
            {hasClothes ? (
              <button onClick={create} className={`${buttonBase} ${buttonStyles.primary} mt-7 w-full`}><Icon name="plus" size={20} strokeWidth={2} />{t.outfits.new}</button>
            ) : (
              <CaptureInput className={`${buttonBase} ${buttonStyles.primary} mt-7 w-full`}><Icon name="camera" size={20} strokeWidth={1.8} />{t.wardrobe.emptyCta}</CaptureInput>
            )}
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 pt-1">
          {shown.map((o, i) => <OutfitCard key={o.id} o={o} garments={garments} index={i} />)}
        </div>
      ))}
    </div>
  )
}
