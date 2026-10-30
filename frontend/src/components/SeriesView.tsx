import { useEffect, useMemo, useState } from 'react'
import { formatDate, parseDate } from '../dates'
import { STATES, useHolidays } from '../holidays'
import { href } from '../router'
import { buildSchedule, estimateEndYear, nextLessonDate, type DisplayRow } from '../schedule'
import { newRow, updateSeries, useStore } from '../store'
import type { Column, HolidayEntry, Row, Series } from '../types'
import { uuid } from '../uuid'
import { IconArrowDown, IconArrowUp, IconBack, IconColumns, IconCopy, IconDelete, IconEdit, IconPlus, IconPrint, IconSettings } from '../icons'
import { ColumnsDialog } from './ColumnsDialog'
import { EditableCell, InlineText } from './EditableCell'
import { RowDialog } from './RowDialog'
import { SeriesForm } from './SeriesForm'
import { describeStart, UNIT_LABELS } from './SeriesList'

type Editing = { kind: 'row'; id: string } | { kind: 'holiday'; key: string; title: string } | null

const FIRST_COLUMN = { week: 'KW', day: 'Tag', lesson: 'Stunde' } as const

export function SeriesView({ id }: { id: string }) {
  const series = useStore((s) => s.series.get(id))
  const loaded = useStore((s) => s.loaded)
  const [dialog, setDialog] = useState<'settings' | 'columns' | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const startYear = series ? parseDate(series.startDate).getFullYear() : 0
  const { holidays, error: holidayError } = useHolidays(series?.state ?? '', startYear, series ? estimateEndYear(series) : 0)
  const schedule = useMemo(() => (series ? buildSchedule(series, holidays) : []), [series, holidays])

  // Querformat beim Drucken (siehe minimax-din-a4.css: body.landscape)
  useEffect(() => {
    document.body.classList.add('landscape')
    return () => document.body.classList.remove('landscape')
  }, [])

  useEffect(() => {
    if (series) document.title = `${series.name} – Reihenplanung`
    return () => void (document.title = 'Reihenplanung')
  }, [series?.name])

  if (!loaded) return null
  if (!series || series.deleted) {
    return (
      <p>
        Reihe nicht gefunden. <a href={href.list()}>Zur Übersicht</a>
      </p>
    )
  }

  const update = (change: (s: Series) => Series) => updateSeries(id, change)
  const updateRow = (rowId: string, change: (r: Row) => Row) =>
    update((s) => ({ ...s, rows: s.rows.map((r) => (r.id === rowId ? change(r) : r)) }))
  const updateHoliday = (key: string, change: (h: HolidayEntry) => HolidayEntry) =>
    update((s) => ({ ...s, holidays: { ...s.holidays, [key]: change(s.holidays[key] ?? { cells: {} }) } }))

  const addRow = () =>
    update((s) => ({ ...s, rows: [...s.rows, newRow(s.unit === 'lesson' ? { date: nextLessonDate(s, holidays) } : {})] }))

  const moveRow = (index: number, delta: -1 | 1) =>
    update((s) => {
      const rows = [...s.rows]
      const target = index + delta
      if (target < 0 || target >= rows.length) return s
      ;[rows[index], rows[target]] = [rows[target], rows[index]]
      // Bei Stunden bleiben die Termine an ihrer Position, nur die Inhalte wandern
      if (s.unit === 'lesson') [rows[index].date, rows[target].date] = [rows[target].date, rows[index].date]
      return { ...s, rows }
    })

  const duplicateRow = (index: number) =>
    update((s) => {
      const rows = [...s.rows]
      rows.splice(index + 1, 0, { ...structuredClone(rows[index]), id: uuid() })
      return { ...s, rows }
    })

  const deleteRow = (index: number) => {
    const row = series.rows[index]
    const hasContent = row.label || Object.values(row.cells).some(Boolean)
    if (hasContent && !confirm('Zeile wirklich löschen?')) return
    update((s) => ({ ...s, rows: s.rows.filter((_, i) => i !== index) }))
  }

  const saveSettings = (data: Pick<Series, 'name' | 'course' | 'startDate' | 'unit' | 'weekdays' | 'state'>) => {
    update((s) => {
      let rows = s.rows
      // Beim Wechsel auf „Stunden“ übernehmen die Zeilen ihr bisheriges Kalenderdatum
      if (data.unit === 'lesson' && s.unit !== 'lesson') {
        const dates = new Map(schedule.flatMap((d) => (d.kind === 'content' ? [[d.row.id, d.slot.key] as const] : [])))
        rows = rows.map((r) => ({ ...r, date: r.date ?? dates.get(r.id) }))
      }
      return { ...s, ...data, rows }
    })
    setDialog(null)
  }

  const saveColumns = (columns: Column[]) => {
    const ids = new Set(columns.map((c) => c.id))
    const prune = (cells: Record<string, string>) => Object.fromEntries(Object.entries(cells).filter(([k]) => ids.has(k)))
    update((s) => ({
      ...s,
      columns,
      rows: s.rows.map((r) => ({ ...r, cells: prune(r.cells) })),
      holidays: Object.fromEntries(Object.entries(s.holidays).map(([k, h]) => [k, { ...h, cells: prune(h.cells) }])),
    }))
    setDialog(null)
  }

  const editingRow = editing?.kind === 'row' ? series.rows.find((r) => r.id === editing.id) : undefined
  const stateName = STATES.find((s) => s.slug === series.state)?.name

  return (
    <article className="series-view">
      <header className="page-header">
        <div>
          <a href={href.list()} className="back dont-print">
            <IconBack /> Alle Reihen
          </a>
          <h1>{series.name || 'Ohne Titel'}</h1>
          <p className="meta">
            <strong>{series.course}</strong> · {UNIT_LABELS[series.unit]} · Start {describeStart(series)}
            {stateName && ` · Ferien: ${stateName}`}
          </p>
        </div>
        <div className="toolbar dont-print">
          <button onClick={() => setDialog('settings')} title="Reihe bearbeiten">
            <IconSettings /> Reihe
          </button>
          <button onClick={() => setDialog('columns')} title="Spalten bearbeiten">
            <IconColumns /> Spalten
          </button>
          <button onClick={() => window.print()} title="Drucken (Querformat)">
            <IconPrint /> Drucken
          </button>
        </div>
      </header>

      {holidayError && <p className="notice dont-print">{holidayError}</p>}

      <div className="table-scroll">
        <table className="plan">
          <colgroup>
            <col className="col-slot" />
            {series.columns.map((c) => (
              <col key={c.id} />
            ))}
            <col className="col-actions dont-print" />
          </colgroup>
          <thead>
            <tr>
              <th>{FIRST_COLUMN[series.unit]}</th>
              {series.columns.map((c) => (
                <th key={c.id}>{c.title}</th>
              ))}
              <th className="dont-print" aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {schedule.map((entry) => (
              <PlanRow
                key={entry.kind === 'content' ? entry.row.id : `h-${entry.slot.key}`}
                entry={entry}
                series={series}
                rowCount={series.rows.length}
                updateRow={updateRow}
                updateHoliday={updateHoliday}
                onEdit={() =>
                  setEditing(
                    entry.kind === 'content'
                      ? { kind: 'row', id: entry.row.id }
                      : { kind: 'holiday', key: entry.slot.key, title: `${entry.slot.title} · ${entry.holidayNames.join(', ')}` },
                  )
                }
                onMove={(delta) => entry.kind === 'content' && moveRow(entry.index, delta)}
                onDuplicate={() => entry.kind === 'content' && duplicateRow(entry.index)}
                onDelete={() => entry.kind === 'content' && deleteRow(entry.index)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <footer className="table-footer dont-print">
        <button onClick={addRow}>
          <IconPlus /> {series.unit === 'week' ? 'Woche' : series.unit === 'day' ? 'Tag' : 'Stunde'} hinzufügen
        </button>
        <small className="muted">Zellen anklicken zum Bearbeiten · Markdown möglich · Strg/⌘+Enter speichert, Esc verwirft</small>
      </footer>

      {dialog === 'settings' && <SeriesForm initial={series} onSave={saveSettings} onClose={() => setDialog(null)} />}
      {dialog === 'columns' && <ColumnsDialog columns={series.columns} onSave={saveColumns} onClose={() => setDialog(null)} />}
      {editingRow && (
        <RowDialog
          title="Einheit bearbeiten"
          columns={series.columns}
          row={editingRow}
          withDate={series.unit === 'lesson'}
          withColors
          onSave={(row) => {
            updateRow(row.id, () => row)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === 'holiday' && (
        <RowDialog
          title={editing.title}
          columns={series.columns}
          row={{ id: editing.key, label: series.holidays[editing.key]?.label ?? '', cells: series.holidays[editing.key]?.cells ?? {} }}
          withDate={false}
          withColors={false}
          onSave={(row) => {
            updateHoliday(editing.key, () => ({ label: row.label, cells: row.cells }))
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </article>
  )
}

interface RowProps {
  entry: DisplayRow
  series: Series
  rowCount: number
  updateRow: (id: string, change: (r: Row) => Row) => void
  updateHoliday: (key: string, change: (h: HolidayEntry) => HolidayEntry) => void
  onEdit: () => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}

function PlanRow({ entry, series, rowCount, updateRow, updateHoliday, onEdit, onMove, onDuplicate, onDelete }: RowProps) {
  const { slot, holidayNames } = entry
  const isHoliday = entry.kind === 'holiday' || (series.unit === 'lesson' && holidayNames.length > 0)
  const data: { label: string; cells: Record<string, string> } =
    entry.kind === 'content' ? entry.row : { label: series.holidays[slot.key]?.label ?? '', cells: series.holidays[slot.key]?.cells ?? {} }

  const setLabel = (label: string) =>
    entry.kind === 'content' ? updateRow(entry.row.id, (r) => ({ ...r, label })) : updateHoliday(slot.key, (h) => ({ ...h, label }))
  const setCell = (columnId: string, value: string) =>
    entry.kind === 'content'
      ? updateRow(entry.row.id, (r) => ({ ...r, cells: { ...r.cells, [columnId]: value } }))
      : updateHoliday(slot.key, (h) => ({ ...h, cells: { ...h.cells, [columnId]: value } }))

  const style = entry.kind === 'content' ? { backgroundColor: entry.row.bg, color: entry.row.fg } : undefined

  return (
    <tr className={isHoliday ? 'holiday' : undefined} style={style}>
      <th scope="row" className="slot">
        <span className="slot-title">{slot.title}</span>
        {entry.kind === 'content' && series.unit === 'lesson' ? (
          <>
            <input
              type="date"
              className="inline-date dont-print"
              value={entry.row.date ?? ''}
              onChange={(e) => updateRow(entry.row.id, (r) => ({ ...r, date: e.target.value || undefined }))}
            />
            {entry.row.date && <span className="slot-sub dont-screen">{formatDate(entry.row.date)}</span>}
          </>
        ) : (
          slot.subtitle && <span className="slot-sub">{slot.subtitle}</span>
        )}
        {holidayNames.length > 0 && <span className="slot-holiday">{holidayNames.join(', ')}</span>}
        <InlineText value={data.label} onChange={setLabel} placeholder="…" />
      </th>
      {series.columns.map((column) => (
        <td key={column.id}>
          <EditableCell value={data.cells[column.id] ?? ''} onChange={(v) => setCell(column.id, v)} placeholder={column.title} />
        </td>
      ))}
      <td className="actions dont-print">
        <button className="icon-button" title="Bearbeiten" onClick={onEdit}>
          <IconEdit />
        </button>
        {entry.kind === 'content' && (
          <>
            <button className="icon-button" title="Nach oben" disabled={entry.index === 0} onClick={() => onMove(-1)}>
              <IconArrowUp />
            </button>
            <button className="icon-button" title="Nach unten" disabled={entry.index === rowCount - 1} onClick={() => onMove(1)}>
              <IconArrowDown />
            </button>
            <button className="icon-button" title="Duplizieren" onClick={onDuplicate}>
              <IconCopy />
            </button>
            <button className="icon-button" title="Löschen" onClick={onDelete}>
              <IconDelete />
            </button>
          </>
        )}
      </td>
    </tr>
  )
}
