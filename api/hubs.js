// Vercel serverless entry for /v1/hubs.
import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../artifacts/v1/hubs.json', import.meta.url)
const fallback = new URL('../deploy/artifacts/v1/hubs.json', import.meta.url)
const hubs = JSON.parse(readFileSync(existsSync(root) ? root : fallback, 'utf8'))

/** @param {any} _req @param {any} res */
export default function handler(_req, res) {
  res.statusCode = 200
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('access-control-allow-origin', '*')
  res.end(JSON.stringify(hubs))
}
