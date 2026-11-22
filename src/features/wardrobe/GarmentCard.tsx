import type { Garment } from '../../db/types'
import { displayName } from '../../domain/naming'
import { garmentStatus } from '../../domain/wash'
import { useT } from '../../i18n'
import { TLink } from '../../lib/nav'
import { useSettings } from '../../lib/settings'
import { useImage } from '../../lib/useImage'
import { StatusBadge } from '../../ui/StatusBadge'

// Ficha de producto: foto recortada sobre gris, como en una tienda.
export function GarmentCard({ g, index, number }: { g: Garment; index: number; number: number }) {
  const t = useT()
  const { lang } = useSettings()
  const { url, status, isCutout } = useImage(g.imageId)
  const pending = status === 'pending'
  return (
    <TLink href={`/prenda/${g.id}`} className="rise press block" style={{ ['--i' as string]: index }}>
      <div className="relative aspect-[4/5] overflow-hidden bg-tile">
        {url && (
          <img src={url} alt="" loading="lazy" decoding="async"
            style={{ viewTransitionName: `g-${g.id}` }}
            className={`absolute inset-0 size-full ${isCutout ? 'object-contain p-4 drop-shadow-[0_10px_12px_rgb(0_0_0/.18)]' : 'object-cover'} ${pending ? 'opacity-60' : ''}`} />
        )}
        {pending && <div className="scan absolute inset-0" />}
        <span className="tag absolute top-2 left-2 text-muted">N.º {String(number).padStart(3, '0')}</span>
        <span className="absolute top-2 right-2 size-4 rounded-full ring-2 ring-surface" style={{ background: g.color.hex }} />
        {pending && <span className="tag blink absolute bottom-2 left-2 bg-ink px-1.5 py-0.5 text-bg">{t.wardrobe.processing}</span>}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2 px-0.5">
        <p className="line-clamp-2 text-[0.82rem] leading-tight font-bold uppercase">{displayName(g, lang)}</p>
      </div>
      <div className="mt-1 flex items-center justify-between px-0.5">
        <StatusBadge status={garmentStatus(g)} />
        {g.brand && <span className="tag truncate text-muted">{g.brand}</span>}
      </div>
    </TLink>
  )
}
