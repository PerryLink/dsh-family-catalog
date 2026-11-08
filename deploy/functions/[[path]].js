// Pages Function entry (catch-all). Serves the same JSON API as the Deno and
// Cloudflare Workers entries from the deploy/ files, so the Pages fallback is
// fully self-contained and route-compatible; every other path falls through to
// the static assets (context.next()).
import manifest from '../catalog-source.json' with { type: 'json' }
import page from '../artifacts/v1/plugins.json' with { type: 'json' }
import searchIndex from '../artifacts/v1/search-index.json' with { type: 'json' }
import hubs from '../artifacts/v1/hubs.json' with { type: 'json' }
import { sliceCatalogPage } from '../catalog-page.mjs'
import { search } from '../search-core.mjs'

/** @param {unknown} payload @param {number} [status] */
const text = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
})

/** @param {URL} url */
const searchResult = (url) => {
  const q = url.searchParams.get('q') ?? ''
  if (q.trim().length === 0) return text({ error: 'missing q', query: '', results: [] }, 400)
  const rawLimit = Number(url.searchParams.get('limit') ?? '5')
  return text(search(searchIndex, q, {
    limit: Number.isFinite(rawLimit) ? rawLimit : 5,
    domain: url.searchParams.get('domain') ?? undefined,
    task: url.searchParams.get('task') ?? undefined,
    audience: url.searchParams.get('audience') ?? undefined,
  }))
}

/** @param {URL} url */
const pluginResult = (url) => {
  const name = url.searchParams.get('name') ?? ''
  const item = searchIndex.items.find((/** @type {any} */ row) => row.name === name)
  return item ? text(item) : text({ error: 'plugin not found', name }, 404)
}

/** @param {{ request: Request, next: () => Promise<Response> }} context */
export function onRequest(context) {
  const url = new URL(context.request.url)
  const { pathname } = url
  if (context.request.method !== 'GET') return new Response('method not allowed', { status: 405 })
  if (pathname === '/catalog-source.json') return text(manifest)
  if (pathname === '/v1/plugins') {
    const sliced = sliceCatalogPage(page, url)
    return sliced.error ? text({ error: sliced.error }, 400) : text(sliced.page)
  }
  if (pathname === '/v1/search') return searchResult(url)
  if (pathname === '/v1/plugin') return pluginResult(url)
  if (pathname === '/v1/hubs') return text(hubs)
  return context.next()
}
