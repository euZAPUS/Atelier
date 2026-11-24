// Recorte por croma ("pantalla verde"): la IA genera la prenda sobre un color liso conocido
// (magenta, verde o azul, el que no lleve la prenda) y aquí se quita ese color exacto.
// A diferencia de un modelo de segmentación, nunca confunde partes blancas o negras de la ropa con el fondo.
export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Modifica `data` (RGBA) poniendo transparente el fondo de color `key`.
 * - Se considera fondo lo que se parece al croma y está conectado con el borde de la imagen,
 *   más cualquier píxel casi idéntico al croma (huecos cerrados, p. ej. entre brazo y cuerpo).
 * - Los bordes quedan suaves (alfa gradual) y se les quita el reflejo de color del croma.
 * Devuelve la fracción de la imagen que es prenda (para detectar fallos).
 */
export function chromaKey(data: Uint8ClampedArray, w: number, h: number, key: RGB, opts: { inner?: number; outer?: number } = {}) {
  const { inner = 80, outer = 150 } = opts // por debajo de inner = fondo seguro; por encima de outer = prenda segura
  const n = w * h
  const dist = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const r = data[i * 4] - key[0], g = data[i * 4 + 1] - key[1], b = data[i * 4 + 2] - key[2]
    dist[i] = Math.sqrt(r * r + g * g + b * b)
  }
  // Relleno desde los bordes por píxeles "parecidos al croma"
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
  const spill = (i: number) => {
    const p = i * 4
    let r = data[p], g = data[p + 1], b = data[p + 2]
    if (key[0] > 200 && key[2] > 200 && key[1] < 60) { const s = Math.min(r, b) - g; if (s > 0) { r -= s; b -= s } } // magenta
    else if (key[1] > 200 && key[0] < 60 && key[2] < 60) { const s = g - Math.max(r, b); if (s > 0) g -= s } // verde
    else if (key[2] > 200 && key[0] < 60 && key[1] < 60) { const s = b - Math.max(r, g); if (s > 0) b -= s } // azul
    data[p] = r; data[p + 1] = g; data[p + 2] = b
  }
  let solid = 0
  for (let i = 0; i < n; i++) {
    const d = dist[i]
    let a = 255
    if (d < inner) a = 0 // casi idéntico al croma: fondo aunque esté encerrado
    else if (reach[i]) a = Math.round(((d - inner) / (outer - inner)) * 255) // borde suave
    if (a < 255 && a > 0) spill(i)
    // píxeles de prenda pegados al fondo también llevan reflejo del croma
    else if (a === 255 && ((i % w > 0 && reach[i - 1]) || (i % w < w - 1 && reach[i + 1]))) spill(i)
    data[i * 4 + 3] = Math.min(data[i * 4 + 3], a)
    if (a > 128) solid++
  }
  return solid / n
}
