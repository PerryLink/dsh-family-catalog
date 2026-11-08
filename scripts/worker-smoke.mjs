// Smoke-test the deployed worker routes without deploying. Imports the
// Cloudflare worker (same code shape as the Deno worker) and calls its fetch
// with real Requests. Requires Node with JSON import attributes (22+).
//
// Usage: node scripts/worker-smoke.mjs
// Exit 1 if any route fails; prints a success rate for the P3 acceptance note.

import { readFileSync } from 'node:fs'
import worker from '../deploy/cloudflare-worker.js'
import { onRequest } from '../deploy/functions/[[path]].js'
import vercelPlugins from '../api/plugins.js'
import vercelSearch from '../api/search.js'
import vercelPlugin from '../api/plugin.js'
import vercelHubs from '../api/hubs.js'

// Page sizes are derived from the shipped data so adding a package cannot
// leave this smoke asserting yesterday's totals.
const TOTAL_ITEMS = JSON.parse(readFileSync(new URL('../data/packages.json', import.meta.url), 'utf8')).length
const PAGE_SIZE = 100
const PAGE_2_ITEMS = TOTAL_ITEMS - PAGE_SIZE

const QUERIES = [
  '报关单品名和金额对不上怎么办',
  'HS编码归类和章品目对不上',
  '国自然申请书要不要匿名',
  '危化品临界量怎么算',
  '病案首页质控',
  '评标评分矩阵合计对不对',
  '护理记录时限签名',
  '银行流水对账',
]

/** @param {string} path */
async function get(path) {
  const response = await worker.fetch(new Request(`https://catalog.example${path}`))
  return { status: response.status, body: /** @type {any} */ (await response.json()) }
}

let passed = 0
let total = 0
for (const query of QUERIES) {
  total += 1
  const result = await get(`/v1/search?q=${encodeURIComponent(query)}&limit=3`)
  const names = (result.body.results ?? []).map((/** @type {any} */ hit) => hit.name)
  const ok = result.status === 200 && names.length > 0
  if (ok) passed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} /v1/search ${query} -> ${names.join(', ') || '(none)'}`)
}
total += 1
const plugin = await get('/v1/plugin?name=dsh-hs-classify')
if (plugin.status === 200 && plugin.body.name === 'dsh-hs-classify') passed += 1
console.log(`${plugin.status === 200 ? 'PASS' : 'FAIL'} /v1/plugin dsh-hs-classify`)
total += 1
const hubResult = await get('/v1/hubs')
if (hubResult.status === 200 && (hubResult.body.hubs ?? []).length === 10) passed += 1
console.log(`${(hubResult.body.hubs ?? []).length === 10 ? 'PASS' : 'FAIL'} /v1/hubs -> ${(hubResult.body.hubs ?? []).length} hubs`)
total += 1
const page1 = await get('/v1/plugins')
const page1ok = page1.status === 200 && page1.body.items.length === 100 && page1.body.page.total === TOTAL_ITEMS && page1.body.page.nextCursor === '100'
if (page1ok) passed += 1
console.log(`${page1ok ? 'PASS' : 'FAIL'} /v1/plugins page1 -> ${page1.body.items?.length} items, next=${page1.body.page?.nextCursor}`)
total += 1
const page2 = await get('/v1/plugins?cursor=100')
const page2ok = page2.status === 200 && page2.body.items.length === PAGE_2_ITEMS && page2.body.page.nextCursor === undefined
if (page2ok) passed += 1
console.log(`${page2ok ? 'PASS' : 'FAIL'} /v1/plugins page2 -> ${page2.body.items?.length} items, next=${page2.body.page?.nextCursor}`)
total += 1
const badCursor = await get('/v1/plugins?cursor=abc')
if (badCursor.status === 400) passed += 1
console.log(`${badCursor.status === 400 ? 'PASS' : 'FAIL'} /v1/plugins bad cursor -> ${badCursor.status}`)
total += 1
const missing = await get('/v1/search')
if (missing.status === 400) passed += 1
console.log(`${missing.status === 400 ? 'PASS' : 'FAIL'} /v1/search without q -> 400`)

// The Pages fallback must expose the same routes, not just /v1/plugins.
/** @param {string} path */
async function pagesGet(path) {
  const response = await onRequest({
    request: new Request(`https://catalog.example${path}`),
    next: async () => new Response('not found', { status: 404 }),
  })
  return { status: response.status, body: /** @type {any} */ (await response.json()) }
}
/** @type {[string, (body: any) => boolean, string][]} */
const pagesChecks = [
  ['/v1/search?q=HS%E7%BC%96%E7%A0%81', (/** @type {any} */ body) => body.results?.some((/** @type {any} */ hit) => hit.name === 'dsh-hs-classify'), 'search'],
  ['/v1/hubs', (/** @type {any} */ body) => (body.hubs ?? []).length === 10, 'hubs'],
  ['/v1/plugin?name=dsh-hs-classify', (/** @type {any} */ body) => body.name === 'dsh-hs-classify', 'plugin'],
  ['/v1/plugins?cursor=100', (/** @type {any} */ body) => body.items?.length === PAGE_2_ITEMS, 'pagination page2'],
]
for (const [path, check, label] of pagesChecks) {
  total += 1
  const result = await pagesGet(path)
  const ok = result.status === 200 && check(result.body)
  if (ok) passed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} pages ${label} -> ${result.status}`)
}

// The Vercel functions must expose the same API as the Workers/Pages entries.
/**
 * @param {any} handler
 * @param {string} path
 * @returns {Promise<{ status: number, body: any }>}
 */
const callVercel = (handler, path) => new Promise((resolve) => {
  /** @type {any} */
  const res = {
    statusCode: 0,
    headers: {},
    setHeader(/** @type {string} */ key, /** @type {string} */ value) { this.headers[key] = value },
    end(/** @type {string} */ body) { resolve({ status: this.statusCode, body: JSON.parse(body) }) },
  }
  handler({ url: path }, res)
})
/** @type {[any, string, (body: any) => boolean, string][]} */
const vercelChecks = [
  [vercelPlugins, '/v1/plugins?cursor=100', (/** @type {any} */ body) => body.items?.length === PAGE_2_ITEMS, 'pagination page2'],
  [vercelSearch, '/v1/search?q=HS%E7%BC%96%E7%A0%81', (/** @type {any} */ body) => body.results?.some((/** @type {any} */ hit) => hit.name === 'dsh-hs-classify'), 'search'],
  [vercelPlugin, '/v1/plugin?name=dsh-hs-classify', (/** @type {any} */ body) => body.name === 'dsh-hs-classify', 'plugin'],
  [vercelHubs, '/v1/hubs', (/** @type {any} */ body) => (body.hubs ?? []).length === 10, 'hubs'],
]
for (const [handler, path, check, label] of vercelChecks) {
  total += 1
  const result = await callVercel(handler, path)
  const ok = result.status === 200 && check(result.body)
  if (ok) passed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} vercel ${label} -> ${result.status}`)
}

const rate = Number(((passed / total) * 100).toFixed(1))
console.log(`worker smoke: ${passed}/${total} (${rate}%)`)
if (passed !== total) process.exit(1)
