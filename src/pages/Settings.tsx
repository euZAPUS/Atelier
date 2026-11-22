import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'wouter'
import { fmt, useT } from '../i18n'
import { updateSettings, useSettings } from '../lib/settings'
import { formatBytes, requestPersist, storageInfo } from '../lib/storage'
import { Button } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'
import { PageHeader } from '../ui/PageHeader'

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="fig mb-2 px-1">{label}</h2>
      <div className="plate divide-y divide-line-soft">{children}</div>
    </section>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: IconName }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex border border-line-soft p-1">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={`press flex h-11 flex-1 items-center justify-center gap-1.5 text-sm font-medium ${value === o.id ? 'bg-ink text-bg' : 'text-muted'}`}>
          {o.icon && <Icon name={o.icon} size={18} />}{o.label}
        </button>
      ))}
    </div>
  )
}

export function Settings() {
  const t = useT()
  const s = useSettings()
  const [info, setInfo] = useState<Awaited<ReturnType<typeof storageInfo>>>()
  useEffect(() => { storageInfo().then(setInfo) }, [])

  return (
    <div className="page-in pb-tab">
      <PageHeader fig="05" title={t.settings.title} />
      <div className="px-5">
        <Section label={t.settings.appearance}>
          <div className="space-y-2 p-4">
            <span className="text-sm font-medium">{t.settings.theme}</span>
            <Segmented value={s.theme} onChange={(theme) => updateSettings({ theme })} options={[
              { id: 'system', label: t.settings.themes.system, icon: 'auto' },
              { id: 'light', label: t.settings.themes.light, icon: 'sun' },
              { id: 'dark', label: t.settings.themes.dark, icon: 'moon' },
            ]} />
          </div>
          <div className="space-y-2 p-4">
            <span className="text-sm font-medium">{t.settings.language}</span>
            <Segmented value={s.lang} onChange={(lang) => updateSettings({ lang })} options={[
              { id: 'es', label: 'Español' }, { id: 'en', label: 'English' },
            ]} />
          </div>
        </Section>

        <Section label={t.settings.storage}>
          <div className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${info?.persisted ? 'bg-clean' : 'bg-worn'}`} />
              <div className="text-sm">
                <p className="font-medium">{info?.persisted ? t.settings.persisted : t.settings.notPersisted}</p>
                {info?.supported && <p className="fig mt-1">{fmt(t.settings.used, { used: formatBytes(info.usage) })}</p>}
              </div>
            </div>
            {info && !info.persisted && (
              <Button block onClick={async () => { await requestPersist(); setInfo(await storageInfo()) }}>{t.settings.requestPersist}</Button>
            )}
          </div>
        </Section>

        <Section label={t.settings.about}>
          <Link href="/kit" className="press flex min-h-13 items-center justify-between px-4">
            <span className="flex items-center gap-3 text-sm font-medium"><Icon name="ruler" size={20} />{t.settings.designKit}</span>
            <Icon name="chevron" size={18} className="text-muted" />
          </Link>
          <div className="flex min-h-13 items-center justify-between px-4 text-sm">
            <span>{t.settings.version}</span><span className="fig">{__APP_VERSION__} · {__BUILD_ID__}</span>
          </div>
          <p className="fig px-4 py-3">{t.settings.license}</p>
        </Section>
      </div>
    </div>
  )
}
