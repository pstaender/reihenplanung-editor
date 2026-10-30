import { applyRemote, getState, onLocalChange, saveSettings, setSyncStatus } from './store'
import type { Series } from './types'

function endpoint(path: string) {
  return getState().settings.serverUrl.replace(/\/+$/, '') + path
}

async function request<T>(path: string, init: RequestInit = {}, token = getState().settings.token): Promise<T> {
  const res = await fetch(endpoint(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  return body as T
}

export const isConfigured = () => {
  const { serverUrl, token } = getState().settings
  return Boolean(serverUrl && token)
}

export async function testConnection(serverUrl: string, token: string): Promise<string> {
  const res = await fetch(serverUrl.replace(/\/+$/, '') + '/me', { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  return body.email
}

let running: Promise<void> | null = null

export function syncNow(): Promise<void> {
  if (!isConfigured()) return Promise.resolve()
  running ??= doSync().finally(() => (running = null))
  return running
}

async function doSync() {
  setSyncStatus({ state: 'syncing' })
  try {
    const { settings, series } = getState()
    const dirty = [...series.values()].filter((s) => s._dirty).map(({ _dirty, ...rest }) => rest)
    const result = await request<{ revision: number; series: Series[] }>('/sync', {
      method: 'POST',
      body: JSON.stringify({ since: settings.revision, series: dirty }),
    })
    applyRemote(result.series)
    saveSettings({ revision: result.revision, lastSyncAt: Date.now() })
    setSyncStatus({ state: 'ok' })
  } catch (error) {
    setSyncStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}

/** Automatischer Sync: nach Änderungen (entprellt), beim Fokussieren, wenn wieder online und periodisch. */
export function startAutoSync() {
  let timer: number | undefined
  const schedule = (delay: number) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => getState().settings.autoSync && void syncNow(), delay)
  }
  onLocalChange(() => schedule(2000))
  window.addEventListener('focus', () => schedule(0))
  window.addEventListener('online', () => schedule(0))
  window.setInterval(() => schedule(0), 60_000)
  schedule(0)
}
