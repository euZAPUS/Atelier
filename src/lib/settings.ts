import { useLiveQuery } from 'dexie-react-hooks'
import { db, SCHEMA_VERSION } from '../db/db'
import type { Settings } from '../db/types'

// Copia en localStorage del tema e idioma para pintarlos antes de que abra IndexedDB (sin parpadeo).
const BOOT_KEY = 'atelier:boot'

function bootDefaults(): Settings {
  let boot: Partial<Settings> = {}
  try { boot = JSON.parse(localStorage.getItem(BOOT_KEY) ?? '{}') } catch { /* sin almacenamiento */ }
  return {
    id: 'settings',
    theme: boot.theme ?? 'dark', // oscuro por defecto; claro como opción
    lang: boot.lang ?? (navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'),
    washDefaults: {},
    schemaVersion: SCHEMA_VERSION,
  }
}

const fallback = bootDefaults()

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('settings'), []) ?? fallback
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>) {
  const current = (await db.settings.get('settings')) ?? fallback
  const next = { ...current, ...patch }
  await db.settings.put(next)
  try { localStorage.setItem(BOOT_KEY, JSON.stringify({ theme: next.theme, lang: next.lang })) } catch { /* ignore */ }
}

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0a0a' : '#f1f1ee')
}
