import { useState } from 'react'
import guide from '../docs/anleitung.md?raw'
import format from '../docs/format.md?raw'
import { renderMarkdown } from '../markdown'
import { getReturnTo, href, type HelpTopic } from '../router'
import { IconBack, IconCheck, IconClipboard, IconDownload, IconSparkles } from '../icons'
import { downloadJson } from './BackupButtons'

const TOPICS: { topic: HelpTopic; title: string }[] = [
  { topic: 'anleitung', title: 'Kurzanleitung' },
  { topic: 'format', title: 'Formatspezifikation' },
]

/** Das vollständige Beispiel aus der Spezifikation (erster JSON-Block nach „## Beispiel“). */
const example = format.split('## Beispiel')[1]?.match(/```json\n([\s\S]*?)```/)?.[1] ?? ''

const aiPrompt = `Erstelle eine Unterrichtsreihenplanung als JSON-Datei für den Import in die App „Reihenplanung“.

Thema: <THEMA>
Kurs/Klasse: <KURS>
Startdatum: <JJJJ-MM-TT>
Gliederung: <Kalenderwochen | Unterrichtstage (welche?) | Unterrichtsstunden>
Umfang: <ANZAHL> Einheiten
Bundesland für Ferien: <BUNDESLAND oder keins>
Weitere Wünsche: <z. B. Klassenarbeit in der letzten Woche>

Halte dich genau an die folgende Spezifikation und antworte ausschließlich mit dem JSON.

${format}`

export function HelpPage({ topic }: { topic: HelpTopic }) {
  return (
    <section className="help-page">
      <header className="page-header">
        <div>
          <a href={getReturnTo()} className="back" title="Zurück (Esc)">
            <IconBack /> Zurück
          </a>
          <h1>Hilfe</h1>
        </div>
      </header>
      <nav className="tabs">
        {TOPICS.map((t) => (
          <a key={t.topic} href={href.help(t.topic)} className={t.topic === topic ? 'active' : undefined}>
            {t.title}
          </a>
        ))}
      </nav>

      {topic === 'format' && (
        <aside className="ai-box">
          <p>
            <IconSparkles /> <strong>Planung von einer KI erstellen lassen:</strong> Prompt kopieren, Platzhalter in spitzen Klammern
            ausfüllen, die Antwort als <code>.json</code>-Datei speichern und in der Übersicht importieren. Inhalte vor dem Unterricht prüfen.
          </p>
          <div className="toolbar">
            <CopyButton text={aiPrompt} label="Prompt für KI kopieren" primary />
            <button onClick={() => downloadJson(example, 'reihenplanung-beispiel.json')}>
              <IconDownload /> Beispieldatei
            </button>
          </div>
        </aside>
      )}

      <article className="prose markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(topic === 'format' ? format : guide) }} />
    </section>
  )
}

function CopyButton({ text, label, primary }: { text: string; label: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={primary ? 'primary' : undefined}
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <IconCheck /> : <IconClipboard />} {copied ? 'Kopiert' : label}
    </button>
  )
}
