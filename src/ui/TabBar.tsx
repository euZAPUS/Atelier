import { Link, useLocation } from 'wouter'
import { useT } from '../i18n'
import { Icon, type IconName } from './Icon'

// Cápsula de cristal flotante. El botón central (añadir) es el más grande: es la acción principal.
export function TabBar() {
  const t = useT()
  const [loc] = useLocation()
  const tabs: { to: string; icon: IconName; label: string }[] = [
    { to: '/', icon: 'hanger', label: t.nav.wardrobe },
    { to: '/outfits', icon: 'outfit', label: t.nav.outfits },
    { to: '/semana', icon: 'calendar', label: t.nav.week },
    { to: '/ajustes', icon: 'settings', label: t.nav.settings },
  ]
  const item = (tab: (typeof tabs)[number]) => {
    const active = tab.to === '/' ? loc === '/' : loc.startsWith(tab.to)
    return (
      <Link key={tab.to} href={tab.to} aria-current={active ? 'page' : undefined}
        className={`press flex h-full flex-1 flex-col items-center justify-center gap-1 ${active ? 'text-ink' : 'text-muted'}`}>
        <Icon name={tab.icon} size={24} strokeWidth={active ? 1.9 : 1.5} />
        <span className={`font-mono text-[0.5625rem] uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
      </Link>
    )
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
      <div className="glass mx-auto flex h-(--tab-h) max-w-md items-center rounded-[2rem] px-2">
        {tabs.slice(0, 2).map(item)}
        <Link href="/nueva" aria-label={t.nav.add}
          className="press mx-1 -mt-7 grid size-16 shrink-0 place-items-center rounded-full border border-accent-ink/20 bg-accent text-accent-ink shadow-[0_10px_24px_-8px_rgba(255,174,0,.7)]">
          <Icon name="plus" size={30} strokeWidth={2} />
        </Link>
        {tabs.slice(2).map(item)}
      </div>
    </nav>
  )
}
