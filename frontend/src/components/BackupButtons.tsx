import { getState, importSeries } from '../store'
import { IconDownload, IconUpload } from '../icons'

/** Export/Import aller Reihen als JSON-Datei. Beim Import werden Reihen mit gleicher ID überschrieben. */
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
  const series = [...getState().series.values()].filter((s) => !s.deleted).map(({ _dirty, _rev, ...rest }) => rest)
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), series }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `reihenplanung-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function importJson(file: File) {
  try {
    const data = JSON.parse(await file.text())
    const list = Array.isArray(data) ? data : data.series
    if (!Array.isArray(list)) throw new Error('Unbekanntes Format')
    importSeries(list)
    alert(`${list.length} Reihe(n) importiert.`)
  } catch (error) {
    alert(`Import fehlgeschlagen: ${error instanceof Error ? error.message : error}`)
  }
}
