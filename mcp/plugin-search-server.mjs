#!/usr/bin/env node
// Minimal stdio MCP server for the discovery index. No dependencies.
//
// Tools:
//   plugin_search(query, domain?, task?, audience?, limit?)  -> ranked plugins
//   plugin_get(name)                                        -> one full record
//
// Run: node mcp/plugin-search-server.mjs
// Point an MCP client at that command (stdio transport). Everything is read
// from deploy/artifacts/v1/search-index.json; no GitHub/npm call at runtime.
//
// The tool description carries six Chinese example queries on purpose: that is
// the surface a coding agent reads before choosing a search phrase.

import { createInterface } from 'node:readline'
import { loadIndex, search } from '../scripts/search.mjs'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'dsh-plugin-search', version: '1.0.0' }

/** @type {any} */
let index

const TOOLS = [
  {
    name: 'plugin_search',
    description: [
      'Search the PerryLink DSH plugin catalog by Chinese domain word, role, standard number or a natural-language question.',
      '中文示例问法：',
      '1. HS编码归类和章品目对不上',
      '2. 报关单品名和金额对不上怎么办',
      '3. 国自然申请书要不要匿名',
      '4. 危化品临界量怎么算',
      '5. 病案首页质控查什么',
      '6. 评标评分矩阵合计对不对',
      'Returns name, Chinese name, matched_on, why and the install command.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '中文领域词/岗位词/标准号/自然语言问法' },
        domain: { type: 'string', description: 'Optional facet filter, e.g. customs, ehs, finance' },
        task: { type: 'string', description: 'Optional facet filter, e.g. checker, reconciliation' },
        audience: { type: 'string', description: 'Optional audience filter, e.g. 报关员' },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'plugin_get',
    description: 'Get one plugin record by npm name (aliases, facets, maturity, coverage, related, demo prompt).',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'npm package name, e.g. dsh-hs-classify' } },
      required: ['name'],
      additionalProperties: false,
    },
  },
]

/** @param {any} payload */
const send = (payload) => process.stdout.write(`${JSON.stringify(payload)}\n`)
/** @param {number|string|null} id @param {any} result */
const reply = (id, result) => send({ jsonrpc: '2.0', id, result })
/** @param {number|string|null} id @param {number} code @param {string} message */
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } })

/** @param {any} params */
function callTool(params) {
  const name = params?.name
  const args = params?.arguments ?? {}
  if (name === 'plugin_search') {
    if (typeof args.query !== 'string' || args.query.trim().length === 0) throw new Error('query is required')
    const result = search(args.query, {
      index,
      limit: Number(args.limit ?? 5),
      domain: args.domain,
      task: args.task,
      audience: args.audience,
    })
    return {
      content: [{ type: 'text', text: JSON.stringify({ query: result.query, expansions: result.expansions, results: result.results }, null, 2) }],
    }
  }
  if (name === 'plugin_get') {
    const item = index.items.find((/** @type {any} */ row) => row.name === args.name)
    if (!item) return { content: [{ type: 'text', text: `plugin not found: ${args.name}` }], isError: true }
    return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] }
  }
  return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true }
}

/** @param {any} message */
async function handle(message) {
  if (!message || message.jsonrpc !== '2.0') return
  const { id, method, params } = message
  const isNotification = id === undefined || id === null
  if (method === 'initialize') {
    reply(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO })
    return
  }
  if (method === 'notifications/initialized') return
  if (method === 'ping') { if (!isNotification) reply(id, {}); return }
  if (method === 'tools/list') { reply(id, { tools: TOOLS }); return }
  if (method === 'tools/call') {
    try {
      reply(id, callTool(params ?? {}))
    } catch (error) {
      fail(id, -32602, error instanceof Error ? error.message : String(error))
    }
    return
  }
  if (!isNotification) fail(id, -32601, `method not found: ${method}`)
}

index = await loadIndex()
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
rl.on('line', (line) => {
  const trimmed = line.trim()
  if (trimmed.length === 0) return
  let message
  try {
    message = JSON.parse(trimmed)
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })
    return
  }
  Promise.resolve(handle(message)).catch((error) => {
    if (message?.id !== undefined) fail(message.id, -32603, error instanceof Error ? error.message : String(error))
  })
})
process.stderr.write('dsh-plugin-search MCP server ready on stdio\n')
