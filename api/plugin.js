// Vercel serverless entry for /v1/plugin?name=.
import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../artifacts/v1/search-index.json', import.meta.url)
const fallback = new URL('../deploy/artifacts/v1/search-index.json', import.meta.url)
const index = JSON.parse(readFileSync(existsSync(root) ? root : fallback, 'utf8'))

/** @param {any} req @param {any} res */
export default function handler(req, res) {
  const url = new URL(req.url ?? '/v1/plugin', 'https://catalog.vercel.app')
  const name = url.searchParams.get('name') ?? ''
  const item = index.items.find((/** @type {any} */ row) => row.name === name)
  res.statusCode = item ? 200 : 404
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('access-control-allow-origin', '*')
  res.end(JSON.stringify(item ?? { error: 'plugin not found', name }))
}
