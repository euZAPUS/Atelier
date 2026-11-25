import { useEffect } from 'react'
import { Route, Router, Switch, useLocation } from 'wouter'
import { useT } from './i18n'
import { applyTheme, useSettings } from './lib/settings'
import { resumePending } from './features/capture/store'
import { Capture } from './pages/Capture'
import { GarmentDetail } from './pages/GarmentDetail'
import { Kit } from './pages/Kit'
import { Washer } from './pages/Washer'
import { Onboarding, onboarded } from './pages/Onboarding'
import { Placeholder } from './pages/Placeholder'
import { Settings } from './pages/Settings'
import { Wardrobe } from './pages/Wardrobe'
import { TabBar } from './ui/TabBar'
import { Toaster } from './ui/Toast'
import { UpdatePrompt } from './ui/UpdatePrompt'

// Primera vez: introducción (dentro del Router para respetar la ruta base)
function FirstRun() {
  const [, navigate] = useLocation()
  useEffect(() => { if (!onboarded()) navigate('/bienvenida', { replace: true }) }, [navigate])
  return null
}

export function App() {
  const t = useT()
  const { theme, lang } = useSettings()

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  // Prendas guardadas mientras el recorte seguía en marcha y la app se cerró
  useEffect(() => { resumePending() }, [])

  return (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
    <FirstRun />
    <div className="mx-auto max-w-xl">
      {/* Franja bajo la barra de estado: el contenido pasa por debajo sin chocar con la hora */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-bg/85 backdrop-blur-xl" style={{ height: 'env(safe-area-inset-top)' }} />
      <Switch>
        <Route path="/"><Wardrobe /></Route>
        <Route path="/bienvenida"><Onboarding /></Route>
        <Route path="/nueva"><Capture /></Route>
        <Route path="/lavadora"><Washer /></Route>
        <Route path="/prenda/:id">{(p) => <GarmentDetail key={p.id} id={p.id} />}</Route>
        <Route path="/outfits"><Placeholder title={t.outfits.title} body={t.outfits.soon} icon="outfit" /></Route>
        <Route path="/semana"><Placeholder title={t.week.title} body={t.week.soon} icon="calendar" /></Route>
        <Route path="/ajustes"><Settings /></Route>
        <Route path="/kit"><Kit /></Route>
        <Route><Wardrobe /></Route>
      </Switch>
      <TabBar />
      <UpdatePrompt />
      <Toaster />
    </div>
    </Router>
  )
}
