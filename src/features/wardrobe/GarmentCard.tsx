import type { Garment } from '../../db/types'
import { colorLabel, displayName } from '../../domain/naming'
import { garmentStatus } from '../../domain/wash'
import { useT } from '../../i18n'
import { TLink } from '../../lib/nav'
import { useSettings } from '../../lib/settings'
import { useImage } from '../../lib/useImage'

const dot = { clean: 'bg-clean', worn: 'bg-worn', dirty: 'bg-dirty' } as const

// Ficha de producto: foto sobre gris de estudio, nombre y una línea de datos, como en una tienda.
export function GarmentCard({ g, index }: { g: Garment; index: number }) {
  const t = useT()
  const { lang } = useSettings()
  const { url, status, isCutout } = useImage(g.imageId)
  const pending = status === 'pending'
  const st = garmentStatus(g)
  return (
    <TLink href={`/prenda/${g.id}`} className="rise press block" style={{ ['--i' as string]: index }}>
      <div className={`relative aspect-[4/5] overflow-hidden rounded-[18px] bg-tile ${pending ? 'processing' : ''}`}>
        {url && (
          <img src={url} alt="" loading="lazy" decoding="async" style={{ viewTransitionName: `g-${g.id}` }}
            className={`absolute inset-0 size-full ${isCutout ? 'product-shadow object-contain p-[12%]' : 'object-cover'} ${pending ? 'opacity-70' : ''}`} />
        )}
        {pending && <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.6875rem] font-medium text-white backdrop-blur">{t.wardrobe.processing}</span>}
      </div>
      <p className="mt-2 truncate px-0.5 text-[0.9375rem] font-medium">{displayName(g, lang)}</p>
      <p className="flex items-center gap-1.5 px-0.5 text-[0.8125rem] text-muted">
        <span className={`size-1.5 shrink-0 rounded-full ${dot[st]}`} />
        <span className="truncate">{t.status[st]}{g.brand ? ` · ${g.brand}` : g.color.name !== 'pending' ? ` · ${colorLabel(g.color.name, lang)}` : ''}</span>
      </p>
    </TLink>
  )
}
