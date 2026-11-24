import { useEffect, useState } from 'react'
import type { ColorInfo } from '../db/types'
import { CATEGORIES, typeById, type CategoryId } from '../domain/categories'
import { colorLabel, displayName, typeLabel } from '../domain/naming'
import { CaptureInput } from '../features/capture/CaptureInput'
import { discard, PENDING_COLOR, retryJob, saveJob, startCapture, useJob, type Job } from '../features/capture/store'
import { useT } from '../i18n'
import { onBgProgress, type BgProgress } from '../lib/bg'
import { useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { buttonBase, buttonStyles } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'
import { HeaderPill, NavButton, PageHeader } from '../ui/PageHeader'


function useBgProgress() {
  const [p, setP] = useState<BgProgress | null>(null)
  useEffect(() => onBgProgress(setP), [])
  return p
}

function Intro() {
  const t = useT()
  const [pasteMsg, setPasteMsg] = useState<string | null>(null)
  const paste = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((x) => x.startsWith('image/'))
        if (type) { startCapture(await item.getType(type)); return }
      }
      setPasteMsg(t.capture.pasteEmpty)
    } catch { setPasteMsg(t.capture.pasteEmpty) }
  }
  const tips: [IconName, string][] = [['camera', t.capture.tip1], ['sparkle', t.capture.tip2], ['palette', t.capture.tip3]]
  return (
    <div className="page-in flex flex-1 flex-col px-4">
      <h1 className="title">{t.capture.title}</h1>
      <p className="mt-1 text-[0.9375rem] text-muted">{t.capture.intro}</p>
      <div className="group mt-5">
        {tips.map(([icon, text]) => (
          <div key={text} className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2"><Icon name={icon} size={19} strokeWidth={1.7} /></span>
            <span className="text-[0.9375rem]">{text}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-2 pt-6 pb-4">
        <CaptureInput className={`${buttonBase} ${buttonStyles.primary} w-full`}>
          <Icon name="camera" size={20} strokeWidth={1.8} />{t.capture.camera}
        </CaptureInput>
        <div className="grid grid-cols-2 gap-2">
          <CaptureInput source="gallery" className={`${buttonBase} ${buttonStyles.secondary}`}>
            <Icon name="gallery" size={19} strokeWidth={1.8} />{t.capture.gallery}
          </CaptureInput>
          <button onClick={paste} className={`${buttonBase} ${buttonStyles.secondary}`}>
            <Icon name="paste" size={19} strokeWidth={1.8} />{t.capture.paste}
          </button>
        </div>
        <p className="pt-1 text-center text-[0.8125rem] leading-relaxed text-muted">{pasteMsg ?? t.capture.pasteHint}</p>
      </div>
    </div>
  )
}

function PhotoCard({ job }: { job: Job }) {
  const t = useT()
  const progress = useBgProgress()
  const time = new Date(job.pickedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const status =
    job.status === 'ready' ? (job.aiFallback ? t.capture.fallback[job.aiFallback] : job.aiUsed ? t.capture.readyAi : t.capture.ready)
      : job.status === 'failed' ? t.capture.failed
      : job.phase === 'ai' ? t.capture.aiWorking
      : progress?.phase === 'download' && progress.ratio < 1 ? `${t.capture.downloading} · ${Math.round(progress.ratio * 100)}%`
      : t.capture.removing
  return (
    <div className="card overflow-hidden">
      <div className={`relative h-[40vh] bg-tile ${job.status === 'processing' ? 'processing' : ''}`}>
        <img src={job.previewUrl} alt="" className={`absolute inset-0 size-full object-cover transition-all duration-500 ${job.cutoutUrl ? 'scale-105 opacity-0 blur-md' : ''}`} />
        {job.cutoutUrl && <img src={job.cutoutUrl} alt="" className="reveal product-shadow absolute inset-0 size-full object-contain p-8" />}
        <span className="absolute top-3 left-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-black/55 px-2.5 text-[0.75rem] font-medium text-white backdrop-blur">
          <Icon name="camera" size={14} strokeWidth={1.8} />{t.capture.captured} {time}
        </span>
        {job.aiUsed && (
          <span className="absolute top-3 right-3 inline-flex h-7 items-center gap-1 rounded-full bg-white/90 px-2.5 text-[0.75rem] font-semibold text-black">
            <Icon name="sparkle" size={13} strokeWidth={1.8} />{t.capture.aiBadge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-3 text-[0.875rem]">
        {job.status === 'processing' && <span className="pulse-dot size-2 shrink-0 rounded-full bg-ink" />}
        {job.status === 'ready' && <Icon name="check" size={16} strokeWidth={2.2} className={job.aiFallback ? 'text-worn' : 'text-clean'} />}
        <span className={`min-w-0 flex-1 truncate ${job.status === 'failed' ? 'text-dirty' : 'text-muted'}`}>{status}</span>
        {job.status !== 'processing' && (
          <div className="flex shrink-0 gap-1">
            <button onClick={() => retryJob(true)} className="press inline-flex h-8 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-[0.8125rem] font-medium">
              <Icon name="rotate" size={15} strokeWidth={1.8} />{t.capture.rotate}
            </button>
            <button onClick={() => retryJob(false)} className="press inline-flex h-8 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-[0.8125rem] font-medium">
              <Icon name="refresh" size={15} strokeWidth={1.8} />{t.capture.retry}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ColorRow({ job, value, onChange }: { job: Job; value?: ColorInfo; onChange: (c: ColorInfo) => void }) {
  const t = useT()
  const { lang } = useSettings()
  if (job.status !== 'ready' || !job.palette?.length) return null
  const current = value ?? job.color!
  return (
    <section className="page-in mt-5">
      <h2 className="section-label mb-2 px-1">{t.capture.color}</h2>
      <div className="card flex items-center gap-3 px-4 py-3">
        <div className="flex gap-2">
          {job.palette.map((c) => (
            <button key={c.hex} onClick={() => onChange(c)} aria-label={colorLabel(c.name, lang)}
              className={`press size-8 rounded-full ring-offset-2 ring-offset-surface ${c.hex === current.hex ? 'ring-2 ring-ink' : 'ring-1 ring-line-strong'}`}
              style={{ background: c.hex }} />
          ))}
        </div>
        <span className="ml-auto text-[0.9375rem] font-medium first-letter:uppercase">{colorLabel(current.name, lang)}</span>
      </div>
    </section>
  )
}

function Categories({ onPick, suggested, suggestedType, disabled }: { onPick: (c: CategoryId) => void; suggested?: CategoryId; suggestedType?: string; disabled: boolean }) {
  const t = useT()
  const { lang } = useSettings()
  return (
    <section className="mt-5">
      <h2 className="section-label mb-2 px-1">{t.capture.pickCategory}</h2>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c, i) => {
          const sug = suggested === c.id
          return (
            <button key={c.id} onClick={() => onPick(c.id)} disabled={disabled} style={{ ['--i' as string]: i }}
              className={`rise press relative flex min-h-14 items-center gap-3 rounded-[14px] border px-3.5 text-left text-[0.9375rem] font-medium ${
                sug ? 'border-transparent bg-accent text-accent-ink' : 'border-line bg-surface'
              }`}>
              <Icon name={c.icon as IconName} size={22} strokeWidth={1.6} />
              <span className="leading-tight">{t.categories[c.id]}</span>
              {sug && (
                <span className="ml-auto inline-flex min-w-0 items-center gap-1 text-[0.6875rem] font-semibold opacity-80">
                  <Icon name="sparkle" size={12} className="shrink-0" /><span className="truncate">{typeById(c.id, suggestedType) ? typeLabel(c.id, suggestedType, lang) : t.capture.suggested}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Saved({ job, name }: { job: Job; name: string }) {
  const t = useT()
  const go = useNav()
  return (
    <div className="page-in flex flex-1 flex-col px-4">
      <div className="card overflow-hidden">
        <div className="relative grid h-[44vh] place-items-center bg-tile">
          <img src={job.cutoutUrl ?? job.previewUrl} alt="" className={`reveal max-h-full ${job.cutoutUrl ? 'product-shadow w-3/4 object-contain p-6' : 'size-full object-cover'}`} />
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-clean text-white"><Icon name="check" size={18} strokeWidth={2.4} /></span>
          <div className="min-w-0">
            <p className="truncate text-[1.0625rem] font-semibold">{name}</p>
            <p className="text-[0.875rem] text-muted">{job.status === 'processing' ? t.capture.background : t.capture.saved}</p>
          </div>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-6 pb-4">
        <button onClick={() => { discard(); go('/', { replace: true }) }} className={`${buttonBase} ${buttonStyles.secondary}`}>{t.capture.viewWardrobe}</button>
        <CaptureInput className={`${buttonBase} ${buttonStyles.primary}`}>
          <Icon name="camera" size={20} strokeWidth={1.8} />{t.capture.another}
        </CaptureInput>
      </div>
    </div>
  )
}

export function Capture() {
  const t = useT()
  const go = useNav()
  const { lang } = useSettings()
  const job = useJob()
  const [color, setColor] = useState<ColorInfo>()
  const [savedCat, setSavedCat] = useState<CategoryId>()
  const [saving, setSaving] = useState(false)
  useEffect(() => { setColor(undefined); setSaving(false); setSavedCat(undefined) }, [job?.id])

  const close = () => { discard(); go('/', { replace: true }) }
  const pick = async (c: CategoryId) => {
    if (saving) return
    setSaving(true)
    setSavedCat(c)
    try { await saveJob(c, color) } catch (e) { console.error(e); setSaving(false) }
  }
  const nameFor = (category: CategoryId) => displayName({ name: '', category, type: category === job?.suggested ? job?.suggestedType : undefined, color: color ?? job?.color ?? PENDING_COLOR }, lang)
  const title = !job ? undefined
    : job.status === 'ready' && job.suggested ? nameFor(job.suggested)
    : job.status === 'ready' ? t.capture.readyTitle
    : t.capture.processingTitle

  return (
    <div className="flex min-h-dvh flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <PageHeader
        left={<NavButton icon={job?.savedId ? 'close' : 'back'} label={t.capture.cancel} onClick={close} />}
        center={<HeaderPill icon="scan">{t.capture.pill}</HeaderPill>}
        title={job && !job.savedId ? title : undefined}
      />
      {!job ? <Intro /> : job.savedId ? <Saved job={job} name={nameFor(savedCat ?? job.suggested ?? 'tshirts')} /> : (
        <div className="page-in px-4 pb-8">
          <PhotoCard job={job} />
          <ColorRow job={job} value={color} onChange={setColor} />
          <Categories onPick={pick} suggested={job.suggested} suggestedType={job.suggestedType} disabled={saving} />
        </div>
      )}
    </div>
  )
}
