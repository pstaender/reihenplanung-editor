import { exportFile, parseImport } from '../importFormat'
import { getState, importSeries, sortedSeries } from '../store'
import type { Series } from '../types'
import { createZip, isZip, readZip } from '../zip'
import { IconDownload, IconUpload } from '../icons'

/** Export aller Reihen als ZIP (eine JSON-Datei pro Reihe) und Import von JSON- oder ZIP-Dateien (Format: docs/format.md).
 *  Gleiche IDs werden beim Import überschrieben. */
export function BackupButtons() {
  return (
    <>
      <button onClick={() => void exportAll()} title="Alle Reihen als ZIP-Datei speichern (eine JSON-Datei pro Reihe)">
        <IconDownload /> Exportieren
      </button>
      <label className="button" title="Reihen aus JSON- oder ZIP-Datei laden">
        <IconUpload /> Importieren
        <input
          type="file"
          accept="application/json,.json,application/zip,.zip"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // dieselbe Datei erneut wählbar
            if (file) void importFile(file)
          }}
        />
      </label>
    </>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

/** Dateiname aus Name und Kurs, z. B. „bruchrechnung-6b-mathematik“ */
function slug(series: Series) {
  const text = [series.name, series.course].filter(Boolean).join(' ')
  const slug = text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug.slice(0, 60) || 'reihe'
}

const fileContent = (series: Series[]) => JSON.stringify(exportFile(series), null, 2)

/** Eine einzelne Reihe als JSON-Datei */
export function exportSeries(series: Series) {
  downloadJson(fileContent([series]), `${slug(series)}.json`)
}

async function exportAll() {
  const list = sortedSeries(getState().series)
  if (list.length === 0) return alert('Keine Reihen zum Exportieren vorhanden.')
  const encoder = new TextEncoder()
  const digits = String(list.length).length
  // Nummerierung hält die Reihenfolge der Übersicht fest
  const entries = list.map((series, i) => ({
    name: `${String(i + 1).padStart(digits, '0')}-${slug(series)}.json`,
    data: encoder.encode(fileContent([series])),
  }))
  download(await createZip(entries), `reihenplanung-${today()}.zip`)
}

async function importFile(file: File) {
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    let series: Series[]
    if (isZip(data)) {
      const decoder = new TextDecoder()
      const entries = (await readZip(data))
        .filter((e) => e.name.toLowerCase().endsWith('.json') && !e.name.split('/').some((part) => part.startsWith('.')))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      if (entries.length === 0) throw new Error('Die ZIP-Datei enthält keine JSON-Dateien.')
      series = entries.flatMap((entry) => {
        try {
          return parseImport(JSON.parse(decoder.decode(entry.data)))
        } catch (error) {
          throw new Error(`${entry.name}: ${error instanceof Error ? error.message : error}`)
        }
      })
    } else {
      series = parseImport(JSON.parse(new TextDecoder().decode(data)))
    }
    importSeries(series)
    alert(`${series.length} Reihe(n) importiert.`)
  } catch (error) {
    alert(`Import fehlgeschlagen: ${error instanceof Error ? error.message : error}`)
  }
}

export function downloadJson(content: string, filename: string) {
  download(new Blob([content], { type: 'application/json' }), filename)
}

function download(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
