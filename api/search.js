// Vercel serverless entry for /v1/search.
import { existsSync, readFileSync } from 'node:fs'
import { search } from '../lib/search-core.mjs'

const root = new URL('../artifacts/v1/search-index.json', import.meta.url)
const fallback = new URL('../deploy/artifacts/v1/search-index.json', import.meta.url)
const index = JSON.parse(readFileSync(existsSync(root) ? root : fallback, 'utf8'))

/** @param {any} req @param {any} res */
export default function handler(req, res) {
  const url = new URL(req.url ?? '/v1/search', 'https://catalog.vercel.app')
  const q = url.searchParams.get('q') ?? ''
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('access-control-allow-origin', '*')
  if (q.trim().length === 0) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'missing q', query: '', results: [] }))
    return
  }
  const rawLimit = Number(url.searchParams.get('limit') ?? '5')
  res.statusCode = 200
  res.end(JSON.stringify(search(index, q, {
    limit: Number.isFinite(rawLimit) ? rawLimit : 5,
    domain: url.searchParams.get('domain') ?? undefined,
    task: url.searchParams.get('task') ?? undefined,
    audience: url.searchParams.get('audience') ?? undefined,
  })))
}
