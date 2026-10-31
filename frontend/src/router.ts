import { useEffect, useState } from 'react'

export type HelpTopic = 'anleitung' | 'format'

export type Route = { page: 'list' } | { page: 'series'; id: string } | { page: 'sync' } | { page: 'help'; topic: HelpTopic }

function parse(hash: string): Route {
  const [, page, id] = hash.replace(/^#/, '').split('/')
  if (page === 'reihe' && id) return { page: 'series', id }
  if (page === 'sync') return { page: 'sync' }
  if (page === 'hilfe') return { page: 'help', topic: id === 'format' ? 'format' : 'anleitung' }
  return { page: 'list' }
}

/** Sync und Hilfe sind „Nebenseiten“: Esc bzw. „Zurück“ führt dorthin, von wo sie geöffnet wurden. */
const isSidePage = (route: Route) => route.page === 'sync' || route.page === 'help'
let returnTo = '#/'
export const getReturnTo = () => returnTo

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const update = (e: HashChangeEvent) => {
      const previous = new URL(e.oldURL).hash || '#/'
      const next = parse(location.hash)
      if (isSidePage(next) && !isSidePage(parse(previous))) returnTo = previous
      setRoute(next)
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}

export const href = {
  list: () => '#/',
  series: (id: string) => `#/reihe/${id}`,
  sync: () => '#/sync',
  help: (topic: HelpTopic = 'anleitung') => `#/hilfe/${topic}`,
}

export const navigate = (target: string) => {
  location.hash = target
}
