// Smoke-test the deployed worker routes without deploying. Imports the
// Cloudflare worker (same code shape as the Deno worker) and calls its fetch
// with real Requests. Requires Node with JSON import attributes (22+).
//
// Usage: node scripts/worker-smoke.mjs
// Exit 1 if any route fails; prints a success rate for the P3 acceptance note.

import worker from '../deploy/cloudflare-worker.js'

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
const missing = await get('/v1/search')
if (missing.status === 400) passed += 1
console.log(`${missing.status === 400 ? 'PASS' : 'FAIL'} /v1/search without q -> 400`)

const rate = Number(((passed / total) * 100).toFixed(1))
console.log(`worker smoke: ${passed}/${total} (${rate}%)`)
if (passed !== total) process.exit(1)
