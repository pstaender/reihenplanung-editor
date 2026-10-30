import { useEffect, useState } from 'react'

export type Route = { page: 'list' } | { page: 'series'; id: string } | { page: 'sync' }

function parse(hash: string): Route {
  const [, page, id] = hash.replace(/^#/, '').split('/')
  if (page === 'reihe' && id) return { page: 'series', id }
  if (page === 'sync') return { page: 'sync' }
  return { page: 'list' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const update = () => setRoute(parse(location.hash))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}

export const href = {
  list: () => '#/',
  series: (id: string) => `#/reihe/${id}`,
  sync: () => '#/sync',
}

export const navigate = (target: string) => {
  location.hash = target
}
