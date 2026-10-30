import { addDays, formatDate, formatShort, formatWeekday, isoWeek, isoWeekday, mondayOf, parseDate } from './dates'
import type { HolidayMap } from './holidays'
import type { Row, Series } from './types'

export interface Slot {
  /** Stabiler Schlüssel (Datum des Tages bzw. Montag der Woche) */
  key: string
  title: string
  subtitle: string
}

export type DisplayRow =
  | { kind: 'content'; row: Row; index: number; slot: Slot; holidayNames: string[] }
  | { kind: 'holiday'; slot: Slot; holidayNames: string[] }

const MAX_SLOTS = 3000
const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5]

export function effectiveWeekdays(series: Series): number[] {
  return series.weekdays.length ? series.weekdays : DEFAULT_WEEKDAYS
}

function weekSlot(monday: string): Slot {
  const { week } = isoWeek(monday)
  return { key: monday, title: `KW ${week}`, subtitle: `${formatShort(monday)}–${formatDate(addDays(monday, 4))}` }
}

function daySlot(day: string): Slot {
  return { key: day, title: formatWeekday(day), subtitle: formatDate(day) }
}

/** Namen aller Ferien/Feiertage in Mo–Fr einer Woche + ob die ganze Woche frei ist. */
function weekHolidays(monday: string, holidays: HolidayMap) {
  const names: string[] = []
  let freeDays = 0
  for (let i = 0; i < 5; i++) {
    const dayNames = holidays.get(addDays(monday, i))
    if (dayNames) {
      freeDays++
      for (const name of dayNames) if (!names.includes(name)) names.push(name)
    }
  }
  return { names, allFree: freeDays === 5 }
}

/**
 * Berechnet die angezeigten Zeilen.
 *
 * Bei KW/Tagen ist die Ansicht fortlaufend: Inhaltszeilen werden der Reihe nach auf freie
 * Kalenderplätze verteilt, Ferien/Feiertage werden als eigene (graue) Zeilen dazwischen eingefügt.
 * Bei Unterrichtsstunden hat jede Zeile ihr eigenes Datum.
 */
export function buildSchedule(series: Series, holidays: HolidayMap): DisplayRow[] {
  const result: DisplayRow[] = []

  if (series.unit === 'lesson') {
    series.rows.forEach((row, index) => {
      const holidayNames = (row.date && holidays.get(row.date)) || []
      const slot: Slot = row.date
        ? { key: row.id, title: `${index + 1}. Stunde`, subtitle: `${formatWeekday(row.date)}, ${formatDate(row.date)}` }
        : { key: row.id, title: `${index + 1}. Stunde`, subtitle: '' }
      result.push({ kind: 'content', row, index, slot, holidayNames })
    })
    return result
  }

  const weekdays = effectiveWeekdays(series)
  let cursor = series.unit === 'week' ? mondayOf(series.startDate) : series.startDate
  let index = 0

  for (let guard = 0; index < series.rows.length && guard < MAX_SLOTS; guard++) {
    if (series.unit === 'week') {
      const { names, allFree } = weekHolidays(cursor, holidays)
      const slot = weekSlot(cursor)
      if (allFree) result.push({ kind: 'holiday', slot, holidayNames: names })
      else result.push({ kind: 'content', row: series.rows[index], index: index++, slot, holidayNames: names })
      cursor = addDays(cursor, 7)
    } else {
      if (weekdays.includes(isoWeekday(cursor))) {
        const names = holidays.get(cursor)
        const slot = daySlot(cursor)
        if (names) result.push({ kind: 'holiday', slot, holidayNames: names })
        else result.push({ kind: 'content', row: series.rows[index], index: index++, slot, holidayNames: [] })
      }
      cursor = addDays(cursor, 1)
    }
  }
  return result
}

/** Letztes Datum, das die Planung voraussichtlich erreicht (für das Laden der Ferien). */
export function estimateEndYear(series: Series): number {
  const start = parseDate(series.startDate)
  const rows = Math.max(series.rows.length, 1)
  let days: number
  if (series.unit === 'week') days = rows * 7
  else if (series.unit === 'day') days = Math.ceil((rows / effectiveWeekdays(series).length) * 7)
  else {
    const last = series.rows.findLast((r) => r.date)?.date
    days = last ? (parseDate(last).getTime() - start.getTime()) / 86_400_000 : 0
  }
  // Puffer für Ferienwochen, die zusätzlich eingeschoben werden
  start.setDate(start.getDate() + days * 1.3 + 30)
  return start.getFullYear()
}

/** Nächstes Datum für eine neue Stunde: nächster passender Wochentag, der kein Ferientag ist. */
export function nextLessonDate(series: Series, holidays: HolidayMap): string {
  const last = series.rows.findLast((r) => r.date)?.date
  if (!last) return series.startDate
  const weekdays = effectiveWeekdays(series)
  let day = addDays(last, 1)
  for (let i = 0; i < 400; i++, day = addDays(day, 1)) {
    if (weekdays.includes(isoWeekday(day)) && !holidays.has(day)) return day
  }
  return addDays(last, 1)
}
