// Utilidades de imagen con canvas. Todo en el dispositivo.

export async function decode(blob: Blob): Promise<ImageBitmap> {
  // createImageBitmap respeta la orientación EXIF de las fotos del iPhone
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

export function toCanvas(src: CanvasImageSource & { width: number; height: number }, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(src.width * scale))
  c.height = Math.max(1, Math.round(src.height * scale))
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return c
}

export function canvasToBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('toBlob falló'))), type, quality))
}

// WebP si el navegador sabe codificarlo; si no (Safari antiguo), PNG para conservar la transparencia.
let webpOk: boolean | undefined
export async function encodeAlpha(c: HTMLCanvasElement, quality = 0.86): Promise<Blob> {
  if (webpOk !== false) {
    const b = await canvasToBlob(c, 'image/webp', quality)
    webpOk = b.type === 'image/webp'
    if (webpOk) return b
  }
  return canvasToBlob(c, 'image/png')
}

/** ¿La imagen ya trae transparencia? (p. ej. "Copiar sujeto" de iOS pegado) */
export function hasTransparency(c: HTMLCanvasElement) {
  const s = toCanvas(c, 64)
  const d = s.getContext('2d')!.getImageData(0, 0, s.width, s.height).data
  let transparent = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) transparent++
  return transparent / (d.length / 4) > 0.05
}

/** Recorta los bordes transparentes, dejando un pequeño margen. */
export function trimTransparent(c: HTMLCanvasElement, pad = 0.04) {
  const { width: w, height: h } = c
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x; if (x > x1) x1 = x
        if (y < y0) y0 = y; if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return null // todo transparente: el recorte no encontró nada
  const p = Math.round(Math.max(x1 - x0, y1 - y0) * pad)
  x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p)
  x1 = Math.min(w - 1, x1 + p); y1 = Math.min(h - 1, y1 + p)
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

/** Píxeles reducidos para analizar el color (rápido). */
export function samplePixels(c: HTMLCanvasElement, maxSide = 72) {
  const s = toCanvas(c, maxSide)
  return s.getContext('2d')!.getImageData(0, 0, s.width, s.height).data
}

/** Sin recorte: mira el centro de la foto, donde suele estar la prenda. */
export function centerCrop(c: HTMLCanvasElement, frac = 0.5) {
  const out = document.createElement('canvas')
  out.width = Math.round(c.width * frac); out.height = Math.round(c.height * frac)
  out.getContext('2d')!.drawImage(c, (c.width - out.width) / 2, (c.height - out.height) / 2, out.width, out.height, 0, 0, out.width, out.height)
  return out
}
