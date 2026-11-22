import { useT } from '../i18n'
import { Icon, type IconName } from '../ui/Icon'
import { PageHeader } from '../ui/PageHeader'

// Pantallas de fases futuras: ya navegables, con su lámina "en obras".
export function Placeholder({ fig, title, body, icon }: { fig: string; title: string; body: string; icon: IconName }) {
  const t = useT()
  return (
    <div className="page-in pb-tab">
      <PageHeader fig={fig} title={title} />
      <section className="px-5">
        <div className="plate flex flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="grid size-20 place-items-center rounded-full border border-dashed border-line-soft text-muted">
            <Icon name={icon} size={36} strokeWidth={1.2} />
          </div>
          <span className="fig border border-line-soft px-2 py-1">{t.common.soonTag}</span>
          <p className="max-w-xs text-sm leading-relaxed text-muted">{body}</p>
        </div>
      </section>
    </div>
  )
}
