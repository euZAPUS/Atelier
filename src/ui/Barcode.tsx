// Código de barras decorativo a partir de un texto (siempre el mismo para el mismo texto).
export function Barcode({ value, className = '' }: { value: string; className?: string }) {
  let h = 2166136261
  const bars: number[] = []
  for (let i = 0; i < 28; i++) {
    h ^= value.charCodeAt(i % Math.max(1, value.length)) + i
    h = Math.imul(h, 16777619) >>> 0
    bars.push(1 + (h % 3))
  }
  let x = 0
  return (
    <svg viewBox="0 0 84 20" className={className} aria-hidden="true" preserveAspectRatio="none">
      {bars.map((w, i) => { const r = i % 2 === 0 ? <rect key={i} x={x} width={w} height="20" fill="currentColor" /> : null; x += w; return r })}
    </svg>
  )
}
