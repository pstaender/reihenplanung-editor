export type Unit = 'week' | 'day' | 'lesson'

export interface Column {
  id: string
  title: string
  /** In der Tabelle ausgeblendet (und damit auch nicht gedruckt) */
  hidden?: boolean
  /** Nur beim Drucken ausgeblendet */
  hiddenInPrint?: boolean
}

/** Eine Unterrichtseinheit (Zeile der Tabelle). */
export interface Row {
  id: string
  /** Frei editierbare Zusatzzeile unter KW/Tag bzw. Bezeichnung der Stunde. */
  label: string
  /** Nur bei Einheit „Unterrichtsstunden“: Datum der Stunde (YYYY-MM-DD). */
  date?: string
  cells: Record<string, string>
  bg?: string
  fg?: string
}

/** Inhalte einer Ferien-/Feiertagszeile – gespeichert pro Datum, da diese Zeilen fest im Kalender liegen. */
export interface HolidayEntry {
  label?: string
  cells: Record<string, string>
}

export interface Series {
  id: string
  name: string
  course: string
  /** Hintergrundfarbe der Reihe (Karte in der Übersicht, Kurs in der Kopfzeile) */
  bg?: string
  /** In der Übersicht oben angeheftet */
  pinned?: boolean
  /** Position in der Übersicht (aufsteigend, innerhalb angehefteter bzw. übriger Reihen) */
  sort?: number
  /** YYYY-MM-DD; bei Einheit KW zählt die Woche dieses Datums. */
  startDate: string
  unit: Unit
  /** ISO-Wochentage (1 = Montag … 7 = Sonntag) für Einheit „Tage“ und Datumsvorschläge bei Stunden. */
  weekdays: number[]
  /** Slug des Bundeslands für mehr-schulferien.de oder '' für keine Ferienanzeige. */
  state: string
  columns: Column[]
  rows: Row[]
  holidays: Record<string, HolidayEntry>
  createdAt: number
  updatedAt: number
  deleted?: boolean
  /** Serverrevision (vom Sync-Server vergeben). */
  _rev?: number
}

/** Lokaler Datensatz in IndexedDB: Reihe + Flag, ob noch nicht synchronisiert. */
export interface StoredSeries extends Series {
  _dirty?: boolean
}

export interface SyncSettings {
  serverUrl: string
  token: string
  autoSync: boolean
  revision: number
  lastSyncAt?: number
}

export interface HolidayPeriod {
  name: string
  starts_on: string
  ends_on: string
  is_school_vacation: boolean
  is_public_holiday: boolean
}
