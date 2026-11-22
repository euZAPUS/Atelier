// Cronómetro del alta rápida: se guarda en este dispositivo para ver si cumplimos los 10 s.
export interface CaptureTiming {
  at: number // cuándo
  camera: number // ms: desde pulsar "+" hasta tener la foto
  toSave: number // ms: desde pulsar "+" hasta pulsar la categoría (lo que tú esperas)
  cutout: number // ms: lo que tardó el recorte (en segundo plano)
  device: string
  firstRun: boolean // incluyó la descarga del modelo
}

const KEY = 'atelier:timings'
export function loadTimings(): CaptureTiming[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
export function saveTiming(t: CaptureTiming) {
  try { localStorage.setItem(KEY, JSON.stringify([t, ...loadTimings()].slice(0, 30))) } catch { /* sin almacenamiento */ }
}
export const secs = (ms: number) => (ms / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
