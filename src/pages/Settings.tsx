import { useEffect, useState, type ReactNode } from 'react'
import { fmt, useT } from '../i18n'
import { aiPing } from '../lib/ai'
import { bgDevice, modelCached, onBgProgress, warmUp, type BgDevice } from '../lib/bg'
import { TLink, useNav } from '../lib/nav'
import { updateSettings, useSettings } from '../lib/settings'
import { formatBytes, requestPersist, storageInfo } from '../lib/storage'
import { Icon, type IconName } from '../ui/Icon'
import { PageHeader } from '../ui/PageHeader'
import { Toggle } from '../ui/Toggle'

function Section({ label, footer, children }: { label: string; footer?: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="section-label mb-2 px-1">{label}</h2>
      <div className="group">{children}</div>
      {footer && <p className="mt-2 px-1 text-[0.8125rem] leading-relaxed text-muted">{footer}</p>}
    </section>
  )
}

/** Fila con icono en cuadrado gris, como en Ajustes de iOS */
function Row({ icon, label, value, children, onClick }: { icon?: IconName; label: string; value?: ReactNode; children?: ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      {icon && <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-surface-2"><Icon name={icon} size={18} strokeWidth={1.7} /></span>}
      <span className="flex-1 text-[0.9375rem]">{label}</span>
      {value !== undefined && <span className="text-[0.9375rem] text-muted">{value}</span>}
      {children}
    </>
  )
  const cls = 'flex min-h-13 w-full items-center gap-3 px-4 py-2 text-left'
  return onClick ? <button onClick={onClick} className={`press ${cls}`}>{inner}</button> : <div className={cls}>{inner}</div>
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-[10px] bg-surface-2 p-0.5">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={`press h-8 flex-1 rounded-[8px] px-3 text-[0.8125rem] font-medium ${value === o.id ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(0_0_0/.15)]' : 'text-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function AiSection() {
  const t = useT()
  const s = useSettings()
  const ai = s.ai ?? { enabled: false, url: '' }
  const [test, setTest] = useState<'ok' | 'auth' | 'unreachable' | 'testing' | null>(null)
  const save = (patch: Partial<typeof ai>) => updateSettings({ ai: { ...ai, ...patch } })
  const input = 'w-full min-w-0 bg-transparent text-right text-[0.9375rem] text-muted outline-none placeholder:text-faint'
  return (
    <Section label={t.settings.ai} footer={t.settings.aiBody}>
      <Row icon="sparkle" label={t.settings.aiEnable}><Toggle checked={ai.enabled} label={t.settings.aiEnable} onChange={(enabled) => save({ enabled })} /></Row>
      <Row label={t.settings.aiUrl}>
        <input key={`u${ai.url}`} defaultValue={ai.url} placeholder="https://…workers.dev" inputMode="url" autoCapitalize="off" autoCorrect="off"
          onBlur={(e) => e.target.value.trim() !== ai.url && save({ url: e.target.value.trim() })} className={`${input} max-w-[60%]`} />
      </Row>
      <Row label={t.settings.aiKey}>
        <input key={`k${ai.key}`} defaultValue={ai.key} type="password" placeholder="—" autoCapitalize="off" autoCorrect="off"
          onBlur={(e) => e.target.value !== (ai.key ?? '') && save({ key: e.target.value || undefined })} className={`${input} max-w-[55%]`} />
      </Row>
      <Row label={t.settings.aiTest} onClick={ai.url ? async () => { setTest('testing'); setTest(await aiPing(ai.url, ai.key)) } : undefined}
        value={test === 'testing' ? '…' : test === 'ok' ? <span className="text-clean">{t.settings.aiOk}</span> : test === 'auth' ? <span className="text-dirty">{t.settings.aiAuth}</span> : test === 'unreachable' ? <span className="text-dirty">{t.settings.aiUnreachable}</span> : undefined}>
        {!test && <Icon name="chevron" size={16} className="text-faint" />}
      </Row>
    </Section>
  )
}

function CutoutSection() {
  const t = useT()
  const [device, setDevice] = useState<BgDevice>()
  const [model, setModel] = useState<{ cached: boolean; bytes: number }>()
  const [progress, setProgress] = useState<number | null>(null)
  useEffect(() => { bgDevice().then(setDevice); modelCached().then(setModel) }, [])
  useEffect(() => onBgProgress((p) => p.phase === 'download' && setProgress(p.ratio)), [])
  const download = async () => {
    setProgress(0)
    try { await warmUp() } finally { setProgress(null); setModel(await modelCached()) }
  }
  return (
    <Section label={t.settings.cutout} footer={t.settings.cutoutBody}>
      <Row icon="scan" label={t.settings.engine} value={device === 'gpu' ? 'WebGPU' : device === 'cpu' ? 'CPU' : '…'} />
      <Row icon={model?.cached ? 'check' : 'bolt'} label={model?.cached ? t.settings.modelReady : fmt(t.settings.modelMissing, { size: formatBytes(model?.bytes ?? 0) })}
        onClick={model && !model.cached && progress === null ? download : undefined}
        value={progress !== null ? fmt(t.settings.downloading, { p: Math.round(progress * 100) }) : model && !model.cached ? t.settings.download : undefined} />
    </Section>
  )
}

export function Settings() {
  const t = useT()
  const go = useNav()
  const s = useSettings()
  const [info, setInfo] = useState<Awaited<ReturnType<typeof storageInfo>>>()
  useEffect(() => { storageInfo().then(setInfo) }, [])

  return (
    <div className="pb-tab">
      <PageHeader title={t.settings.title} />
      <div className="page-in px-4">
        <Section label={t.settings.appearance}>
          <div className="space-y-2 px-4 py-3">
            <span className="text-[0.9375rem]">{t.settings.theme}</span>
            <Segmented value={s.theme} onChange={(theme) => updateSettings({ theme })} options={[
              { id: 'system', label: t.settings.themes.system }, { id: 'light', label: t.settings.themes.light }, { id: 'dark', label: t.settings.themes.dark },
            ]} />
          </div>
          <div className="space-y-2 px-4 py-3">
            <span className="text-[0.9375rem]">{t.settings.language}</span>
            <Segmented value={s.lang} onChange={(lang) => updateSettings({ lang })} options={[{ id: 'es', label: 'Español' }, { id: 'en', label: 'English' }]} />
          </div>
        </Section>

        <AiSection />
        <CutoutSection />

        <Section label={t.settings.storage} footer={info?.persisted ? undefined : t.settings.notPersisted}>
          <Row icon="archive" label={info?.persisted ? t.settings.persisted : t.settings.requestPersist}
            onClick={info && !info.persisted ? async () => { await requestPersist(); setInfo(await storageInfo()) } : undefined}
            value={info?.supported ? formatBytes(info.usage) : undefined} />
        </Section>

        <Section label={t.settings.about}>
          <Row icon="info" label={t.settings.intro} onClick={() => go('/bienvenida')}><Icon name="chevron" size={16} className="text-faint" /></Row>
          <TLink href="/kit" className="block"><Row icon="ruler" label={t.settings.designKit}><Icon name="chevron" size={16} className="text-faint" /></Row></TLink>
          <Row icon="tag" label={t.settings.version} value={`${__APP_VERSION__} · ${__BUILD_ID__}`} />
        </Section>
        <p className="pb-4 text-center text-[0.8125rem] text-faint">{t.settings.license}</p>
      </div>
    </div>
  )
}
