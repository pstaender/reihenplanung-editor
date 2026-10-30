import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.use({ gfm: true, breaks: true })

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const cache = new Map<string, string>()

/** Rendert einfaches Markdown zu bereinigtem HTML (Ergebnis wird gecacht). */
export function renderMarkdown(source: string): string {
  let html = cache.get(source)
  if (html === undefined) {
    html = DOMPurify.sanitize(marked.parse(source, { async: false }))
    if (cache.size > 2000) cache.clear()
    cache.set(source, html)
  }
  return html
}
