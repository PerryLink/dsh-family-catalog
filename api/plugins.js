// Vercel serverless entry for /v1/plugins: the static mirror cannot paginate,
// so this function slices the generated page exactly like the Workers entry.
// The JSON is bundled via vercel.json `functions.includeFiles`.
import { existsSync, readFileSync } from 'node:fs'
import { sliceCatalogPage } from '../lib/catalog-page.mjs'

const root = new URL('../artifacts/v1/plugins.json', import.meta.url)
const fallback = new URL('../deploy/artifacts/v1/plugins.json', import.meta.url)
const page = JSON.parse(readFileSync(existsSync(root) ? root : fallback, 'utf8'))

/** @param {any} req @param {any} res */
export default function handler(req, res) {
  const url = new URL(req.url ?? '/v1/plugins', 'https://catalog.vercel.app')
  const sliced = sliceCatalogPage(page, url)
  res.statusCode = sliced.error ? 400 : 200
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('access-control-allow-origin', '*')
  res.end(JSON.stringify(sliced.error ? { error: sliced.error } : sliced.page))
}
