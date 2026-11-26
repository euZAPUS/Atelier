// Limpieza del recorte local: el modelo del móvil a veces deja, además de la prenda, cosas sueltas
// (las chanclas, una mano, una esquina de la cama). Nos quedamos con la mancha principal.

/**
 * Deja solo el trozo opaco principal (el más grande, con preferencia por el centro) y borra el resto.
 * Trabaja sobre RGBA en su sitio. Devuelve la fracción de píxeles opacos que se han borrado.
 */
export function keepMainBlob(data: Uint8ClampedArray, w: number, h: number, threshold = 128): number {
  const n = w * h
  const label = new Int32Array(n).fill(-1)
  const stack = new Int32Array(n)
  const blobs: { area: number; cx: number; cy: number }[] = []
  for (let i = 0; i < n; i++) {
    if (label[i] !== -1 || data[i * 4 + 3] < threshold) continue
    const id = blobs.length
    let top = 0, area = 0, sx = 0, sy = 0
    stack[top++] = i; label[i] = id
    while (top) {
      const p = stack[--top]
      const x = p % w, y = (p - x) / w
      area++; sx += x; sy += y
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]
      for (const q of nb) if (q >= 0 && label[q] === -1 && data[q * 4 + 3] >= threshold) { label[q] = id; stack[top++] = q }
    }
    blobs.push({ area, cx: sx / area / w, cy: sy / area / h })
  }
  if (blobs.length <= 1) return 0
  // Puntuación: tamaño, penalizando lo que queda lejos del centro (la prenda suele estar centrada)
  const score = (b: (typeof blobs)[number]) => b.area * (1 - 0.6 * Math.min(1, Math.hypot(b.cx - 0.5, b.cy - 0.5) / 0.7))
  let best = 0
  blobs.forEach((b, i) => { if (score(b) > score(blobs[best])) best = i })
  // Borde suave: se conservan los píxeles semitransparentes pegados a la mancha principal
  const near = (p: number) => {
    const x = p % w, y = (p - x) / w
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && label[yy * w + xx] === best) return true
    }
    return false
  }
  let removed = 0, opaque = 0
  for (let p = 0; p < n; p++) {
    const a = data[p * 4 + 3]
    if (!a) continue
    if (a >= threshold) opaque++
    if (label[p] === best || (a < threshold && near(p))) continue
    if (a >= threshold) removed++
    data[p * 4 + 3] = 0
  }
  return opaque ? removed / opaque : 0
}
