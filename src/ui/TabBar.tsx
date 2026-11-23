import { useLocation } from 'wouter'
import { CaptureInput } from '../features/capture/CaptureInput'
import { useT } from '../i18n'
import { TLink } from '../lib/nav'
import { Icon, type IconName } from './Icon'
import { LiquidGlass } from './LiquidGlass'

// Barra flotante de cristal con 5 pestañas. "Añadir" va resaltada y abre la cámara directamente.
export function TabBar() {
  const t = useT()
  const [loc] = useLocation()
  if (loc.startsWith('/nueva') || loc.startsWith('/bienvenida')) return null
  const isActive = (to: string) => (to === '/' ? loc === '/' || loc.startsWith('/prenda') : loc.startsWith(to))
  const Item = ({ icon, label, active }: { icon: IconName; label: string; active?: boolean }) => (
    <span className={`flex h-full flex-col items-center justify-center gap-0.5 ${active ? 'text-ink' : 'text-faint'}`}>
      <Icon name={icon} size={23} strokeWidth={active ? 1.9 : 1.6} />
      <span className="text-[0.625rem] font-medium">{label}</span>
    </span>
  )
  const link = (to: string, icon: IconName, label: string) => (
    <TLink key={to} href={to} aria-current={isActive(to) ? 'page' : undefined} className="press h-full flex-1">
      <Item icon={icon} label={label} active={isActive(to)} />
    </TLink>
  )
  return (
    <nav className="tabbar fixed inset-x-0 bottom-0 z-40 px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}>
      <LiquidGlass borderRadius={31} className="mx-auto flex h-(--tab-h) max-w-md items-center px-1.5">
        {link('/', 'hanger', t.nav.wardrobe)}
        {link('/outfits', 'outfit', t.nav.outfits)}
        <CaptureInput ariaLabel={t.nav.add} className="press mx-1 flex h-[calc(var(--tab-h)-12px)] flex-1 flex-col items-center justify-center gap-0.5 rounded-full bg-accent text-accent-ink">
          <Icon name="scan" size={23} strokeWidth={1.9} />
          <span className="text-[0.625rem] font-semibold">{t.nav.add}</span>
        </CaptureInput>
        {link('/semana', 'calendar', t.nav.week)}
        {link('/ajustes', 'settings', t.nav.settings)}
      </LiquidGlass>
    </nav>
  )
}
