import { useLocation } from 'wouter'
import { CaptureInput } from '../features/capture/CaptureInput'
import { useT } from '../i18n'
import { TLink } from '../lib/nav'
import { Icon, type IconName } from './Icon'
import { LiquidGlass } from './LiquidGlass'

// Barra negra flotante. El botón central abre la cámara al instante: es la acción principal.
export function TabBar() {
  const t = useT()
  const [loc] = useLocation()
  if (loc.startsWith('/nueva')) return null
  const tabs: { to: string; icon: IconName; label: string }[] = [
    { to: '/', icon: 'hanger', label: t.nav.wardrobe },
    { to: '/outfits', icon: 'outfit', label: t.nav.outfits },
    { to: '/semana', icon: 'calendar', label: t.nav.week },
    { to: '/ajustes', icon: 'settings', label: t.nav.settings },
  ]
  const item = (tab: (typeof tabs)[number]) => {
    const active = tab.to === '/' ? loc === '/' || loc.startsWith('/prenda') : loc.startsWith(tab.to)
    return (
      <TLink key={tab.to} href={tab.to} aria-current={active ? 'page' : undefined}
        className="press relative flex h-full flex-1 flex-col items-center justify-center gap-1"
        style={{ color: active ? 'var(--bar-ink)' : 'var(--bar-muted)' }}>
        <Icon name={tab.icon} size={23} strokeWidth={active ? 2.1 : 1.6} />
        <span className="text-[0.56rem] font-bold uppercase tracking-[0.12em]">{tab.label}</span>
        <span className={`absolute bottom-1.5 h-[3px] rounded-full bg-accent transition-all duration-300 ${active ? 'w-4 opacity-100' : 'w-0 opacity-0'}`} />
      </TLink>
    )
  }
  return (
    <nav className="tabbar fixed inset-x-0 bottom-0 z-40 px-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
      <LiquidGlass tint="dark" borderRadius={32} className="mx-auto flex h-(--tab-h) max-w-md items-center px-2">
        {tabs.slice(0, 2).map(item)}
        <CaptureInput ariaLabel={t.nav.add}
          className="press mx-1 grid size-[3.6rem] shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_0_0_4px_var(--bg),0_8px_24px_-6px_rgb(200_255_0/.7)] -translate-y-4">
          <Icon name="plus" size={30} strokeWidth={2.4} />
        </CaptureInput>
        {tabs.slice(2).map(item)}
      </LiquidGlass>
    </nav>
  )
}
