import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { useLocation } from 'wouter'

type VT = { ready: Promise<void>; finished: Promise<void> }
type VTDocument = Document & { startViewTransition?: (cb: () => void) => VT }

/** Navega con View Transitions (Safari 18+); si no hay soporte, navega sin más. */
export function useNav() {
  const [, navigate] = useLocation()
  return (to: string, opts?: { replace?: boolean }) => {
    const doc = document as VTDocument
    if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return navigate(to, opts)
    const vt = doc.startViewTransition(() => flushSync(() => navigate(to, opts)))
    // Si iOS cambia el viewport a mitad (al volver de la cámara) la animación se cancela: la navegación sigue igual
    vt.ready.catch(() => {}); vt.finished.catch(() => {})
  }
}

export function TLink({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const go = useNav()
  const full = `${import.meta.env.BASE_URL.replace(/\/$/, '')}${href}`
  return (
    <a {...rest} href={full} onClick={(e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      if (e.defaultPrevented || e.metaKey || e.ctrlKey) return
      e.preventDefault()
      go(href)
    }} />
  )
}
