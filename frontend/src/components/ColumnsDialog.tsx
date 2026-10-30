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

  const rename = (id: string, title: string) => setDraft((cols) => cols.map((c) => (c.id === id ? { ...c, title } : c)))
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
          onSave(draft.map((c) => ({ ...c, title: c.title.trim() || 'Ohne Titel' })))
        }}
      >
        <ol className="column-list">
          {draft.map((column, index) => (
            <li key={column.id}>
              <input type="text" value={column.title} onChange={(e) => rename(column.id, e.target.value)} aria-label="Spaltenname" />
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
        <small className="muted">Beim Löschen einer Spalte gehen deren Inhalte nach dem Speichern verloren.</small>
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
