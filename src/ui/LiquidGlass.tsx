import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/*
 * Cristal líquido estilo Apple, SOLO para controles flotantes (barra inferior, toolbars, botones flotantes, avisos).
 * El contenido (listas, textos, fichas) va siempre sobre fondo sólido por legibilidad.
 *
 * Óptica: un filtro SVG con feDisplacementMap curva lo que pasa por debajo cerca de los bordes (refracción).
 * Solo Chromium aplica filtros SVG dentro de backdrop-filter; Safari (también iOS) y Firefox
 * usan el plan B: blur + saturación, con el mismo borde especular y brillo superior.
 */

// Chromium es el único motor que pinta url(#filtro) en backdrop-filter.
// CSS.supports no sirve (Safari acepta la sintaxis pero no la pinta); userAgentData solo existe en Chromium.
// En iOS todos los navegadores son WebKit, así que allí siempre se usa el plan B.
const SUPPORTS_SVG_BACKDROP = typeof navigator !== 'undefined' && 'userAgentData' in navigator

// Límite de elementos con refracción a la vez (cada uno es un filtro sobre la GPU)
const MAX_REFRACTING = 4
let refracting = 0

// Mapas ya generados: el mismo tamaño no se recalcula nunca
const mapCache = new Map<string, string>()

/**
 * Mapa de desplazamiento: R = desplazamiento en X, G = en Y (128 = nada).
 * Se calcula la distancia al borde del rectángulo redondeado (SDF) y, cerca del borde,
 * se empuja la imagen hacia dentro con una curva suave, como el canto de una lente.
 */
function displacementMap(w: number, h: number, radius: number, bezel: number) {
  const key = `${w}x${h}r${radius}b${bezel}`
  const hit = mapCache.get(key)
  if (hit) return hit
  const s = 0.5 // a media resolución: el filtro lo escala y no se nota
  const cw = Math.max(2, Math.round(w * s)), ch = Math.max(2, Math.round(h * s))
  const c = document.createElement('canvas')
  c.width = cw; c.height = ch
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(cw, ch)
  const r = Math.min(radius, w / 2, h / 2)
  // Distancia al borde de un rectángulo redondeado (>0 dentro)
  const sdf = (x: number, y: number) => {
    const qx = Math.abs(x - w / 2) - (w / 2 - r), qy = Math.abs(y - h / 2) - (h / 2 - r)
    return r - (Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0))
  }
  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const x = (px + 0.5) / s, y = (py + 0.5) / s
      const t = Math.min(1, Math.max(0, sdf(x, y) / bezel)) // 0 en el canto → 1 hacia dentro
      const strength = (1 - t) ** 2 // casi todo el efecto pegado al canto, como una lente
      // Dirección hacia dentro: gradiente numérico de la distancia
      let gx = sdf(x + 1, y) - sdf(x - 1, y), gy = sdf(x, y + 1) - sdf(x, y - 1)
      const len = Math.hypot(gx, gy) || 1
      gx /= len; gy /= len
      const i = (py * cw + px) * 4
      img.data[i] = 128 + gx * strength * 127
      img.data[i + 1] = 128 + gy * strength * 127
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const url = c.toDataURL()
  mapCache.set(key, url)
  return url
}

export function LiquidGlass({ children, className = '', borderRadius = 24, tint = 'light', refraction = 18, style, as: Tag = 'div' }: {
  children?: ReactNode
  className?: string
  borderRadius?: number
  /** light = cristal claro; dark = ahumado (para iconos claros encima) */
  tint?: 'light' | 'dark'
  /** intensidad de la refracción en px */
  refraction?: number
  style?: CSSProperties
  as?: 'div' | 'nav' | 'header'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const id = `lg-${useId().replace(/:/g, '')}`
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [slot, setSlot] = useState(false)

  // Reserva una de las plazas de refracción (las demás instancias usan el plan B)
  useEffect(() => {
    if (!SUPPORTS_SVG_BACKDROP || refracting >= MAX_REFRACTING) return
    refracting++; setSlot(true)
    return () => { refracting--; setSlot(false) }
  }, [])

  // Tamaño redondeado a 8px para no regenerar el mapa por cambios de un píxel
  useLayoutEffect(() => {
    if (!slot || !ref.current) return
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width / 8) * 8, h = Math.round(e.contentRect.height / 8) * 8
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }))
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [slot])

  const map = useMemo(() => (slot && size && size.w > 0 && size.h > 0 ? displacementMap(size.w, size.h, borderRadius, Math.min(24, size.h / 2)) : null), [slot, size, borderRadius])

  const backdrop = map ? `url(#${id}) blur(10px) saturate(160%)` : 'blur(16px) saturate(160%)'
  return (
    <Tag ref={ref as never} className={`liquid-glass liquid-${tint} ${className}`}
      style={{ ...style, borderRadius, backdropFilter: backdrop, WebkitBackdropFilter: map ? undefined : backdrop }}>
      {map && size && (
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <filter id={id} x="0" y="0" width={size.w} height={size.h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feImage href={map} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={refraction} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      {children}
    </Tag>
  )
}
