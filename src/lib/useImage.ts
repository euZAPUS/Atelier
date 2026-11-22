import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { db } from '../db/db'

/** URL temporal de la imagen de una prenda ('thumb' para la cuadrícula, 'cutout' para el detalle). */
export function useImage(imageId: string | undefined, kind: 'thumb' | 'cutout' = 'thumb') {
  const img = useLiveQuery(() => (imageId ? db.images.get(imageId) : undefined), [imageId])
  const blob = kind === 'cutout' ? (img?.cutout ?? img?.thumb) : img?.thumb
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return { url, status: img?.status, isCutout: img?.status === 'ready' }
}
