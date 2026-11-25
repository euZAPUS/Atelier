import { useEffect, type RefObject } from 'react'
import { Spring } from './spring'

/*
 * Deslizar desde el borde izquierdo para volver, como en cualquier app de iPhone.
 * La pantalla sigue al dedo; si se suelta pasado ~1/3 (o con un gesto rápido), vuelve atrás.
 * Solo en pantallas interiores (ficha, lavadora…), nunca en las pestañas principales.
 */
export function useEdgeSwipeBack(ref: RefObject<HTMLElement | null>, enabled: boolean, onBack: () => void) {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const EDGE = 24
    const x = new Spring(0, 380, 34)
    let raf = 0, last = 0
    let drag: { id: number; x0: number; y0: number; locked: boolean | null; lastX: number; lastT: number; v: number } | null = null
    const paint = () => {
      el.style.transform = x.value > 0.5 ? `translateX(${x.value}px)` : ''
      el.style.boxShadow = x.value > 0.5 ? '-20px 0 40px rgb(0 0 0 / .35)' : ''
    }
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now
      const moving = x.step(dt)
      paint()
      raf = moving ? requestAnimationFrame(loop) : 0
      if (!raf) last = 0
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop) }
    const down = (e: PointerEvent) => {
      if (e.clientX > EDGE || e.pointerType === 'mouse' && e.button !== 0) return
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, locked: null, lastX: e.clientX, lastT: performance.now(), v: 0 }
    }
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0
      if (drag.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) drag.locked = Math.abs(dx) > Math.abs(dy) // horizontal o scroll
      if (!drag.locked) return
      e.preventDefault()
      const now = performance.now()
      drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT)
      drag.lastX = e.clientX; drag.lastT = now
      x.target = x.value = Math.max(0, dx)
      paint()
    }
    const up = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return
      const w = el.clientWidth
      const go = drag.locked && (x.value > w * 0.33 || drag.v > 0.6)
      drag = null
      if (go) {
        x.target = w
        kick()
        setTimeout(() => { onBack(); x.value = x.target = 0; paint() }, 180)
      } else { x.target = 0; kick() }
    }
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      cancelAnimationFrame(raf)
      el.style.transform = ''; el.style.boxShadow = ''
    }
  }, [ref, enabled, onBack])
}
