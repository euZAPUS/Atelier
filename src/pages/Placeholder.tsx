import { useT } from '../i18n'
import { Icon, type IconName } from '../ui/Icon'
import { Marquee } from '../ui/Marquee'
import { PageHeader } from '../ui/PageHeader'

// Pantallas de fases futuras: ya navegables, con su cartel de "próximamente".
export function Placeholder({ code, title, body, icon }: { code: string; title: string; body: string; icon: IconName }) {
  const t = useT()
  return (
    <div className="pb-tab">
      <PageHeader code={code} title={title} />
      <Marquee className="display-wide border-y-2 border-ink py-1.5 text-[0.8rem]" items={[t.common.soonTag, title, t.common.soonTag, 'Atelier']} speed={18} />
      <section className="page-in px-4 pt-8">
        <div className="flex flex-col items-start gap-4 border-2 border-dashed border-line-soft p-6">
          <Icon name={icon} size={44} strokeWidth={1.4} />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{body}</p>
        </div>
      </section>
    </div>
  )
}
