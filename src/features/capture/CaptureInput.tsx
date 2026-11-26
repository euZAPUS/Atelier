import type { ReactNode } from 'react'
import { useNav } from '../../lib/nav'
import { toast } from '../../ui/Toast'
import { fmt, useT } from '../../i18n'
import { markTap, startBulk, startCapture } from './store'

// Un <label> con el <input type=file> dentro: el toque abre la cámara directamente
// (iOS exige que la cámara se abra desde un gesto del usuario, sin pasos intermedios).
export function CaptureInput({ children, className = '', source = 'camera', ariaLabel }: { children: ReactNode; className?: string; source?: 'camera' | 'gallery'; ariaLabel?: string }) {
  const go = useNav()
  const t = useT()
  return (
    <label role="button" aria-label={ariaLabel} className={className} onClick={markTap}>
      {children}
      <input
        type="file"
        accept="image/*"
        capture={source === 'camera' ? 'environment' : undefined}
        multiple={source === 'gallery'}
        className="sr-only"
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = '' // para poder elegir la misma foto otra vez
          const file = files[0]
          if (!file) return
          // Varias fotos de la galería: subida en bloque, se procesan solas mientras usas la app
          if (files.length > 1) {
            go('/', { replace: true })
            toast(fmt(t.bulk.started, { n: files.length }))
            await startBulk(files)
            return
          }
          startCapture(file)
          if (!location.pathname.endsWith('/nueva')) go('/nueva')
        }}
      />
    </label>
  )
}
