import { useT } from '../i18n'
import { Icon, type IconName } from '../ui/Icon'
import { PageHeader } from '../ui/PageHeader'

// Pantallas de fases futuras: ya navegables, con un aviso claro.
export function Placeholder({ title, body, icon }: { title: string; body: string; icon: IconName }) {
  const t = useT()
  return (
    <div className="pb-tab">
      <PageHeader title={title} />
      <section className="page-in px-4">
        <div className="card flex flex-col items-center px-6 py-10 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-surface-2"><Icon name={icon} size={30} strokeWidth={1.5} /></div>
          <span className="mt-5 rounded-full bg-surface-2 px-2.5 py-1 text-[0.75rem] font-semibold text-muted">{t.common.soonTag}</span>
          <p className="mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-muted">{body}</p>
        </div>
      </section>
    </div>
  )
}
