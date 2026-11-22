import { useEffect, useState, type ReactNode } from 'react'
import { TLink } from '../lib/nav'
import { fmt, useT } from '../i18n'
import { updateSettings, useSettings } from '../lib/settings'
import { formatBytes, requestPersist, storageInfo } from '../lib/storage'
import { bgDevice, modelCached, onBgProgress, warmUp, type BgDevice } from '../lib/bg'
import { loadTimings, secs } from '../lib/metrics'
import { Button } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'
import { PageHeader } from '../ui/PageHeader'

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="display mb-2 text-3xl">{label}</h2>
      <div className="divide-y divide-line-soft border-y-2 border-ink">{children}</div>
    </section>
  )
}

function CutoutSection() {
  const t = useT()
  const [device, setDevice] = useState<BgDevice>()
  const [model, setModel] = useState<{ cached: boolean; bytes: number }>()
  const [progress, setProgress] = useState<number | null>(null)
  const timings = loadTimings()
  useEffect(() => { bgDevice().then(setDevice); modelCached().then(setModel) }, [])
  useEffect(() => onBgProgress((p) => p.phase === 'download' && setProgress(p.ratio)), [])
  const download = async () => {
    setProgress(0)
    try { await warmUp() } finally { setProgress(null); setModel(await modelCached()) }
  }
  const avg = timings.length ? timings.reduce((a, x) => a + x.toSave, 0) / timings.length : 0
  return (
    <Section label={t.settings.cutout}>
      <div className="space-y-3 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold uppercase">{t.settings.engine}</span>
          <span className="tag text-muted">ISNet · {device === 'gpu' ? 'WebGPU' : device === 'cpu' ? 'CPU (WASM)' : '…'}</span>
        </div>
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${model?.cached ? 'bg-clean' : 'bg-worn'}`} />
          <p className="text-sm font-medium">{model?.cached ? t.settings.modelReady : fmt(t.settings.modelMissing, { size: formatBytes(model?.bytes ?? 0) })}</p>
        </div>
        {model && !model.cached && (
          <Button block icon="bolt" disabled={progress !== null} onClick={download}>
            {progress !== null ? fmt(t.settings.downloading, { p: Math.round(progress * 100) }) : t.settings.download}
          </Button>
        )}
      </div>
      <div className="py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold uppercase">{t.settings.timings}</span>
          {timings.length > 0 && <span className={`display text-3xl ${avg > 10000 ? 'text-dirty' : ''}`}>{t.settings.avg} {secs(avg)} s</span>}
        </div>
        <p className="tag mt-1 text-muted">{t.settings.target}</p>
        {timings.length === 0 ? <p className="mt-3 text-sm text-muted">{t.settings.timingsEmpty}</p> : (
          <table className="mt-3 w-full font-mono text-xs tabular-nums">
            <thead className="text-muted"><tr className="text-left">
              <th className="py-1 font-normal">#</th><th className="font-normal">{t.settings.cameraCol}</th>
              <th className="font-normal">{t.settings.totalCol}</th><th className="font-normal">{t.settings.cutCol}</th><th />
            </tr></thead>
            <tbody>
              {timings.slice(0, 10).map((x, i) => (
                <tr key={x.at} className="border-t border-line-soft">
                  <td className="py-1.5 text-muted">{timings.length - i}</td>
                  <td>{secs(x.camera)} s</td>
                  <td className={`font-bold ${x.toSave > 10000 ? 'text-dirty' : ''}`}>{secs(x.toSave)} s</td>
                  <td>{secs(x.cutout)} s · {x.device}</td>
                  <td className="text-right text-muted">{x.firstRun ? t.settings.firstRun : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Section>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: IconName }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full border-2 border-ink p-1">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={`press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold uppercase ${value === o.id ? 'bg-ink text-bg' : 'text-muted'}`}>
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
      <PageHeader code="05 / SETTINGS" title={t.settings.title} />
      <div className="px-4 pt-4">
        <Section label={t.settings.appearance}>
          <div className="space-y-2 py-4">
            <span className="tag text-muted">{t.settings.theme}</span>
            <Segmented value={s.theme} onChange={(theme) => updateSettings({ theme })} options={[
              { id: 'system', label: t.settings.themes.system, icon: 'auto' },
              { id: 'light', label: t.settings.themes.light, icon: 'sun' },
              { id: 'dark', label: t.settings.themes.dark, icon: 'moon' },
            ]} />
          </div>
          <div className="space-y-2 py-4">
            <span className="tag text-muted">{t.settings.language}</span>
            <Segmented value={s.lang} onChange={(lang) => updateSettings({ lang })} options={[
              { id: 'es', label: 'Español' }, { id: 'en', label: 'English' },
            ]} />
          </div>
        </Section>

        <CutoutSection />

        <Section label={t.settings.storage}>
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${info?.persisted ? 'bg-clean' : 'bg-worn'}`} />
              <div className="text-sm">
                <p className="font-medium">{info?.persisted ? t.settings.persisted : t.settings.notPersisted}</p>
                {info?.supported && <p className="tag mt-1 text-muted">{fmt(t.settings.used, { used: formatBytes(info.usage) })}</p>}
              </div>
            </div>
            {info && !info.persisted && (
              <Button block onClick={async () => { await requestPersist(); setInfo(await storageInfo()) }}>{t.settings.requestPersist}</Button>
            )}
          </div>
        </Section>

        <Section label={t.settings.about}>
          <TLink href="/kit" className="press flex min-h-14 items-center justify-between">
            <span className="flex items-center gap-3 text-sm font-bold uppercase"><Icon name="ruler" size={20} />{t.settings.designKit}</span>
            <Icon name="chevron" size={18} className="text-muted" />
          </TLink>
          <div className="flex min-h-14 items-center justify-between text-sm">
            <span className="font-bold uppercase">{t.settings.version}</span><span className="tag text-muted">{__APP_VERSION__} · {__BUILD_ID__}</span>
          </div>
          <p className="tag py-4 text-muted">{t.settings.license}</p>
        </Section>
      </div>
    </div>
  )
}
