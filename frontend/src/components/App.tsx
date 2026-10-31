import { useEffect } from 'react'
import { getReturnTo, href, navigate, useRoute } from '../router'
import { IconHelp } from '../icons'
import { HelpPage } from './HelpPage'
import { SeriesList } from './SeriesList'
import { SeriesView } from './SeriesView'
import { SyncIndicator } from './SyncIndicator'
import { SyncPage } from './SyncPage'

export function App() {
  const route = useRoute()
  const sidePage = route.page === 'sync' || route.page === 'help'

  // Esc auf Sync-/Hilfeseite: zurück zur Seite, von der aus sie geöffnet wurde
  useEffect(() => {
    if (!sidePage) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open]')) return
      navigate(getReturnTo())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidePage])

  return (
    <>
      <header className="app-header dont-print">
        <a href={href.list()} className="brand">
          Reihenplanung
        </a>
        <nav>
          <a href={href.help()} className={route.page === 'help' ? 'active' : undefined}>
            <IconHelp /> <span>Hilfe</span>
          </a>
          <SyncIndicator />
        </nav>
      </header>
      <main className={route.page === 'series' ? 'wide' : undefined}>
        {route.page === 'list' && <SeriesList />}
        {route.page === 'series' && <SeriesView key={route.id} id={route.id} />}
        {route.page === 'sync' && <SyncPage />}
        {route.page === 'help' && <HelpPage topic={route.topic} />}
      </main>
    </>
  )
}
