import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { CaptureInput } from '../features/capture/CaptureInput'
import { useT } from '../i18n'
import { TLink, useNav } from '../lib/nav'
import { Spring } from '../lib/spring'
import { Icon, type IconName } from './Icon'
import { LiquidGlass } from './LiquidGlass'

/*
 * Barra de pestañas al estilo de iOS 26 (Música, Fotos, App Store…):
 * - Cápsula de cristal con las pestañas y una píldora en la activa.
 * - Mantén pulsado y desliza: la píldora se convierte en una LENTE que sigue al dedo, se estira con la
 *   velocidad y agranda los iconos que pasa por encima. Al soltar, salta con muelle a la pestaña más cercana.
 * - Un toque normal también se desliza con rebote.
 * Todo con muelles físicos (lib/spring.ts) y sin re-renderizar React durante el gesto.
 */
const TAB_INSET = 4 // px de margen interior de la cápsula

export function TabBar() {
  const t = useT()
  const [loc] = useLocation()
  const go = useNav()
  const tabs: { to: string; icon: IconName; label: string }[] = [
    { to: '/', icon: 'hanger', label: t.nav.wardrobe },
    { to: '/outfits', icon: 'outfit', label: t.nav.outfits },
    { to: '/semana', icon: 'calendar', label: t.nav.week },
    { to: '/ajustes', icon: 'settings', label: t.nav.settings },
  ]
  const active = tabs.findIndex((tab) => (tab.to === '/' ? loc === '/' || loc.startsWith('/prenda') : loc.startsWith(tab.to)))
  const hidden = loc.startsWith('/nueva') || loc.startsWith('/bienvenida') || loc.startsWith('/lavadora') || loc.startsWith('/outfits/')

  const barRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  // Muelles: posición (en "pestañas"), lente (0 reposo → 1 pulsado) y estiramiento
  const anim = useRef({ x: new Spring(Math.max(0, active), 380, 30), lens: new Spring(0, 520, 22), stretch: new Spring(0, 300, 24), raf: 0, last: 0 })
  const gesture = useRef<{ id: number; startX: number; moved: boolean; lastX: number; lastT: number; handled: boolean } | null>(null)

  const slot = () => ((barRef.current?.clientWidth ?? 0) - TAB_INSET * 2) / tabs.length

  // Pinta el estado actual de los muelles (estilos directos, sin React)
  const paint = () => {
    const a = anim.current, w = slot(), pill = pillRef.current
    if (!pill || !w) return
    const lens = Math.max(0, a.lens.value)
    const st = a.stretch.value
    const sx = 1 + lens * 0.14 + Math.abs(st) * 0.35
    const sy = 1 + lens * 0.32 - Math.abs(st) * 0.18
    pill.style.transform = `translateX(${a.x.value * w}px) scale(${sx}, ${sy})`
    pill.dataset.lens = lens > 0.05 ? '1' : '0'
    pill.style.setProperty('--lens', String(Math.min(1, lens)))
    // Los iconos bajo la lente se agrandan
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const d = Math.abs(i - a.x.value)
      const k = 1 + lens * 0.22 * Math.max(0, 1 - d)
      el.style.transform = `scale(${k})`
    })
  }
  const loop = (now: number) => {
    const a = anim.current
    const dt = Math.min(0.05, (now - (a.last || now)) / 1000)
    a.last = now
    const moving = [a.x.step(dt), a.lens.step(dt), a.stretch.step(dt)].some(Boolean)
    paint()
    a.raf = moving || gesture.current ? requestAnimationFrame(loop) : 0
    if (!a.raf) { a.last = 0; settle() }
  }
  // Al terminar: valores exactos, fuera las capas de animación y un repintado forzado. Safari en iOS deja
  // restos de la lente (lo que pintó fuera de la barra) si no se le obliga a repintar.
  const settle = () => {
    const pill = pillRef.current, bar = barRef.current
    if (!pill || !bar) return
    pill.style.willChange = 'auto'
    itemRefs.current.forEach((el) => { if (el) { el.style.transform = ''; el.style.willChange = 'auto' } })
    bar.style.transform = 'translateZ(0)'
    requestAnimationFrame(() => { bar.style.transform = '' })
  }
  const kick = () => {
    if (anim.current.raf) return
    pillRef.current?.style.setProperty('will-change', 'transform')
    itemRefs.current.forEach((el) => el?.style.setProperty('will-change', 'transform'))
    anim.current.raf = requestAnimationFrame(loop)
  }

  // Al cambiar de pantalla (por un enlace, atrás…), la píldora va con muelle a su pestaña
  useEffect(() => {
    if (active < 0 || gesture.current) return
    anim.current.x.target = active
    kick()
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onResize = () => paint()
    window.addEventListener('resize', onResize)
    paint()
    const a = anim.current
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(a.raf); a.raf = 0 }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Al reaparecer (al volver del editor, de la lavadora…) la píldora es un elemento nuevo: hay que pintarla
  useLayoutEffect(() => { if (!hidden) paint() }, [hidden]) // eslint-disable-line react-hooks/exhaustive-deps

  const indexAt = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect()
    return Math.max(0, Math.min(tabs.length - 1, Math.floor((clientX - r.left - TAB_INSET) / slot())))
  }
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    barRef.current!.setPointerCapture(e.pointerId)
    gesture.current = { id: e.pointerId, startX: e.clientX, moved: false, lastX: e.clientX, lastT: performance.now(), handled: false }
    // Solo se vuelve lente si pulsas SOBRE la píldora (como en iOS). En otra pestaña, es un toque normal.
    if (indexAt(e.clientX) === Math.round(anim.current.x.value)) { anim.current.lens.target = 1; kick() }
  }
  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    if (!g.moved && Math.abs(e.clientX - g.startX) > 6) { g.moved = true; anim.current.lens.target = 1 } // al arrastrar, siempre lente
    if (!g.moved) return
    const r = barRef.current!.getBoundingClientRect(), w = slot()
    const pos = (e.clientX - r.left - TAB_INSET) / w - 0.5
    const a = anim.current
    a.x.target = Math.max(-0.15, Math.min(tabs.length - 0.85, pos)) // un poco de "goma" en los extremos
    const now = performance.now()
    const v = (e.clientX - g.lastX) / Math.max(1, now - g.lastT) // px/ms
    a.stretch.target = Math.max(-1, Math.min(1, v / 2.2))
    g.lastX = e.clientX; g.lastT = now
    kick()
  }
  const onUp = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    const a = anim.current
    const idx = g.moved ? Math.max(0, Math.min(tabs.length - 1, Math.round(a.x.target))) : indexAt(e.clientX)
    a.x.target = idx
    a.lens.target = 0
    a.stretch.target = 0
    g.handled = true
    kick()
    if (idx !== active) go(tabs[idx].to, { instant: true })
    // el click que sigue al pointerup ya está atendido
    setTimeout(() => { gesture.current = null }, 0)
  }
  const onCancel = () => {
    const a = anim.current
    a.x.target = Math.max(0, active); a.lens.target = 0; a.stretch.target = 0
    gesture.current = null
    kick()
  }

  if (hidden) return null
  return (
    <nav className="tabbar fixed inset-x-0 bottom-0 z-40 px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}>
      <div className="mx-auto flex max-w-md items-center gap-2.5">
        <div className="relative h-16 flex-1">
          <LiquidGlass borderRadius={32} className="!absolute inset-0" />
          <div ref={barRef} className="relative flex h-full touch-none items-center select-none" style={{ padding: TAB_INSET }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}>
            {active >= 0 && (
              <span ref={pillRef} aria-hidden className="tab-pill absolute rounded-[28px]"
                style={{ top: TAB_INSET, bottom: TAB_INSET, left: TAB_INSET, width: `calc((100% - ${TAB_INSET * 2}px) / ${tabs.length})` }} />
            )}
            {tabs.map((tab, i) => (
              <TLink key={tab.to} href={tab.to} aria-current={i === active ? 'page' : undefined}
                onClick={(e) => e.preventDefault() /* la navegación la hace el gesto */}
                draggable={false} onDragStart={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
                className={`relative z-10 flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${i === active ? 'text-ink' : 'text-muted'}`}>
                <span ref={(el) => { itemRefs.current[i] = el }} className="flex flex-col items-center gap-0.5">
                  <Icon name={tab.icon} size={23} strokeWidth={i === active ? 1.9 : 1.6} />
                  <span className={`text-[0.625rem] ${i === active ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
                </span>
              </TLink>
            ))}
          </div>
        </div>
        <CaptureInput ariaLabel={t.nav.add}
          className="fab-spring grid size-16 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_30px_-10px_rgb(0_0_0/.5),inset_0_1px_1px_rgb(255_255_255/.5)]">
          <Icon name="plus" size={28} strokeWidth={2.1} />
        </CaptureInput>
      </div>
    </nav>
  )
}
