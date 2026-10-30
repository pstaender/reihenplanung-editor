import { useEffect, useRef, type ReactNode } from 'react'
import { IconX } from '../icons'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}

/** Modaler Dialog auf Basis des nativen <dialog>-Elements. */
export function Dialog({ title, onClose, children, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={className}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="dialog-inner">
        <header className="dialog-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Schließen">
            <IconX />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
