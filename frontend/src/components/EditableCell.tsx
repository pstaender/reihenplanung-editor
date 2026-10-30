import { useEffect, useRef, useState } from 'react'
import { renderMarkdown } from '../markdown'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * Zeigt gerendertes Markdown; per Klick, Enter oder Tab-Fokus wird daraus ein Textfeld.
 * Speichern beim Verlassen oder mit Strg/⌘+Enter, Abbrechen mit Escape.
 */
export function EditableCell({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (draft === null) return
    const textarea = ref.current
    if (textarea && document.activeElement !== textarea) {
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }
  }, [draft])

  const commit = () => {
    if (draft !== null && draft !== value) onChange(draft.replace(/\s+$/, ''))
    setDraft(null)
  }

  if (draft !== null) {
    return (
      <textarea
        ref={ref}
        className="cell-editor"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setDraft(null)
          } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            commit()
          }
        }}
      />
    )
  }

  return (
    <div
      className="cell-view markdown"
      tabIndex={0}
      role="button"
      aria-label={placeholder ? `${placeholder} bearbeiten` : 'Bearbeiten'}
      onFocus={() => setDraft(value)}
      // Links sollen klickbar bleiben, statt den Editor zu öffnen
      onMouseDown={(e) => (e.target as HTMLElement).closest('a') && e.preventDefault()}
      dangerouslySetInnerHTML={{ __html: value ? renderMarkdown(value) : '' }}
    />
  )
}

/** Einzeiliges Inline-Feld (z. B. Zusatzzeile unter KW/Tag); speichert beim Verlassen. */
export function InlineText({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const commit = () => draft !== value && onChange(draft.trim())

  return (
    <input
      type="text"
      className="inline-text"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(value)
      }}
    />
  )
}
