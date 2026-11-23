import { useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { useNav } from '../lib/nav'
import { isStandalone } from '../lib/storage'
import { Button } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'

export const ONBOARDED_KEY = 'atelier:onboarded'
export function onboarded() { try { return localStorage.getItem(ONBOARDED_KEY) === '1' } catch { return true } }

// Ilustración 1: escaparate de prendas
function Shelf() {
  const items: IconName[] = ['hoodie', 'tshirt', 'trousers', 'jacket']
  return (
    <div className="grid w-full max-w-[17rem] grid-cols-2 gap-2.5">
      {items.map((ic, i) => (
        <div key={ic} className="rise" style={{ ['--i' as string]: i }}>
          <div className="grid aspect-[4/5] place-items-center rounded-[14px] bg-tile"><Icon name={ic} size={56} strokeWidth={1} /></div>
          <div className="mt-1.5 h-2 w-3/4 rounded-full bg-line-strong" /><div className="mt-1 h-2 w-1/2 rounded-full bg-line" />
        </div>
      ))}
    </div>
  )
}

// Ilustración 2: de foto cualquiera a foto de producto
function Transform() {
  const t = useT()
  return (
    <div className="flex w-full max-w-[19rem] items-center gap-3">
      <div className="rise relative grid aspect-[3/4] flex-1 -rotate-3 place-items-center rounded-[14px] bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_10px,var(--tile)_10px_20px)]">
        <Icon name="hoodie" size={48} strokeWidth={1} className="rotate-12 opacity-70" />
        <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.6875rem] text-white">{t.onboarding.before}</span>
      </div>
      <Icon name="chevron" size={22} className="text-faint" />
      <div className="rise relative grid aspect-[3/4] flex-1 place-items-center rounded-[14px] bg-tile" style={{ ['--i' as string]: 2 }}>
        <Icon name="hoodie" size={60} strokeWidth={1} />
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[0.6875rem] font-semibold text-black"><Icon name="sparkle" size={11} />IA</span>
      </div>
    </div>
  )
}

// Ilustración 3: estados y semana
function Daily() {
  const t = useT()
  const rows: [IconName, string, 'clean' | 'worn' | 'dirty'][] = [['tshirt', t.categories.tshirts, 'clean'], ['hoodie', t.categories.hoodies, 'worn'], ['trousers', t.categories.trousers, 'dirty']]
  return (
    <div className="group w-full max-w-[19rem]">
      {rows.map(([ic, name, st], i) => (
        <div key={ic} className="rise flex items-center gap-3 px-3 py-2.5" style={{ ['--i' as string]: i }}>
          <span className="grid size-9 place-items-center rounded-[10px] bg-tile"><Icon name={ic} size={20} strokeWidth={1.4} /></span>
          <span className="flex-1 text-[0.9375rem]">{name}</span>
          <span className={`pill pill-${st}`}>{t.status[st]}</span>
        </div>
      ))}
    </div>
  )
}

export function Onboarding() {
  const t = useT()
  const go = useNav()
  const [step, setStep] = useState(0)
  const steps: { art: ReactNode; title: string; body: string }[] = [
    { art: <Shelf />, title: t.onboarding.s1Title, body: t.onboarding.s1Body },
    { art: <Transform />, title: t.onboarding.s2Title, body: t.onboarding.s2Body },
    { art: <Daily />, title: t.onboarding.s3Title, body: t.onboarding.s3Body },
  ]
  const last = step === steps.length - 1
  const finish = () => { try { localStorage.setItem(ONBOARDED_KEY, '1') } catch { /* sin almacenamiento */ } go('/', { replace: true }) }
  const s = steps[step]
  return (
    <div className="flex min-h-dvh flex-col px-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
      <div className="pt-safe flex h-14 items-center justify-between">
        <span className="text-[1.0625rem] font-semibold tracking-tight">Atelier</span>
        {!last && <button onClick={finish} className="press text-[0.9375rem] text-muted">{t.onboarding.skip}</button>}
      </div>
      <div key={step} className="step-in flex flex-1 flex-col">
        <div className="grid flex-1 place-items-center py-6">{s.art}</div>
        <h1 className="title">{s.title}</h1>
        <p className="mt-2 text-[1rem] leading-relaxed text-muted">{s.body}</p>
        {last && !isStandalone() && (
          <div className="card mt-5 flex items-start gap-3 p-4 text-[0.875rem] leading-relaxed">
            <Icon name="info" size={20} strokeWidth={1.7} className="mt-0.5 shrink-0" />
            <span>{t.onboarding.install}</span>
          </div>
        )}
      </div>
      <div className="mt-8 flex items-center gap-1.5">
        {steps.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-ink' : 'w-1.5 bg-line-strong'}`} />)}
      </div>
      <Button variant="primary" block className="mt-5" onClick={() => (last ? finish() : setStep(step + 1))}>{last ? t.onboarding.start : t.onboarding.next}</Button>
    </div>
  )
}
