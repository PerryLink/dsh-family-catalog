// Node wrapper around lib/search-core.mjs: loads the sidecar index from disk and
// adds the CLI used by the bench and by humans.
//
// Usage (library):
//   import { search } from './search.mjs'
//   const { results } = search('HS编码')
//
// Usage (CLI):
//   node scripts/search.mjs "报关单品名对不上" --limit=5
//   node scripts/search.mjs "危化品" --domain=ehs --json

import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { search as searchIndex } from '../lib/search-core.mjs'

export { SYNONYM_GROUPS, normalize, compact, grams, cleanQuery, expand } from '../lib/search-core.mjs'

const base = fileURLToPath(new URL('..', import.meta.url))
const DEFAULT_INDEX = `${base}/deploy/artifacts/v1/search-index.json`
const FALLBACK_INDEX = `${base}/artifacts/v1/search-index.json`

/** @type {any} */
let cachedIndex

export function loadIndexSync() {
  if (cachedIndex !== undefined) return cachedIndex
  const file = existsSync(DEFAULT_INDEX) ? DEFAULT_INDEX : FALLBACK_INDEX
  cachedIndex = JSON.parse(readFileSync(file, 'utf8'))
  return cachedIndex
}

/** Async loader used by the API/MCP entry points. */
export async function loadIndex(file = DEFAULT_INDEX) {
  const target = existsSync(file) ? file : FALLBACK_INDEX
  cachedIndex = JSON.parse(await readFile(target, 'utf8'))
  return cachedIndex
}

/**
 * @param {string} query
 * @param {{ index?: any, limit?: number, domain?: string, task?: string, audience?: string }} [options]
 */
export function search(query, options = {}) {
  return searchIndex(options.index ?? loadIndexSync(), query, options)
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('search.mjs')) {
  const args = process.argv.slice(2)
  const query = args.find((value) => !value.startsWith('--')) ?? ''
  const limit = Number(args.find((value) => value.startsWith('--limit='))?.slice('--limit='.length) ?? 5)
  const domain = args.find((value) => value.startsWith('--domain='))?.slice('--domain='.length)
  const task = args.find((value) => value.startsWith('--task='))?.slice('--task='.length)
  const audience = args.find((value) => value.startsWith('--audience='))?.slice('--audience='.length)
  const asJson = args.includes('--json')
  const result = search(query, { limit, domain, task, audience })
  if (asJson) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`query: ${result.query}${result.expansions.length ? `  expansions: ${result.expansions.join(', ')}` : ''}`)
    for (const [position, hit] of result.results.entries()) {
      console.log(`${position + 1}. ${hit.name} (${hit.score}) — ${hit.displayNameZh}`)
      console.log(`   ${hit.why}`)
      console.log(`   ${hit.install}`)
    }
    if (result.results.length === 0) console.log('(no match)')
  }
}
