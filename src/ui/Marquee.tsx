// Cinta de texto que se desplaza sin fin (se duplica el contenido para que el bucle no se note).
export function Marquee({ items, speed = 26, className = '' }: { items: string[]; speed?: number; className?: string }) {
  const row = (
    <div aria-hidden className="flex shrink-0 items-center">
      {items.map((it, i) => (
        <span key={i} className="flex items-center">
          <span className="px-3">{it}</span><span className="text-[0.7em]">✦</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className={`marquee overflow-hidden whitespace-nowrap ${className}`} style={{ ['--speed' as string]: `${speed}s` }}>
      <div>{row}{row}{row}{row}</div>
    </div>
  )
}
