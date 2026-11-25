import type { CollageItem, Garment } from '../../db/types'
import { ITEM_W } from '../../domain/outfit'
import { useImage } from '../../lib/useImage'

// Collage de un outfit. Todo en porcentajes del lienzo: se ve igual en la miniatura y en el editor.
function Piece({ item, garment, kind, selected }: { item: CollageItem; garment: Garment; kind: 'thumb' | 'cutout'; selected?: boolean }) {
  const { url } = useImage(garment.imageId, kind)
  return (
    <div data-gid={item.garmentId}
      className="absolute aspect-square"
      style={{
        left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${ITEM_W * item.scale * 100}%`, zIndex: item.z,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
      }}>
      {url && <img src={url} alt="" draggable={false} className="product-shadow pointer-events-none size-full object-contain select-none" />}
      {selected && <span className="collage-sel pointer-events-none absolute -inset-1.5 rounded-[14px]" />}
    </div>
  )
}

export function Collage({ items, garments, kind = 'thumb', selected }: { items: CollageItem[]; garments: Map<string, Garment>; kind?: 'thumb' | 'cutout'; selected?: string | null }) {
  return (
    <>
      {items.map((it) => {
        const g = garments.get(it.garmentId)
        return g ? <Piece key={it.garmentId} item={it} garment={g} kind={kind} selected={selected === it.garmentId} /> : null
      })}
    </>
  )
}
