import { useState, type FormEvent } from 'react'
import { isoWeek, parseDate, WEEKDAYS } from '../dates'
import { STATES, useHolidays } from '../holidays'
import { buildSchedule, estimateEndYear } from '../schedule'
import { newSeriesDefaults, updateSeries, type SeriesSettings } from '../store'
import type { Series, Unit } from '../types'
import { BACKGROUND_PRESETS, ColorField } from './ColorField'
import { Dialog } from './Dialog'
import { UNIT_LABELS } from './SeriesList'

type FormData = SeriesSettings

interface Props {
  initial?: FormData
  onSave: (data: FormData) => void
  onClose: () => void
}

export function SeriesForm({ initial, onSave, onClose }: Props) {
  const [data, setData] = useState<FormData>(initial ?? newSeriesDefaults())
  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setData((d) => ({ ...d, [key]: value }))

  const toggleWeekday = (day: number) => set('weekdays', data.weekdays.includes(day) ? data.weekdays.filter((d) => d !== day) : [...data.weekdays, day].sort())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave({ ...data, name: data.name.trim(), course: data.course.trim() })
  }

  return (
    <Dialog title={initial ? 'Reihe bearbeiten' : 'Neue Unterrichtsreihe'} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <label>
          Name
          <input type="text" required autoFocus value={data.name} onChange={(e) => set('name', e.target.value)} placeholder="z. B. Bruchrechnung" />
        </label>
        <div className="grid-2">
          <label>
            Kurs
            <input type="text" required value={data.course} onChange={(e) => set('course', e.target.value)} placeholder="z. B. 6b Mathematik" />
          </label>
          <ColorField label="Hintergrundfarbe" value={data.bg} presets={BACKGROUND_PRESETS} fallback="#ffffff" onChange={(bg) => set('bg', bg)} />
        </div>
        <div className="grid-2">
          <label>
            Einheit
            <select value={data.unit} onChange={(e) => set('unit', e.target.value as Unit)}>
              {Object.entries(UNIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Startdatum
            <input type="date" required value={data.startDate} onChange={(e) => e.target.value && set('startDate', e.target.value)} />
            {data.unit === 'week' && data.startDate && <small className="muted">Start in KW {isoWeek(data.startDate).week}</small>}
          </label>
        </div>

        {data.unit !== 'week' && (
          <fieldset>
            <legend>{data.unit === 'day' ? 'Unterrichtstage' : 'Wochentage (Vorschlag für neue Stunden)'}</legend>
            <div className="chips">
              {WEEKDAYS.map((day) => (
                <label key={day.value} className="chip">
                  <input type="checkbox" checked={data.weekdays.includes(day.value)} onChange={() => toggleWeekday(day.value)} />
                  <span title={day.long}>{day.short}</span>
                </label>
              ))}
            </div>
            {data.weekdays.length === 0 && <small className="muted">Keine Auswahl = Montag bis Freitag</small>}
          </fieldset>
        )}

        <label>
          Ferien/Feiertage anzeigen
          <select value={data.state} onChange={(e) => set('state', e.target.value)}>
            <option value="">Nein</option>
            {STATES.map((state) => (
              <option key={state.slug} value={state.slug}>
                {state.name}
              </option>
            ))}
          </select>
        </label>

        <footer className="dialog-footer">
          <button type="button" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="primary">
            Speichern
          </button>
        </footer>
      </form>
    </Dialog>
  )
}

/** „Reihe bearbeiten“ für eine bestehende Reihe – aus der Übersicht wie aus der Planungstabelle. */
export function SeriesSettingsDialog({ series, onClose }: { series: Series; onClose: () => void }) {
  const { holidays } = useHolidays(series.state, parseDate(series.startDate).getFullYear(), estimateEndYear(series))

  const save = (data: FormData) => {
    updateSeries(series.id, (s) => {
      let rows = s.rows
      // Beim Wechsel auf „Stunden“ übernehmen die Zeilen ihr bisheriges Kalenderdatum
      if (data.unit === 'lesson' && s.unit !== 'lesson') {
        const dates = new Map(buildSchedule(s, holidays).flatMap((d) => (d.kind === 'content' ? [[d.row.id, d.slot.key] as const] : [])))
        rows = rows.map((r) => ({ ...r, date: r.date ?? dates.get(r.id) }))
      }
      return { ...s, ...data, rows }
    })
    onClose()
  }

  const { name, course, bg, startDate, unit, weekdays, state } = series
  return <SeriesForm initial={{ name, course, bg, startDate, unit, weekdays, state }} onSave={save} onClose={onClose} />
}
