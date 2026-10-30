import { useState, type FormEvent } from 'react'
import type { Column, Row } from '../types'
import { BACKGROUND_PRESETS, ColorField, TEXT_PRESETS } from './ColorField'
import { Dialog } from './Dialog'

interface Props {
  title: string
  columns: Column[]
  row: Row
  /** Datum bearbeitbar (Einheit „Unterrichtsstunden“) */
  withDate: boolean
  /** Farben wählbar (nicht bei Ferienzeilen) */
  withColors: boolean
  onSave: (row: Row) => void
  onClose: () => void
}

export function RowDialog({ title, columns, row, withDate, withColors, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Row>(row)
  const setCell = (columnId: string, value: string) => setDraft((d) => ({ ...d, cells: { ...d.cells, [columnId]: value } }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave(draft)
  }

  return (
    <Dialog title={title} onClose={onClose} className="row-dialog">
      <form onSubmit={submit} className="stack">
        <div className={withDate ? 'grid-2' : undefined}>
          {withDate && (
            <label>
              Datum
              <input type="date" value={draft.date ?? ''} onChange={(e) => setDraft({ ...draft, date: e.target.value || undefined })} />
            </label>
          )}
          <label>
            Zusatzzeile
            <input type="text" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="z. B. Doppelstunde, Klassenarbeit …" />
          </label>
        </div>

        {columns.map((column) => (
          <label key={column.id}>
            <span>
              {column.title} {column.hidden && <span className="muted">(ausgeblendet)</span>}
            </span>
            <textarea
              rows={3}
              className="autosize"
              value={draft.cells[column.id] ?? ''}
              onChange={(e) => setCell(column.id, e.target.value)}
            />
          </label>
        ))}
        <small className="muted">Markdown möglich: **fett**, *kursiv*, - Liste, [Link](https://…)</small>

        {withColors && (
          <div className="grid-2">
            <ColorField label="Hintergrundfarbe" value={draft.bg} presets={BACKGROUND_PRESETS} fallback="#ffffff" onChange={(bg) => setDraft({ ...draft, bg })} />
            <ColorField label="Textfarbe" value={draft.fg} presets={TEXT_PRESETS} fallback="#000000" onChange={(fg) => setDraft({ ...draft, fg })} />
          </div>
        )}

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
