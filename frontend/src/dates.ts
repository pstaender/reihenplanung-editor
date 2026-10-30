/** Datumshilfen – alle Daten als lokale Kalendertage im Format YYYY-MM-DD. */

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function today(): string {
  return toIso(new Date())
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag */
export function isoWeekday(iso: string): number {
  return parseDate(iso).getDay() || 7
}

export function mondayOf(iso: string): string {
  return addDays(iso, 1 - isoWeekday(iso))
}

export function isoWeek(iso: string): { week: number; year: number } {
  const date = parseDate(iso)
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1, 12)
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { week, year: date.getFullYear() }
}

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
const shortFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })

export const formatDate = (iso: string) => dateFormat.format(parseDate(iso))
export const formatShort = (iso: string) => shortFormat.format(parseDate(iso))
export const formatWeekday = (iso: string) => weekdayFormat.format(parseDate(iso)).replace('.', '')

export const WEEKDAYS = [
  { value: 1, short: 'Mo', long: 'Montag' },
  { value: 2, short: 'Di', long: 'Dienstag' },
  { value: 3, short: 'Mi', long: 'Mittwoch' },
  { value: 4, short: 'Do', long: 'Donnerstag' },
  { value: 5, short: 'Fr', long: 'Freitag' },
  { value: 6, short: 'Sa', long: 'Samstag' },
]
