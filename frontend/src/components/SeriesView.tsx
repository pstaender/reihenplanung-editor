import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatDate, parseDate } from '../dates'
import { STATES, useHolidays } from '../holidays'
import { toggleMeta, useViewSettings, type MetaItem } from '../localSettings'
import { href } from '../router'
import { buildSchedule, estimateEndYear, nextLessonDate, type DisplayRow } from '../schedule'
import { newRow, updateSeries, useStore } from '../store'
import type { Column, HolidayEntry, Row, Series } from '../types'
import { uuid } from '../uuid'
import { IconArrowDown, IconArrowUp, IconBack, IconColumns, IconCopy, IconDelete, IconEdit, IconPlus, IconPrint, IconSettings } from '../icons'
import { ColumnsDialog } from './ColumnsDialog'
import { EditableCell, InlineText } from './EditableCell'
import { RowDialog } from './RowDialog'
import { SeriesSettingsDialog } from './SeriesForm'
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

  const visibleColumns = series.columns.filter((c) => !c.hidden)
  const hiddenCount = series.columns.length - visibleColumns.length
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
            <MetaToggle item="course">
              <strong className={series.bg ? 'course-badge' : undefined} style={{ backgroundColor: series.bg }}>
                {series.course}
              </strong>
            </MetaToggle>
            <MetaToggle item="unit">{UNIT_LABELS[series.unit]}</MetaToggle>
            <MetaToggle item="start">Start {describeStart(series)}</MetaToggle>
            {stateName && <MetaToggle item="holidays">Ferien: {stateName}</MetaToggle>}
          </p>
        </div>
        <div className="toolbar dont-print">
          <button onClick={() => setDialog('settings')} title="Reihe bearbeiten">
            <IconSettings /> Reihe
          </button>
          <button onClick={() => setDialog('columns')} title="Spalten bearbeiten">
            <IconColumns /> Spalten
            {hiddenCount > 0 && <span className="muted">({hiddenCount} ausgeblendet)</span>}
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
            {visibleColumns.map((c) => (
              <col key={c.id} className={c.hiddenInPrint ? 'dont-print' : undefined} />
            ))}
            <col className="col-actions dont-print" />
          </colgroup>
          <thead>
            <tr>
              <th>{FIRST_COLUMN[series.unit]}</th>
              {visibleColumns.map((c) => (
                <th key={c.id} className={c.hiddenInPrint ? 'dont-print' : undefined}>
                  {c.title}
                </th>
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
                columns={visibleColumns}
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

      {dialog === 'settings' && <SeriesSettingsDialog series={series} onClose={() => setDialog(null)} />}
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

/** Angabe unter dem Titel; per Klick ausblendbar (Bildschirm: blass, Druck: unsichtbar). */
function MetaToggle({ item, children }: { item: MetaItem; children: ReactNode }) {
  const hidden = useViewSettings().hiddenMeta.includes(item)
  return (
    <button
      type="button"
      className={`meta-item ${hidden ? 'is-hidden' : ''}`}
      aria-pressed={!hidden}
      title={hidden ? 'Einblenden (wird gedruckt)' : 'Ausblenden (wird nicht gedruckt)'}
      onClick={() => toggleMeta(item)}
    >
      {children}
    </button>
  )
}

interface RowProps {
  entry: DisplayRow
  series: Series
  columns: Column[]
  rowCount: number
  updateRow: (id: string, change: (r: Row) => Row) => void
  updateHoliday: (key: string, change: (h: HolidayEntry) => HolidayEntry) => void
  onEdit: () => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}

function PlanRow({ entry, series, columns, rowCount, updateRow, updateHoliday, onEdit, onMove, onDuplicate, onDelete }: RowProps) {
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
      {columns.map((column) => (
        <td key={column.id} className={column.hiddenInPrint ? 'dont-print' : undefined}>
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
