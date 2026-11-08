// Pages Function entry (catch-all). Serves /catalog-source.json and
// /v1/plugins as application/json from the deploy/ JSON imports, so the
// Pages project is fully self-contained; every other path falls through
// to the static assets (context.next()).
import manifest from '../catalog-source.json' with { type: 'json' }
import page from '../artifacts/v1/plugins.json' with { type: 'json' }
import { sliceCatalogPage } from '../catalog-page.mjs'

/** @param {unknown} payload @param {number} [status] */
const text = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
})

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
  return context.next()
}
