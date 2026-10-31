import { useMemo, useState } from 'react'
import { formatDate, isoWeek } from '../dates'
import { STATES } from '../holidays'
import { href, navigate } from '../router'
import { createSeries, deleteSeries, duplicateSeries, placeSeries, sortedSeries, togglePinned, useStore } from '../store'
import { IconCopy, IconDelete, IconDownload, IconEdit, IconPin, IconPinned, IconPlus } from '../icons'
import { BackupButtons, exportSeries } from './BackupButtons'
import { SeriesForm, SeriesSettingsDialog } from './SeriesForm'
import type { Series } from '../types'

export const UNIT_LABELS = { week: 'Kalenderwochen', day: 'Tage', lesson: 'Unterrichtsstunden' } as const

export function describeStart(series: Pick<Series, 'startDate' | 'unit'>) {
  const date = formatDate(series.startDate)
  return series.unit === 'week' ? `KW ${isoWeek(series.startDate).week} (${date})` : date
}

export function SeriesList() {
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const all = useStore((s) => s.series)
  const list = useMemo(() => sortedSeries(all), [all])
  const editing = editingId ? all.get(editingId) : undefined
  // Drag & Drop: gezogene Reihe und Einfügemarke (vor/hinter einer Reihe derselben Gruppe)
  const [dragId, setDragId] = useState<string | null>(null)
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null)
  const dragged = dragId ? all.get(dragId) : undefined
  const endDrag = () => {
    setDragId(null)
    setDrop(null)
  }

  return (
    <section className="series-list">
      <header className="page-header">
        <h1>Unterrichtsreihen</h1>
        <div className="toolbar">
          <BackupButtons />
          <button className="primary" onClick={() => setCreating(true)}>
            <IconPlus /> Neue Reihe
          </button>
        </div>
      </header>

      {list.length === 0 ? (
        <p className="empty">
          Noch keine Reihen angelegt. <button onClick={() => setCreating(true)}>Erste Reihe anlegen</button>
        </p>
      ) : (
        <ul className="cards">
          {list.map((series) => {
            // Verschieben nur innerhalb der Gruppe (angeheftet / übrige)
            const canDrop = dragged && dragged.id !== series.id && Boolean(dragged.pinned) === Boolean(series.pinned)
            const classes = [
              series.pinned && 'pinned',
              series.bg && 'colored',
              series.id === dragId && 'dragging',
              drop?.id === series.id && (drop.after ? 'drop-after' : 'drop-before'),
            ]
            return (
              <li
                key={series.id}
                className={classes.filter(Boolean).join(' ') || undefined}
                style={{ backgroundColor: series.bg }}
                draggable
                title="Zum Sortieren ziehen"
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', series.name)
                  setDragId(series.id)
                }}
                onDragOver={(e) => {
                  if (!canDrop) return
                  e.preventDefault()
                  const box = e.currentTarget.getBoundingClientRect()
                  const after = e.clientY > box.top + box.height / 2
                  if (drop?.id !== series.id || drop.after !== after) setDrop({ id: series.id, after })
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (canDrop && drop) placeSeries(dragged.id, series.id, drop.after)
                  endDrag()
                }}
                onDragEnd={endDrag}
              >
                <a href={href.series(series.id)} className="card" draggable={false}>
                  <strong>{series.name || 'Ohne Titel'}</strong>
                  <span>{series.course}</span>
                  <small>
                    {UNIT_LABELS[series.unit]} · Start {describeStart(series)} · {series.rows.length} Einheiten
                    {series.state && ` · ${STATES.find((s) => s.slug === series.state)?.name}`}
                  </small>
                </a>
                <div className="card-actions">
                  <button className="icon-button" title="Reihe bearbeiten" onClick={() => setEditingId(series.id)}>
                    <IconEdit />
                  </button>
                  <button
                    className={`icon-button ${series.pinned ? 'active' : ''}`}
                    title={series.pinned ? 'Nicht mehr oben anheften' : 'Oben anheften'}
                    aria-pressed={Boolean(series.pinned)}
                    onClick={() => togglePinned(series.id)}
                  >
                    {series.pinned ? <IconPinned /> : <IconPin />}
                  </button>
                  <button className="icon-button" title="Duplizieren" onClick={() => duplicateSeries(series.id)}>
                    <IconCopy />
                  </button>
                  <button className="icon-button" title="Als JSON-Datei exportieren" onClick={() => exportSeries(series)}>
                    <IconDownload />
                  </button>
                  <button
                    className="icon-button"
                    title="Löschen"
                    onClick={() => confirm(`Reihe „${series.name}“ wirklich löschen?`) && deleteSeries(series.id)}
                  >
                    <IconDelete />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && <SeriesSettingsDialog series={editing} onClose={() => setEditingId(null)} />}

      {creating && (
        <SeriesForm
          onClose={() => setCreating(false)}
          onSave={(data) => {
            const series = createSeries(data)
            setCreating(false)
            navigate(href.series(series.id))
          }}
        />
      )}
    </section>
  )
}
