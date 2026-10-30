import { exportFile, parseImport } from '../importFormat'
import { getState, importSeries } from '../store'
import { IconDownload, IconUpload } from '../icons'

/** Export/Import aller Reihen als JSON-Datei (Format: docs/format.md). Gleiche IDs werden beim Import überschrieben. */
export function BackupButtons() {
  return (
    <>
      <button onClick={exportJson} title="Alle Reihen als JSON-Datei speichern">
        <IconDownload /> Exportieren
      </button>
      <label className="button" title="Reihen aus JSON-Datei laden">
        <IconUpload /> Importieren
        <input
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // dieselbe Datei erneut wählbar
            if (file) void importJson(file)
          }}
        />
      </label>
    </>
  )
}

function exportJson() {
  const series = [...getState().series.values()].filter((s) => !s.deleted)
  downloadJson(JSON.stringify(exportFile(series), null, 2), `reihenplanung-${new Date().toISOString().slice(0, 10)}.json`)
}

async function importJson(file: File) {
  try {
    const series = parseImport(JSON.parse(await file.text()))
    importSeries(series)
    alert(`${series.length} Reihe(n) importiert.`)
  } catch (error) {
    alert(`Import fehlgeschlagen: ${error instanceof Error ? error.message : error}`)
  }
}

export function downloadJson(content: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
