// Recorte del fondo liso que genera la IA (gris medio, blanco o negro, elegido para contrastar con la prenda).
// No se asume el color exacto: se mide en los bordes de la imagen. Se quita lo que se parece a ese color
// y está conectado con el borde, más los píxeles casi idénticos al fondo (huecos entre brazo y cuerpo).
// Así las partes blancas o negras de la ropa no desaparecen como pasaba con el recorte genérico.
export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Color del fondo: mediana de los píxeles del borde (resiste a una prenda que toque el borde). */
export function borderColor(data: Uint8ClampedArray, w: number, h: number): RGB {
  const rs: number[] = [], gs: number[] = [], bs: number[] = []
  const add = (x: number, y: number) => { const i = (y * w + x) * 4; rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]) }
  const step = Math.max(1, Math.floor((w + h) / 400))
  for (let x = 0; x < w; x += step) { add(x, 0); add(x, h - 1) }
  for (let y = 0; y < h; y += step) { add(0, y); add(w - 1, y) }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1]
  return [med(rs), med(gs), med(bs)]
}

/**
 * Pone transparente el fondo de `data` (RGBA). Devuelve la fracción de la imagen que es prenda.
 * inner: por debajo, fondo seguro; outer: por encima, prenda segura; entre medias, borde suave.
 */
export function keyOut(data: Uint8ClampedArray, w: number, h: number, opts: { key?: RGB; inner?: number; outer?: number } = {}) {
  const key = opts.key ?? borderColor(data, w, h)
  const inner = opts.inner ?? 26
  const outer = opts.outer ?? 62
  const n = w * h
  const dist = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const r = data[i * 4] - key[0], g = data[i * 4 + 1] - key[1], b = data[i * 4 + 2] - key[2]
    dist[i] = Math.sqrt(r * r + g * g + b * b)
  }
  // Relleno desde los bordes por píxeles parecidos al fondo
  const reach = new Uint8Array(n)
  const stack: number[] = []
  const push = (i: number) => { if (!reach[i] && dist[i] < outer) { reach[i] = 1; stack.push(i) } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (stack.length) {
    const i = stack.pop()!
    const x = i % w, y = (i / w) | 0
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (y > 0) push(i - w)
    if (y < h - 1) push(i + w)
  }
  const hole = inner * 0.6 // dentro de la prenda solo se quita lo prácticamente idéntico al fondo
  let solid = 0
  for (let i = 0; i < n; i++) {
    const d = dist[i]
    let a = 255
    if (reach[i]) a = d <= inner ? 0 : Math.round(((d - inner) / (outer - inner)) * 255)
    else if (d < hole) a = 0
    // Borde suave: se "des-mezcla" el color del fondo para que no quede halo
    if (a > 0 && a < 255) {
      const t = a / 255
      for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.max(0, Math.min(255, Math.round((data[i * 4 + c] - key[c] * (1 - t)) / t)))
    }
    data[i * 4 + 3] = Math.min(data[i * 4 + 3], a)
    if (a > 128) solid++
  }
  return solid / n
}
