// Deno Deploy worker for the PerryLink DSH Catalog standard source.
// Serves /catalog-source.json and /v1/plugins as application/json from the
// committed artifacts (imported at deploy time, so no runtime reads needed).
// Also serves the P3 discovery endpoints:
//   GET /v1/search?q=&domain=&task=&audience=&limit=   (sidecar index, no GitHub/npm)
//   GET /v1/plugin?name=dsh-hs-classify               (index record)
// Deploy this folder to Deno Deploy, then rebuild the manifest with
// DEPLOY_ORIGIN=https://<your-project>.deno.dev node scripts/build-catalog.mjs
// so the manifest endpoint matches its own origin (the market enforces
// same-origin manifest + endpoint).

import manifest from './catalog-source.json' with { type: 'json' }
import page from './artifacts/v1/plugins.json' with { type: 'json' }
import searchIndex from './artifacts/v1/search-index.json' with { type: 'json' }
import hubs from './artifacts/v1/hubs.json' with { type: 'json' }
import { sliceCatalogPage } from './catalog-page.mjs'
import { search } from './search-core.mjs'

/** `Deno` is a Deno Deploy global and is not declared by @types/node, so it is
 * reached through `globalThis` with an explicit runtime shape. */
/** @typedef {{ serve: (handler: (request: Request) => Response | Promise<Response>) => unknown }} DenoRuntime */

/** @type {unknown} */
const globalScope = globalThis
const denoRuntime = /** @type {{ Deno: DenoRuntime }} */ (globalScope)

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

denoRuntime.Deno.serve((request) => {
  const url = new URL(request.url)
  const { pathname } = url
  if (request.method !== 'GET') return new Response('method not allowed', { status: 405 })
  if (pathname === '/catalog-source.json') return text(manifest)
  if (pathname === '/v1/plugins') {
    const sliced = sliceCatalogPage(page, url)
    return sliced.error ? text({ error: sliced.error }, 400) : text(sliced.page)
  }
  if (pathname === '/v1/search') return searchResult(url)
  if (pathname === '/v1/plugin') return pluginResult(url)
  if (pathname === '/v1/hubs') return text(hubs)
  return new Response('not found', { status: 404 })
})
