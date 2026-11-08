// Smoke-test the stdio MCP server: spawn it, initialize, then call
// plugin_search six times with the Chinese example queries from the tool
// description, plus one plugin_get. No client SDK required.
//
// Usage: node scripts/mcp-smoke.mjs
// Exit 1 if the success rate is below 100%; prints the rate for P3 acceptance.

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
const QUERIES = [
  '报关单品名和金额对不上怎么办',
  '国自然申请书要不要匿名',
  '危化品临界量怎么算',
  '病案首页质控查什么',
  '评标评分矩阵合计对不对',
  'HS编码归类和章品目对不上',
]

const child = spawn(process.execPath, [`${base}/mcp/plugin-search-server.mjs`], { stdio: ['pipe', 'pipe', 'pipe'] })
/** @type {Map<number, (value: any) => void>} */
const pending = new Map()
const rl = createInterface({ input: child.stdout })
rl.on('line', (line) => {
  const message = JSON.parse(line)
  const resolve = pending.get(message.id)
  if (resolve) {
    pending.delete(message.id)
    resolve(message)
  }
})
child.stderr.on('data', () => {})

/** @param {number} id @param {string} method @param {any} params */
const request = (id, method, params) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`timeout: ${method}`)), 10_000)
  pending.set(id, (message) => { clearTimeout(timer); resolve(message) })
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
})

let passed = 0
let total = 0
try {
  const init = await request(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } })
  if (init.result?.serverInfo?.name === 'dsh-plugin-search') passed += 1
  total += 1
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
  const tools = await request(2, 'tools/list', {})
  const names = (tools.result?.tools ?? []).map((/** @type {any} */ tool) => tool.name)
  if (names.includes('plugin_search') && names.includes('plugin_get')) passed += 1
  total += 1
  console.log(`PASS tools/list -> ${names.join(', ')}`)

  for (const [offset, query] of QUERIES.entries()) {
    const response = await request(10 + offset, 'tools/call', { name: 'plugin_search', arguments: { query, limit: 3 } })
    const text = response.result?.content?.[0]?.text ?? '{}'
    const payload = JSON.parse(text)
    const hits = (payload.results ?? []).map((/** @type {any} */ hit) => hit.name)
    const ok = hits.length > 0
    if (ok) passed += 1
    total += 1
    console.log(`${ok ? 'PASS' : 'FAIL'} plugin_search ${query} -> ${hits.join(', ') || '(none)'}`)
  }

  const detail = await request(30, 'tools/call', { name: 'plugin_get', arguments: { name: 'dsh-hs-classify' } })
  const detailPayload = JSON.parse(detail.result?.content?.[0]?.text ?? '{}')
  const detailOk = detailPayload.name === 'dsh-hs-classify'
  if (detailOk) passed += 1
  total += 1
  console.log(`${detailOk ? 'PASS' : 'FAIL'} plugin_get dsh-hs-classify`)
} finally {
  child.stdin.end()
  child.kill()
}

const rate = Number(((passed / total) * 100).toFixed(1))
console.log(`mcp smoke: ${passed}/${total} (${rate}%)`)
if (passed !== total) process.exit(1)
