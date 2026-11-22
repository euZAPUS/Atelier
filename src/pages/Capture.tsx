import { useEffect, useState } from 'react'
import type { ColorInfo } from '../db/types'
import { CATEGORIES, type CategoryId } from '../domain/categories'
import { colorLabel } from '../domain/naming'
import { CaptureInput } from '../features/capture/CaptureInput'
import { discard, saveJob, startCapture, useJob, type Job } from '../features/capture/store'
import { fmt, useT } from '../i18n'
import { onBgProgress, type BgProgress } from '../lib/bg'
import { secs } from '../lib/metrics'
import { useNav } from '../lib/nav'
import { useSettings } from '../lib/settings'
import { buttonBase, buttonStyles } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'

// Cronómetro en vivo desde que pulsaste "+": el objetivo son 10 segundos.
function Stopwatch({ job }: { job: Job }) {
  const [now, setNow] = useState(performance.now())
  useEffect(() => {
    if (job.tSaved) return
    const id = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(id)
  }, [job.tSaved])
  const ms = (job.tSaved ?? now) - job.t0
  const over = ms > 10_000
  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${over ? 'text-dirty' : ''}`}>
      {secs(ms)}<span className="opacity-50"> / 10,0 s</span>
    </span>
  )
}

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
  return (
    <div className="page-in flex flex-1 flex-col px-4">
      <h1 className="display slam mt-4 text-[clamp(4.5rem,24vw,7rem)]">{t.capture.title}</h1>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t.capture.intro}</p>
      <div className="mt-auto space-y-2 pb-4">
        <CaptureInput className={`${buttonBase} ${buttonStyles.primary} w-full min-h-20 text-lg`}>
          <Icon name="camera" size={24} strokeWidth={2} />{t.capture.camera}
        </CaptureInput>
        <div className="grid grid-cols-2 gap-2">
          <CaptureInput source="gallery" className={`${buttonBase} ${buttonStyles.line}`}>
            <Icon name="gallery" size={20} strokeWidth={2} />{t.capture.gallery}
          </CaptureInput>
          <button onClick={paste} className={`${buttonBase} ${buttonStyles.line}`}>
            <Icon name="paste" size={20} strokeWidth={2} />{t.capture.paste}
          </button>
        </div>
        <p className="tag pt-1 text-center leading-relaxed text-muted normal-case tracking-normal">{pasteMsg ?? t.capture.pasteHint}</p>
      </div>
    </div>
  )
}

function Stage({ job }: { job: Job }) {
  const t = useT()
  const progress = useBgProgress()
  const label =
    job.status === 'ready' ? t.capture.ready
      : job.status === 'failed' ? t.capture.failed
      : progress?.phase === 'download' && progress.ratio < 1 ? `${t.capture.downloading} · ${Math.round(progress.ratio * 100)}%`
      : t.capture.removing
  return (
    <div>
      <div className="relative mx-4 h-[44vh] overflow-hidden bg-tile">
        {/* La foto original se queda detrás mientras se escanea; luego salta el recorte */}
        <img src={job.previewUrl} alt="" className={`absolute inset-0 size-full object-cover transition-all duration-500 ${job.cutoutUrl ? 'scale-110 opacity-0 blur-md' : ''}`} />
        {job.status === 'processing' && <div className="scan absolute inset-0" />}
        {job.cutoutUrl && (
          <img src={job.cutoutUrl} alt="" className="pop sticker absolute inset-0 size-full object-contain p-6" style={{ viewTransitionName: job.savedId ? `g-${job.savedId}` : undefined }} />
        )}
        <span className="tag absolute top-2 left-2 bg-ink px-1.5 py-0.5 text-bg">{job.status === 'processing' ? 'REC' : 'OK'}</span>
      </div>
      <p className={`tag mx-4 mt-2 ${job.status === 'processing' ? 'blink' : ''} ${job.status === 'failed' ? 'text-dirty normal-case tracking-normal' : 'text-muted'}`}>{label}</p>
    </div>
  )
}

function ColorRow({ job, value, onChange }: { job: Job; value?: ColorInfo; onChange: (c: ColorInfo) => void }) {
  const t = useT()
  const { lang } = useSettings()
  if (job.status !== 'ready' || !job.palette?.length) return null
  const current = value ?? job.color!
  return (
    <div className="page-in mx-4 mt-3 flex items-center gap-3">
      <span className="tag text-muted">{t.capture.color}</span>
      <div className="flex gap-2">
        {job.palette.map((c) => (
          <button key={c.hex} onClick={() => onChange(c)} aria-label={colorLabel(c.name, lang)}
            className={`press size-8 rounded-full ring-offset-2 ring-offset-bg ${c.hex === current.hex ? 'ring-2 ring-ink' : 'ring-1 ring-line-soft'}`}
            style={{ background: c.hex }} />
        ))}
      </div>
      <span className="text-sm font-bold uppercase">{colorLabel(current.name, lang)}</span>
    </div>
  )
}

const ICON: Record<CategoryId, IconName> = {
  tshirts: 'tshirt', longsleeves: 'longsleeve', hoodies: 'hoodie', jackets: 'jacket', trousers: 'trousers', footwear: 'shoe', accessories: 'cap',
}

function Categories({ onPick }: { onPick: (c: CategoryId) => void }) {
  const t = useT()
  return (
    <div className="mx-4 mt-4">
      <p className="tag mb-2 text-muted">{t.capture.pickCategory}</p>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c, i) => (
          <button key={c.id} onClick={() => onPick(c.id)} style={{ ['--i' as string]: i }}
            className={`rise press flex min-h-16 items-center gap-3 border-2 border-ink bg-surface px-4 text-left font-extrabold uppercase active:bg-accent ${i === CATEGORIES.length - 1 ? 'col-span-2' : ''}`}>
            <Icon name={ICON[c.id]} size={26} strokeWidth={1.7} />
            <span className="text-[0.95rem] leading-tight">{t.categories[c.id]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Saved({ job }: { job: Job }) {
  const t = useT()
  const go = useNav()
  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="relative mt-2 grid flex-1 place-items-center overflow-hidden bg-accent">
        <span className="display slam pointer-events-none absolute inset-x-0 top-6 text-center text-[clamp(4.5rem,25vw,8rem)] text-accent-ink">{t.capture.saved}</span>
        <img src={job.cutoutUrl ?? job.previewUrl} alt=""
          className={`pop relative max-h-[38vh] w-3/4 object-contain ${job.cutoutUrl ? 'sticker' : 'border-4 border-white'}`} style={{ animationDelay: '.12s' }} />
        <span className="display-wide absolute bottom-4 text-2xl text-accent-ink">{fmt(t.capture.savedIn, { s: secs(job.tSaved! - job.t0) })}</span>
      </div>
      {job.status === 'processing' && <p className="tag mt-2 text-muted">{t.capture.background}</p>}
      <div className="grid grid-cols-2 gap-2 py-4">
        <button onClick={() => { discard(); go('/', { replace: true }) }} className={`${buttonBase} ${buttonStyles.line}`}>{t.capture.viewWardrobe}</button>
        <CaptureInput className={`${buttonBase} ${buttonStyles.ink}`}>
          <Icon name="camera" size={20} strokeWidth={2} />{t.capture.another}
        </CaptureInput>
      </div>
    </div>
  )
}

export function Capture() {
  const t = useT()
  const go = useNav()
  const job = useJob()
  const [color, setColor] = useState<ColorInfo>()
  const [saving, setSaving] = useState(false)
  useEffect(() => { setColor(undefined); setSaving(false) }, [job?.id])

  const close = () => { discard(); go('/', { replace: true }) }
  const pick = async (c: CategoryId) => {
    if (saving) return
    setSaving(true)
    try { await saveJob(c, color) } catch (e) { console.error(e); setSaving(false) }
  }

  return (
    <div className="flex min-h-dvh flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <header className="pt-safe flex items-center justify-between px-2 pb-2">
        <button onClick={close} aria-label={t.capture.cancel} className="press grid size-12 place-items-center"><Icon name="close" size={26} strokeWidth={2} /></button>
        <span className="tag text-muted">02 / NEW</span>
        <div className="grid min-w-12 place-items-center px-2">{job && <Stopwatch job={job} />}</div>
      </header>
      {!job ? <Intro /> : job.savedId ? <Saved job={job} /> : (
        <div className="page-in pb-6">
          <Stage job={job} />
          <ColorRow job={job} value={color} onChange={setColor} />
          <Categories onPick={pick} />
        </div>
      )}
    </div>
  )
}
