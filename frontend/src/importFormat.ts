import { STATES } from './holidays'
import { DEFAULT_COLUMNS, newColumn } from './store'
import type { Column, HolidayEntry, Row, Series, Unit } from './types'
import { uuid } from './uuid'

/*
 * Import und Export im Dateiformat aus docs/format.md.
 * Im Dateiformat werden Spalten über ihren Namen angesprochen, intern über IDs.
 */

/** Kennung und Version des Dateiformats – zusammen ein Zuordnungshinweis für die Datei. */
export const FILE_APP = 'pstaender/reihenplanung'
export const FILE_VERSION = 1

const UNITS: Unit[] = ['week', 'day', 'lesson']
const DATE = /^\d{4}-\d{2}-\d{2}$/
const COLOR = /^#[0-9a-f]{6}$/i

type FileCells = Record<string, string>
type FileColumn = string | { title: string; hidden?: boolean; hiddenInPrint?: boolean }
type FileRow = { label?: string; date?: string; bg?: string; fg?: string; cells: FileCells }

export function exportFile(series: Series[]) {
  return {
    app: FILE_APP,
    version: FILE_VERSION,
    series: series.map((s) => {
      const cells = (c: Record<string, string>): FileCells =>
        Object.fromEntries(s.columns.flatMap((col) => (c[col.id] ? [[col.title, c[col.id]]] : [])))
      return {
        id: s.id,
        name: s.name,
        course: s.course,
        startDate: s.startDate,
        unit: s.unit,
        weekdays: s.weekdays,
        state: s.state,
        columns: s.columns.map(
          ({ title, hidden, hiddenInPrint }): FileColumn =>
            hidden || hiddenInPrint ? { title, ...(hidden ? { hidden } : {}), ...(hiddenInPrint ? { hiddenInPrint } : {}) } : title,
        ),
        rows: s.rows.map(
          (r): FileRow => ({
            ...(r.label ? { label: r.label } : {}),
            ...(r.date ? { date: r.date } : {}),
            ...(r.bg ? { bg: r.bg } : {}),
            ...(r.fg ? { fg: r.fg } : {}),
            cells: cells(r.cells),
          }),
        ),
        holidays: Object.fromEntries(Object.entries(s.holidays).map(([key, h]) => [key, { label: h.label ?? '', cells: cells(h.cells) }])),
      }
    }),
  }
}

/** Prüft eine Importdatei und wandelt sie in Reihen um. Wirft bei Fehlern eine verständliche Meldung. */
export function parseImport(data: unknown): Series[] {
  if (!isObject(data)) throw new Error('Erwartet wird ein JSON-Objekt.')
  if (data.app !== FILE_APP) throw new Error(`Keine Reihenplanungs-Datei: "app" muss "${FILE_APP}" sein.`)
  if (data.version !== FILE_VERSION) throw new Error(`Nicht unterstützte Formatversion ${JSON.stringify(data.version)} (erwartet: ${FILE_VERSION}).`)
  if (!Array.isArray(data.series)) throw new Error('"series" muss eine Liste von Reihen sein.')
  return data.series.map((raw, index) => {
    const label = isObject(raw) && typeof raw.name === 'string' ? `„${raw.name}“` : `Reihe ${index + 1}`
    try {
      return toSeries(raw)
    } catch (error) {
      throw new Error(`${label}: ${error instanceof Error ? error.message : error}`)
    }
  })
}

function toSeries(raw: unknown): Series {
  if (!isObject(raw)) throw new Error('Reihe muss ein Objekt sein')
  const { name, startDate, unit, state = '', rows } = raw

  if (typeof name !== 'string' || !name.trim()) throw new Error('"name" fehlt')
  if (typeof startDate !== 'string' || !DATE.test(startDate)) throw new Error('"startDate" fehlt oder ist nicht im Format JJJJ-MM-TT')
  if (!UNITS.includes(unit as Unit)) throw new Error(`"unit" muss "week", "day" oder "lesson" sein`)
  if (typeof state !== 'string' || (state && !STATES.some((s) => s.slug === state))) throw new Error(`unbekanntes Bundesland "${state}"`)
  if (!Array.isArray(rows)) throw new Error('"rows" muss eine Liste sein')

  const rawColumns = raw.columns ?? DEFAULT_COLUMNS
  if (!Array.isArray(rawColumns)) throw new Error('"columns" muss eine Liste sein')
  const columns: Column[] = rawColumns.map(toColumn)
  if (new Set(columns.map((c) => c.title)).size !== columns.length) throw new Error('Spaltennamen in "columns" müssen eindeutig sein')

  const cells = (value: unknown, where: string): Record<string, string> => {
    if (!isObject(value)) throw new Error(`${where}: "cells" muss ein Objekt sein`)
    return Object.fromEntries(
      Object.entries(value).map(([key, content]) => {
        const column = columns.find((c) => c.title === key)
        if (!column) throw new Error(`${where}: Spalte "${key}" steht nicht in "columns"`)
        if (typeof content !== 'string') throw new Error(`${where}: Inhalt von "${key}" muss Text sein`)
        return [column.id, content]
      }),
    )
  }

  const toRow = (value: unknown, index: number): Row => {
    const where = `Zeile ${index + 1}`
    if (!isObject(value)) throw new Error(`${where} muss ein Objekt sein`)
    const { label = '', date, bg, fg } = value
    if (typeof label !== 'string') throw new Error(`${where}: "label" muss Text sein`)
    if (date !== undefined && (typeof date !== 'string' || !DATE.test(date))) throw new Error(`${where}: "date" ist nicht im Format JJJJ-MM-TT`)
    if (bg !== undefined && (typeof bg !== 'string' || !COLOR.test(bg))) throw new Error(`${where}: "bg" muss eine Farbe wie #fbeeee sein`)
    if (fg !== undefined && (typeof fg !== 'string' || !COLOR.test(fg))) throw new Error(`${where}: "fg" muss eine Farbe wie #111111 sein`)
    return { id: uuid(), label, date, bg, fg, cells: cells(value.cells, where) }
  }

  const holidays: Record<string, HolidayEntry> = {}
  if (raw.holidays !== undefined) {
    if (!isObject(raw.holidays)) throw new Error('"holidays" muss ein Objekt sein')
    for (const [key, entry] of Object.entries(raw.holidays)) {
      if (!DATE.test(key)) throw new Error(`"holidays": Schlüssel "${key}" ist kein Datum`)
      const { label, cells: entryCells } = toRow(entry, 0)
      holidays[key] = { label, cells: entryCells }
    }
  }

  const weekdays = raw.weekdays ?? []
  if (!Array.isArray(weekdays) || !weekdays.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) {
    throw new Error('"weekdays" muss eine Liste von Zahlen zwischen 1 und 7 sein')
  }

  const now = Date.now()
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uuid(),
    name: name.trim(),
    course: typeof raw.course === 'string' ? raw.course : '',
    startDate,
    unit: unit as Unit,
    weekdays,
    state,
    columns,
    rows: rows.map(toRow),
    holidays,
    createdAt: now,
    updatedAt: now,
  }
}

/** Spalte als Text ("Thema") oder Objekt ({ "title": "Notizen", "hiddenInPrint": true }) */
function toColumn(value: unknown, index: number): Column {
  if (typeof value === 'string') return newColumn(value)
  const where = `Spalte ${index + 1}`
  if (!isObject(value) || typeof value.title !== 'string') throw new Error(`${where}: Text oder Objekt mit "title" erwartet`)
  const { title, hidden, hiddenInPrint } = value
  if (hidden !== undefined && typeof hidden !== 'boolean') throw new Error(`${where}: "hidden" muss true oder false sein`)
  if (hiddenInPrint !== undefined && typeof hiddenInPrint !== 'boolean') throw new Error(`${where}: "hiddenInPrint" muss true oder false sein`)
  return { ...newColumn(title), ...(hidden ? { hidden } : {}), ...(hiddenInPrint ? { hiddenInPrint } : {}) }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
