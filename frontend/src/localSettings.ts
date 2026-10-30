import { useSyncExternalStore } from 'react'

/*
 * Appweite Ansichtseinstellungen, nur in diesem Browser (localStorage).
 * Nicht Teil der Reihen-Daten – werden weder exportiert noch synchronisiert.
 */

const KEY = 'reihenplanung:view'

export type MetaItem = 'course' | 'unit' | 'start' | 'holidays'

interface ViewSettings {
  hiddenMeta: MetaItem[]
}

const DEFAULTS: ViewSettings = { hiddenMeta: [] }
const listeners = new Set<() => void>()

let current: ViewSettings = load()

function load(): ViewSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

export function useViewSettings(): ViewSettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}

export function toggleMeta(item: MetaItem) {
  const hiddenMeta = current.hiddenMeta.includes(item) ? current.hiddenMeta.filter((i) => i !== item) : [...current.hiddenMeta, item]
  current = { ...current, hiddenMeta }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // z. B. privater Modus – Einstellung gilt dann nur bis zum Neuladen
  }
  listeners.forEach((l) => l())
}
