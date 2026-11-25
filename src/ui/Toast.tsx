import { useEffect, useSyncExternalStore } from 'react'
import { LiquidGlass } from './LiquidGlass'

// Aviso flotante breve, con acción opcional (p. ej. "Deshacer"). Uno a la vez.
interface ToastData { id: number; text: string; action?: { label: string; run: () => void } }
let current: ToastData | null = null
const subs = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined
const emit = () => subs.forEach((f) => f())

export function toast(text: string, action?: ToastData['action'], ms = 4500) {
  current = { id: Date.now(), text, action }
  clearTimeout(timer)
  timer = setTimeout(() => { current = null; emit() }, ms)
  emit()
}

export function Toaster() {
  const t = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => current)
  useEffect(() => () => clearTimeout(timer), [])
  if (!t) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 z-50 px-4" style={{ bottom: 'calc(var(--tab-h) + env(safe-area-inset-bottom) + 26px)' }}>
      <LiquidGlass key={t.id} tint="dark" borderRadius={16} className="toast-in pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 py-2 pr-2 pl-4">
        <span className="text-[0.9375rem] font-medium">{t.text}</span>
        {t.action && (
          <button onClick={() => { t.action!.run(); current = null; emit() }}
            className="press h-9 shrink-0 rounded-[10px] bg-white px-3 text-[0.875rem] font-semibold text-black">{t.action.label}</button>
        )}
      </LiquidGlass>
    </div>
  )
}
