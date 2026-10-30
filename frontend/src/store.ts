import { useSyncExternalStore } from 'react'
import { db } from './db'
import { today } from './dates'
import type { Column, Row, Series, StoredSeries, SyncSettings } from './types'
import { uuid } from './uuid'

export type SyncStatus = { state: 'idle' | 'syncing' | 'error' | 'ok'; message?: string }

interface State {
  loaded: boolean
  series: Map<string, StoredSeries>
  settings: SyncSettings
  sync: SyncStatus
}

const DEFAULT_SETTINGS: SyncSettings = { serverUrl: '', token: '', autoSync: true, revision: 0 }

let state: State = { loaded: false, series: new Map(), settings: DEFAULT_SETTINGS, sync: { state: 'idle' } }
const listeners = new Set<() => void>()
const changeListeners = new Set<() => void>()

function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export const getState = () => state

/** Wird nach jeder lokalen Änderung aufgerufen (für Auto-Sync). */
export function onLocalChange(listener: () => void) {
  changeListeners.add(listener)
  return () => changeListeners.delete(listener)
}

/** Ergänzt fehlende Felder (z. B. bei Importen oder älteren/fremden Datensätzen). */
function normalize<T extends Partial<Series> & { id: string }>(series: T): T & Series {
  return {
    ...series,
    name: series.name ?? '',
    course: series.course ?? '',
    startDate: series.startDate ?? today(),
    unit: series.unit ?? 'week',
    weekdays: Array.isArray(series.weekdays) ? series.weekdays : [],
    state: series.state ?? '',
    columns: Array.isArray(series.columns) ? series.columns : [],
    rows: Array.isArray(series.rows) ? series.rows.map((r) => ({ ...r, label: r.label ?? '', cells: r.cells ?? {} })) : [],
    holidays: series.holidays ?? {},
    createdAt: series.createdAt ?? Date.now(),
    updatedAt: series.updatedAt ?? 0,
  }
}

export async function loadStore() {
  const [all, settings] = await Promise.all([db.allSeries(), db.getSettings()])
  setState({
    loaded: true,
    series: new Map(all.map((s) => [s.id, normalize(s)])),
    settings: { ...DEFAULT_SETTINGS, ...settings },
  })
}

// ── Reihen ────────────────────────────────────────────────────────────────────

export const DEFAULT_COLUMNS = ['Thema', 'Lernziele', 'Kompetenzerweiterungen', 'Notizen']

export const newRow = (partial: Partial<Row> = {}): Row => ({ id: uuid(), label: '', cells: {}, ...partial })
export const newColumn = (title: string): Column => ({ id: uuid(), title })

export function createSeries(data: Pick<Series, 'name' | 'course' | 'startDate' | 'unit' | 'weekdays' | 'state'>): Series {
  const now = Date.now()
  const series: StoredSeries = {
    id: uuid(),
    ...data,
    columns: DEFAULT_COLUMNS.map(newColumn),
    rows: [newRow(data.unit === 'lesson' ? { date: data.startDate } : {})],
    holidays: {},
    createdAt: now,
    updatedAt: now,
    _dirty: true,
  }
  persist(series)
  return series
}

export function updateSeries(id: string, change: (series: Series) => Series) {
  const current = state.series.get(id)
  if (!current) return
  persist({ ...change(current), id, updatedAt: Date.now(), _dirty: true })
}

export function duplicateSeries(id: string) {
  const source = state.series.get(id)
  if (!source) return
  const now = Date.now()
  const { _rev: _ignored, ...rest } = structuredClone(source)
  persist({ ...rest, id: uuid(), name: `${source.name} (Kopie)`, createdAt: now, updatedAt: now, _dirty: true })
}

export function deleteSeries(id: string) {
  const current = state.series.get(id)
  if (!current) return
  if (!state.settings.serverUrl && current._rev === undefined) {
    // Nie synchronisiert → einfach entfernen
    const series = new Map(state.series)
    series.delete(id)
    setState({ series })
    void db.deleteSeries(id)
    return
  }
  // Tombstone, damit die Löschung synchronisiert wird
  persist({
    id,
    name: current.name,
    course: current.course,
    startDate: current.startDate,
    unit: current.unit,
    weekdays: [],
    state: '',
    columns: [],
    rows: [],
    holidays: {},
    createdAt: current.createdAt,
    updatedAt: Date.now(),
    deleted: true,
    _rev: current._rev,
    _dirty: true,
  })
}

function persist(series: StoredSeries) {
  const map = new Map(state.series)
  map.set(series.id, series)
  setState({ series: map })
  void db.putSeries(series)
  changeListeners.forEach((l) => l())
}

/** Übernimmt Reihen vom Server (ohne Dirty-Flag). Gelöschte werden lokal entfernt. */
export function applyRemote(remote: Series[]) {
  const map = new Map(state.series)
  for (const series of remote) {
    const local = map.get(series.id)
    if (local?._dirty && local.updatedAt > series.updatedAt) continue // lokale Änderung ist neuer
    if (series.deleted) {
      map.delete(series.id)
      void db.deleteSeries(series.id)
    } else {
      const stored: StoredSeries = { ...normalize(series), _dirty: false }
      map.set(series.id, stored)
      void db.putSeries(stored)
    }
  }
  setState({ series: map })
}

export function importSeries(list: Series[]) {
  for (const series of list) {
    if (typeof series?.id !== 'string') continue
    persist({ ...normalize(series), updatedAt: Date.now(), _dirty: true })
  }
}

/** Alle Reihen beim nächsten Sync (erneut) hochladen, ohne ihren Änderungszeitpunkt zu verändern. */
export function markAllDirty() {
  for (const series of state.series.values()) persist({ ...series, _dirty: true })
}

// ── Einstellungen & Sync-Status ───────────────────────────────────────────────

export function saveSettings(patch: Partial<SyncSettings>) {
  const settings = { ...state.settings, ...patch }
  setState({ settings })
  void db.putSettings(settings)
}

export const setSyncStatus = (sync: SyncStatus) => setState({ sync })

export const newSeriesDefaults = () => ({
  name: '',
  course: '',
  startDate: today(),
  unit: 'week' as const,
  weekdays: [] as number[],
  state: '',
})
