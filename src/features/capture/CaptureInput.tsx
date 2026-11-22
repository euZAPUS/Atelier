import type { ReactNode } from 'react'
import { useNav } from '../../lib/nav'
import { markTap, startCapture } from './store'

// Un <label> con el <input type=file> dentro: el toque abre la cámara directamente
// (iOS exige que la cámara se abra desde un gesto del usuario, sin pasos intermedios).
export function CaptureInput({ children, className = '', source = 'camera', ariaLabel }: { children: ReactNode; className?: string; source?: 'camera' | 'gallery'; ariaLabel?: string }) {
  const go = useNav()
  return (
    <label role="button" aria-label={ariaLabel} className={className} onClick={markTap}>
      {children}
      <input
        type="file"
        accept="image/*"
        capture={source === 'camera' ? 'environment' : undefined}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = '' // para poder elegir la misma foto otra vez
          if (!file) return
          startCapture(file)
          if (!location.pathname.endsWith('/nueva')) go('/nueva')
        }}
      />
    </label>
  )
}
