import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'wouter'
import { db } from '../db/db'
import { fmt, useT } from '../i18n'
import { Button } from '../ui/Button'
import { HangerDrawing } from '../ui/Drawing'
import { PageHeader } from '../ui/PageHeader'

export function Wardrobe() {
  const t = useT()
  const count = useLiveQuery(() => db.garments.filter((g) => !g.archived).count(), []) ?? 0
  return (
    <div className="page-in pb-tab">
      <PageHeader fig="01" title={t.wardrobe.title} meta={fmt(t.wardrobe.count, { n: count })} />
      <section className="px-5">
        <div className="plate flex flex-col items-center px-6 pt-8 pb-6 text-center">
          <HangerDrawing className="w-56 text-ink" />
          <span className="fig mt-4">FIG. 01.A</span>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{t.wardrobe.emptyTitle}</h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{t.wardrobe.emptyBody}</p>
          <Link href="/nueva" className="mt-6 w-full"><Button variant="primary" icon="camera" block>{t.wardrobe.emptyCta}</Button></Link>
        </div>
      </section>
    </div>
  )
}
