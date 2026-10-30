import { useMemo, useState } from 'react'
import { formatDate, isoWeek } from '../dates'
import { STATES } from '../holidays'
import { href, navigate } from '../router'
import { createSeries, deleteSeries, duplicateSeries, useStore } from '../store'
import { IconCopy, IconDelete, IconPlus } from '../icons'
import { SeriesForm } from './SeriesForm'
import type { Series } from '../types'

export const UNIT_LABELS = { week: 'Kalenderwochen', day: 'Tage', lesson: 'Unterrichtsstunden' } as const

export function describeStart(series: Pick<Series, 'startDate' | 'unit'>) {
  const date = formatDate(series.startDate)
  return series.unit === 'week' ? `KW ${isoWeek(series.startDate).week} (${date})` : date
}

export function SeriesList() {
  const [creating, setCreating] = useState(false)
  const all = useStore((s) => s.series)
  const list = useMemo(
    () => [...all.values()].filter((x) => !x.deleted).sort((a, b) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name)),
    [all],
  )

  return (
    <section className="series-list">
      <header className="page-header">
        <h1>Unterrichtsreihen</h1>
        <button className="primary" onClick={() => setCreating(true)}>
          <IconPlus /> Neue Reihe
        </button>
      </header>

      {list.length === 0 ? (
        <p className="empty">
          Noch keine Reihen angelegt. <button onClick={() => setCreating(true)}>Erste Reihe anlegen</button>
        </p>
      ) : (
        <ul className="cards">
          {list.map((series) => (
            <li key={series.id}>
              <a href={href.series(series.id)} className="card">
                <strong>{series.name || 'Ohne Titel'}</strong>
                <span>{series.course}</span>
                <small>
                  {UNIT_LABELS[series.unit]} · Start {describeStart(series)} · {series.rows.length} Einheiten
                  {series.state && ` · ${STATES.find((s) => s.slug === series.state)?.name}`}
                </small>
              </a>
              <div className="card-actions">
                <button className="icon-button" title="Duplizieren" onClick={() => duplicateSeries(series.id)}>
                  <IconCopy />
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
          ))}
        </ul>
      )}

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
