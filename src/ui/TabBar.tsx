import { useLocation } from 'wouter'
import { CaptureInput } from '../features/capture/CaptureInput'
import { useT } from '../i18n'
import { TLink } from '../lib/nav'
import { Icon, type IconName } from './Icon'
import { LiquidGlass } from './LiquidGlass'

// Barra al estilo de iOS 26 (Música, Fotos…): cápsula de cristal con las pestañas y una píldora
// que se desliza hasta la activa, y a la derecha un botón redondo aparte para la acción principal.
export function TabBar() {
  const t = useT()
  const [loc] = useLocation()
  if (loc.startsWith('/nueva') || loc.startsWith('/bienvenida')) return null
  const tabs: { to: string; icon: IconName; label: string }[] = [
    { to: '/', icon: 'hanger', label: t.nav.wardrobe },
    { to: '/outfits', icon: 'outfit', label: t.nav.outfits },
    { to: '/semana', icon: 'calendar', label: t.nav.week },
    { to: '/ajustes', icon: 'settings', label: t.nav.settings },
  ]
  const active = tabs.findIndex((tab) => (tab.to === '/' ? loc === '/' || loc.startsWith('/prenda') : loc.startsWith(tab.to)))
  return (
    <nav className="tabbar fixed inset-x-0 bottom-0 z-40 px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}>
      <div className="mx-auto flex max-w-md items-center gap-2.5">
        <LiquidGlass borderRadius={32} className="relative flex h-16 flex-1 items-center p-1">
          {/* Píldora de la pestaña activa: se desliza */}
          {active >= 0 && (
            <span aria-hidden className="absolute top-1 bottom-1 left-1 rounded-[28px] bg-ink/[0.09] transition-transform duration-300 ease-[cubic-bezier(.3,1.3,.5,1)]"
              style={{ width: `calc((100% - 0.5rem) / ${tabs.length})`, transform: `translateX(${active * 100}%)` }} />
          )}
          {tabs.map((tab, i) => (
            <TLink key={tab.to} href={tab.to} aria-current={i === active ? 'page' : undefined}
              className={`press relative z-10 flex h-full flex-1 flex-col items-center justify-center gap-0.5 ${i === active ? 'text-ink' : 'text-muted'}`}>
              <Icon name={tab.icon} size={23} strokeWidth={i === active ? 1.9 : 1.6} />
              <span className={`text-[0.625rem] ${i === active ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
            </TLink>
          ))}
        </LiquidGlass>
        <CaptureInput ariaLabel={t.nav.add}
          className="press grid size-16 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_30px_-10px_rgb(0_0_0/.5),inset_0_1px_1px_rgb(255_255_255/.5)]">
          <Icon name="plus" size={28} strokeWidth={2.1} />
        </CaptureInput>
      </div>
    </nav>
  )
}
