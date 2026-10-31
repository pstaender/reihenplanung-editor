import { useState, type FormEvent } from 'react'
import { markAllDirty, saveSettings, useStore } from '../store'
import { syncNow, testConnection } from '../sync'
import { getReturnTo } from '../router'
import { IconBack, IconSync } from '../icons'
import { BackupButtons } from './BackupButtons'

/** Vorschlag: der Server, von dem die App geladen wurde (Produktions-Build liegt in api/public) */
function suggestedServerUrl() {
  if (!location.protocol.startsWith('http')) return ''
  return (location.origin + location.pathname).replace(/\/(index\.html)?$/, '')
}

const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

export function SyncPage() {
  const settings = useStore((s) => s.settings)
  const sync = useStore((s) => s.sync)
  const [serverUrl, setServerUrl] = useState(settings.serverUrl || suggestedServerUrl())
  const [token, setToken] = useState(settings.token)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!serverUrl || !token) {
      saveSettings({ serverUrl: '', token: '' })
      setMessage({ ok: true, text: 'Synchronisation deaktiviert – Daten bleiben nur in diesem Browser.' })
      return
    }
    try {
      const email = await testConnection(serverUrl, token)
      const changedServer = serverUrl !== settings.serverUrl || token !== settings.token
      // Neuer Server/Account: alles einmal komplett abgleichen
      saveSettings({ serverUrl, token, ...(changedServer ? { revision: 0 } : {}) })
      if (changedServer) markAllDirty()
      await syncNow()
      setMessage({ ok: true, text: `Verbunden als ${email}.` })
    } catch (error) {
      setMessage({ ok: false, text: `Verbindung fehlgeschlagen: ${error instanceof Error ? error.message : error}` })
    }
  }

  return (
    <section className="sync-page">
      <header className="page-header">
        <div>
          <a href={getReturnTo()} className="back" title="Zurück (Esc)">
            <IconBack /> Zurück
          </a>
          <h1>Synchronisation</h1>
        </div>
      </header>
      <p className="muted">
        Alle Daten werden lokal im Browser gespeichert. Optional können sie mit einem eigenen Server abgeglichen werden
        (siehe <code>api/</code>). Benutzer und Tokens werden dort per CLI angelegt.
      </p>

      <form onSubmit={save} className="stack">
        <label>
          Server-URL
          <input type="url" value={serverUrl} onChange={(e) => setServerUrl(e.target.value.trim())} placeholder="https://example.org/reihenplanung-api" />
        </label>
        <label>
          API-Token
          <input type="password" value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="rp_…" autoComplete="off" />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={settings.autoSync} onChange={(e) => saveSettings({ autoSync: e.target.checked })} />
          Automatisch synchronisieren
        </label>
        <footer className="dialog-footer">
          <button type="button" disabled={!settings.serverUrl || sync.state === 'syncing'} onClick={() => void syncNow()}>
            <IconSync className={sync.state === 'syncing' ? 'spin' : undefined} /> Jetzt synchronisieren
          </button>
          <button type="submit" className="primary">
            Speichern &amp; testen
          </button>
        </footer>
      </form>

      {message && <p className={`notice ${message.ok ? 'ok' : 'error'}`}>{message.text}</p>}
      {sync.state === 'error' && <p className="notice error">Letzter Sync fehlgeschlagen: {sync.message}</p>}
      {settings.lastSyncAt && <p className="muted">Zuletzt synchronisiert: {dateTime.format(settings.lastSyncAt)}</p>}

      <h2>Datensicherung</h2>
      <p className="muted">Alle Reihen als ZIP-Datei (eine JSON-Datei pro Reihe) exportieren bzw. JSON- oder ZIP-Dateien wieder importieren.</p>
      <div className="toolbar">
        <BackupButtons />
      </div>
    </section>
  )
}
