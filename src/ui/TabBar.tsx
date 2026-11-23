import { useLocation } from 'wouter'
import { CaptureInput } from '../features/capture/CaptureInput'
import { useT } from '../i18n'
import { TLink } from '../lib/nav'
import { Icon, type IconName } from './Icon'
import { LiquidGlass } from './LiquidGlass'

// Barra inferior de 5 pestañas, como una app nativa. "Añadir" abre la cámara directamente.
export function TabBar() {
  const t = useT()
  const [loc] = useLocation()
  if (loc.startsWith('/nueva') || loc.startsWith('/bienvenida')) return null
  const isActive = (to: string) => (to === '/' ? loc === '/' || loc.startsWith('/prenda') : loc.startsWith(to))
  const Item = ({ icon, label, active }: { icon: IconName; label: string; active?: boolean }) => (
    <span className={`flex h-full flex-col items-center justify-center gap-0.5 ${active ? 'text-ink' : 'text-faint'}`}>
      <Icon name={icon} size={24} strokeWidth={active ? 1.9 : 1.6} />
      <span className="text-[0.6875rem] font-medium">{label}</span>
    </span>
  )
  const link = (to: string, icon: IconName, label: string) => (
    <TLink key={to} href={to} aria-current={isActive(to) ? 'page' : undefined} className="press flex-1">
      <Item icon={icon} label={label} active={isActive(to)} />
    </TLink>
  )
  return (
    <nav className="tabbar fixed inset-x-0 bottom-0 z-40">
      <LiquidGlass borderRadius={0} className="!border-x-0 !border-b-0">
        <div className="mx-auto flex h-(--tab-h) max-w-xl items-stretch px-1" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          {link('/', 'hanger', t.nav.wardrobe)}
          {link('/outfits', 'outfit', t.nav.outfits)}
          <CaptureInput ariaLabel={t.nav.add} className="press flex-1"><Item icon="scan" label={t.nav.add} /></CaptureInput>
          {link('/semana', 'calendar', t.nav.week)}
          {link('/ajustes', 'settings', t.nav.settings)}
        </div>
      </LiquidGlass>
    </nav>
  )
}
