// iOS puede borrar los datos de una web si no se usan. Instalada en la pantalla de inicio
// y con persist() concedido, deja de hacerlo. Aun así: copia de seguridad (fase 5).
export async function storageInfo() {
  const s = navigator.storage
  if (!s) return { persisted: false, usage: 0, quota: 0, supported: false }
  const [persisted, est] = await Promise.all([s.persisted?.() ?? false, s.estimate?.() ?? {}])
  return { persisted, usage: est.usage ?? 0, quota: est.quota ?? 0, supported: true }
}

export async function requestPersist(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
}

export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}
