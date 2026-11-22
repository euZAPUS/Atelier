import { useEffect } from 'react'
import { Route, Router, Switch } from 'wouter'
import { useT } from './i18n'
import { applyTheme, useSettings } from './lib/settings'
import { Kit } from './pages/Kit'
import { Placeholder } from './pages/Placeholder'
import { Settings } from './pages/Settings'
import { Wardrobe } from './pages/Wardrobe'
import { TabBar } from './ui/TabBar'
import { UpdatePrompt } from './ui/UpdatePrompt'

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

  return (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
    <div className="mx-auto max-w-xl">
      <Switch>
        <Route path="/"><Wardrobe /></Route>
        <Route path="/nueva"><Placeholder fig="01.N" title={t.add.title} body={t.add.soon} icon="camera" /></Route>
        <Route path="/outfits"><Placeholder fig="02" title={t.outfits.title} body={t.outfits.soon} icon="outfit" /></Route>
        <Route path="/semana"><Placeholder fig="03" title={t.week.title} body={t.week.soon} icon="calendar" /></Route>
        <Route path="/ajustes"><Settings /></Route>
        <Route path="/kit"><Kit /></Route>
        <Route><Wardrobe /></Route>
      </Switch>
      <TabBar />
      <UpdatePrompt />
    </div>
    </Router>
  )
}
