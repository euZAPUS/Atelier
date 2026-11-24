import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Garment } from '../../db/types'
import { combine } from '../../domain/harmony'
import { displayName } from '../../domain/naming'
import { garmentStatus } from '../../domain/wash'
import { TLink } from '../../lib/nav'
import { useSettings } from '../../lib/settings'
import { useImage } from '../../lib/useImage'

function Mini({ g }: { g: Garment }) {
  const { lang } = useSettings()
  const { url, isCutout } = useImage(g.imageId)
  return (
    <TLink href={`/prenda/${g.id}`} className="press w-[6.5rem] shrink-0">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-tile">
        {url && <img src={url} alt="" className={`absolute inset-0 size-full ${isCutout ? 'product-shadow object-contain p-[14%]' : 'object-cover'}`} />}
      </div>
      <p className="mt-1.5 truncate text-[0.75rem] text-muted">{displayName(g, lang)}</p>
    </TLink>
  )
}

/**
 * Prendas reales de tu armario que combinan (o chocan) con esta por color.
 * Solo de otras categorías (no tiene sentido combinar dos pantalones) y las limpias primero.
 */
export function MatchRow({ g, label, clash }: { g: Garment; label: string; clash?: boolean }) {
  const list = useLiveQuery(async () => {
    if (g.color.name === 'pending') return []
    const all = await db.garments.filter((x) => !x.archived && x.id !== g.id && x.category !== g.category && x.color.name !== 'pending').toArray()
    return all
      .filter((x) => combine(g.color.name, x.color.name) === (clash ? false : true))
      .sort((a, b) => Number(garmentStatus(a) === 'dirty') - Number(garmentStatus(b) === 'dirty') || a.wearsTotal - b.wearsTotal)
      .slice(0, 12)
  }, [g.id, g.color.name, g.category, clash])
  if (!list?.length) return null
  return (
    <div>
      <h2 className="section-label mb-2 px-1">{label}</h2>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">{list.map((x) => <Mini key={x.id} g={x} />)}</div>
    </div>
  )
}
