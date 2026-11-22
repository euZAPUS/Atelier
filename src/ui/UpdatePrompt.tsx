import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '../i18n'
import { Button } from './Button'
import { LiquidGlass } from './LiquidGlass'

// Cuando hay una versión nueva desplegada, la ofrece en vez de cambiarla por sorpresa.
export function UpdatePrompt() {
  const t = useT()
  const { needRefresh: [needRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Comprueba si hay versión nueva cada hora mientras la app está abierta
      if (reg) setInterval(() => reg.update(), 60 * 60 * 1000)
    },
  })
  if (offlineReady) setTimeout(() => setOfflineReady(false), 3000)
  if (!needRefresh && !offlineReady) return null
  return (
    <div className="fixed inset-x-0 z-50 px-4" style={{ bottom: 'calc(var(--tab-h) + env(safe-area-inset-bottom) + 28px)' }}>
      <LiquidGlass tint="dark" borderRadius={30} className="toast-in mx-auto flex max-w-md items-center justify-between gap-3 py-2 pr-2 pl-5">
        <span className="text-sm font-bold uppercase">{needRefresh ? t.update.ready : t.update.offline}</span>
        {needRefresh && <Button variant="primary" className="min-h-10 rounded-full text-sm" onClick={() => updateServiceWorker(true)}>{t.update.reload}</Button>}
      </LiquidGlass>
    </div>
  )
}
