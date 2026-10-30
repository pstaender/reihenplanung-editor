import { href, useRoute } from '../router'
import { IconBook, IconHelp } from '../icons'
import { HelpPage } from './HelpPage'
import { SeriesList } from './SeriesList'
import { SeriesView } from './SeriesView'
import { SyncIndicator } from './SyncIndicator'
import { SyncPage } from './SyncPage'

export function App() {
  const route = useRoute()

  return (
    <>
      <header className="app-header dont-print">
        <a href={href.list()} className="brand">
          <IconBook /> Reihenplanung
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
