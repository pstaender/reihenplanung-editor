import { useState } from 'react'
import { newColumn } from '../store'
import type { Column } from '../types'
import { IconArrowDown, IconArrowUp, IconDelete, IconPlus } from '../icons'
import { Dialog } from './Dialog'

interface Props {
  columns: Column[]
  onSave: (columns: Column[]) => void
  onClose: () => void
}

/** Spalten umbenennen, hinzufügen, löschen und sortieren (die erste Spalte KW/Tag/Stunde ist fest). */
export function ColumnsDialog({ columns, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(columns)

  const change = (id: string, patch: Partial<Column>) => setDraft((cols) => cols.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const move = (index: number, delta: number) =>
    setDraft((cols) => {
      const next = [...cols]
      ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
      return next
    })

  return (
    <Dialog title="Spalten" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(uniqueTitles(draft))
        }}
      >
        <ol className="column-list">
          <li className="column-list-header" aria-hidden>
            <span>Name</span>
            <span>Anzeigen</span>
            <span>Drucken</span>
          </li>
          {draft.map((column, index) => (
            <li key={column.id}>
              <input type="text" value={column.title} onChange={(e) => change(column.id, { title: e.target.value })} aria-label="Spaltenname" />
              <input
                type="checkbox"
                checked={!column.hidden}
                onChange={(e) => change(column.id, { hidden: !e.target.checked })}
                title="In der Tabelle anzeigen"
                aria-label={`${column.title} anzeigen`}
              />
              <input
                type="checkbox"
                checked={!column.hidden && !column.hiddenInPrint}
                disabled={column.hidden}
                onChange={(e) => change(column.id, { hiddenInPrint: !e.target.checked })}
                title={column.hidden ? 'Ausgeblendete Spalten werden nicht gedruckt' : 'Beim Drucken anzeigen'}
                aria-label={`${column.title} drucken`}
              />
              <button type="button" className="icon-button" title="Nach links" disabled={index === 0} onClick={() => move(index, -1)}>
                <IconArrowUp />
              </button>
              <button type="button" className="icon-button" title="Nach rechts" disabled={index === draft.length - 1} onClick={() => move(index, 1)}>
                <IconArrowDown />
              </button>
              <button
                type="button"
                className="icon-button"
                title="Spalte löschen"
                onClick={() => setDraft((cols) => cols.filter((c) => c.id !== column.id))}
              >
                <IconDelete />
              </button>
            </li>
          ))}
        </ol>
        <div>
          <button type="button" onClick={() => setDraft((cols) => [...cols, newColumn('Neue Spalte')])}>
            <IconPlus /> Spalte hinzufügen
          </button>
        </div>
        <small className="muted">
          Ausgeblendete Spalten behalten ihre Inhalte und bleiben im Zeilen-Dialog (Stift) bearbeitbar. Beim Löschen einer Spalte gehen
          deren Inhalte nach dem Speichern verloren.
        </small>
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

/** Spaltennamen müssen eindeutig sein (Import/Export adressiert Zellen über den Namen). */
function uniqueTitles(columns: Column[]): Column[] {
  const seen = new Set<string>()
  return columns.map((column) => {
    const base = column.title.trim() || 'Ohne Titel'
    let title = base
    for (let n = 2; seen.has(title); n++) title = `${base} ${n}`
    seen.add(title)
    // Nur gesetzte Flags speichern
    const { hidden, hiddenInPrint, ...rest } = column
    return { ...rest, title, ...(hidden ? { hidden } : {}), ...(hiddenInPrint ? { hiddenInPrint } : {}) }
  })
}
