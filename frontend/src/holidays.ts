import { useEffect, useState } from 'react'
import { addDays } from './dates'
import { db } from './db'
import type { HolidayPeriod } from './types'

export const STATES: { slug: string; name: string }[] = [
  { slug: 'baden-wuerttemberg', name: 'Baden-Württemberg' },
  { slug: 'bayern', name: 'Bayern' },
  { slug: 'berlin', name: 'Berlin' },
  { slug: 'brandenburg', name: 'Brandenburg' },
  { slug: 'bremen', name: 'Bremen' },
  { slug: 'hamburg', name: 'Hamburg' },
  { slug: 'hessen', name: 'Hessen' },
  { slug: 'mecklenburg-vorpommern', name: 'Mecklenburg-Vorpommern' },
  { slug: 'niedersachsen', name: 'Niedersachsen' },
  { slug: 'nordrhein-westfalen', name: 'Nordrhein-Westfalen' },
  { slug: 'rheinland-pfalz', name: 'Rheinland-Pfalz' },
  { slug: 'saarland', name: 'Saarland' },
  { slug: 'sachsen', name: 'Sachsen' },
  { slug: 'sachsen-anhalt', name: 'Sachsen-Anhalt' },
  { slug: 'schleswig-holstein', name: 'Schleswig-Holstein' },
  { slug: 'thueringen', name: 'Thüringen' },
]

/** Datum (YYYY-MM-DD) → Namen der Ferien/Feiertage an diesem Tag */
export type HolidayMap = Map<string, string[]>

const API = 'https://www.mehr-schulferien.de/api/v2.1/federal-states'
const MAX_AGE = 14 * 24 * 60 * 60 * 1000

async function fetchYear(state: string, year: number): Promise<HolidayPeriod[]> {
  const key = `${state}:${year}`
  const cached = await db.getHolidays(key)
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE) return cached.periods
  try {
    const res = await fetch(`${API}/${state}/periods?start_date=${year}-01-01&end_date=${year}-12-31`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { data } = (await res.json()) as { data: HolidayPeriod[] }
    await db.putHolidays(key, data)
    return data
  } catch (error) {
    // offline: veraltete Daten sind besser als keine
    if (cached) return cached.periods
    throw error
  }
}

const VACATION_NAMES: Record<string, string> = {
  Frühjahr: 'Frühjahrsferien',
  Herbst: 'Herbstferien',
  Ostern: 'Osterferien',
  Pfingsten: 'Pfingstferien',
  'Himmelfahrt/Pfingsten': 'Pfingstferien',
  Himmelfahrt: 'Himmelfahrtsferien',
  Sommer: 'Sommerferien',
  Weihnachten: 'Weihnachtsferien',
  Winter: 'Winterferien',
}

function buildMap(periods: HolidayPeriod[]): HolidayMap {
  const map: HolidayMap = new Map()
  for (const period of periods) {
    const name = period.is_school_vacation ? (VACATION_NAMES[period.name] ?? period.name) : period.name
    for (let day = period.starts_on; day <= period.ends_on; day = addDays(day, 1)) {
      const names = map.get(day) ?? []
      if (!names.includes(name)) names.push(name)
      map.set(day, names)
    }
  }
  return map
}

/** Lädt Ferien & Feiertage für ein Bundesland und die angegebenen Jahre (mit IndexedDB-Cache). */
export function useHolidays(state: string, fromYear: number, toYear: number) {
  const [map, setMap] = useState<HolidayMap>(new Map())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!state) {
      setMap(new Map())
      return
    }
    let cancelled = false
    const years = Array.from({ length: Math.max(1, toYear - fromYear + 1) }, (_, i) => fromYear + i)
    Promise.all(years.map((year) => fetchYear(state, year)))
      .then((lists) => {
        if (cancelled) return
        setMap(buildMap(lists.flat()))
        setError(null)
      })
      .catch((e: unknown) => !cancelled && setError(`Ferien konnten nicht geladen werden (${String(e)})`))
    return () => {
      cancelled = true
    }
  }, [state, fromYear, toYear])

  return { holidays: map, error }
}
