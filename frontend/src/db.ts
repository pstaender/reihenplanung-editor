import { openDB, type DBSchema } from 'idb'
import type { HolidayPeriod, StoredSeries, SyncSettings } from './types'

interface PlanningDB extends DBSchema {
  series: { key: string; value: StoredSeries }
  settings: { key: string; value: SyncSettings }
  holidays: { key: string; value: { key: string; fetchedAt: number; periods: HolidayPeriod[] } }
}

const dbPromise = openDB<PlanningDB>('reihenplanung', 1, {
  upgrade(db) {
    db.createObjectStore('series', { keyPath: 'id' })
    db.createObjectStore('settings')
    db.createObjectStore('holidays', { keyPath: 'key' })
  },
})

export const db = {
  allSeries: async () => (await dbPromise).getAll('series'),
  putSeries: async (series: StoredSeries) => (await dbPromise).put('series', series),
  deleteSeries: async (id: string) => (await dbPromise).delete('series', id),

  getSettings: async () => (await dbPromise).get('settings', 'sync'),
  putSettings: async (settings: SyncSettings) => (await dbPromise).put('settings', settings, 'sync'),

  getHolidays: async (key: string) => (await dbPromise).get('holidays', key),
  putHolidays: async (key: string, periods: HolidayPeriod[]) =>
    (await dbPromise).put('holidays', { key, periods, fetchedAt: Date.now() }),
}
