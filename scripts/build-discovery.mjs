// Build the discovery search index from data/discovery.json (top 40, rich) plus
// data/packages.json (the other 86, basic). Output is a sidecar: it is NOT part
// of the 1.0.0 catalog item schema and never enters deploy/artifacts/v1/plugins.json.
//
// Usage: node scripts/build-discovery.mjs
// Outputs: artifacts/v1/search-index.json + deploy/artifacts/v1/search-index.json
//
// Why a sidecar: 1.0.0 items only carry summary/description/keywords/categories.
// The discovery layer adds aliases, searchPhrases, audience, facets, maturity and
// coverage, and a searchText that includes the Chinese display/summary fields the
// catalog page cannot index. Desktop keeps using the 1.0.0 page; the search API
// and MCP server read this index.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
/** @param {string} value */
const stripBom = (value) => value.replace(/^\uFEFF/, '')
/** @param {string} relative */
const readJson = async (relative) => JSON.parse(stripBom(await readFile(`${base}/${relative}`, 'utf8')))

const packages = await readJson('data/packages.json')
const discovery = await readJson('data/discovery.json')
const snapshot = await readJson('data/npm-snapshot.json')
const byName = new Map(discovery.map((/** @type {any} */ record) => [record.name, record]))
const snapByName = new Map(snapshot.map((/** @type {any} */ record) => [record.name, record]))
const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u

/** Conservative, version-based maturity for rows with no authored value. @param {any} pkg */
const deriveMaturity = (pkg) => {
  if (pkg.status === 'retired') return 'retired'
  if (pkg.status === 'frozen') return 'preview'
  const version = snapByName.get(pkg.npm)?.latest ?? ''
  const major = Number(version.split('.')[0])
  return Number.isFinite(major) && major >= 1 ? 'stable' : 'beta'
}

const items = packages.map((/** @type {any} */ pkg) => {
  const record = byName.get(pkg.npm)
  const keywords = Array.isArray(pkg.keywords) ? pkg.keywords : []
  const aliases = record?.aliases ?? keywords
  const audience = record?.audience ?? []
  const facets = record?.facets ?? {}
  const maturity = record?.maturity ?? deriveMaturity(pkg)
  const coverage = record?.coverage ?? { lastReviewed: '2026-11-08' }
  const searchPhrases = record?.searchPhrases ?? []
  const standards = Array.isArray(facets.standards) ? facets.standards : []
  const searchText = [
    pkg.npm,
    pkg.displayName,
    pkg.displayNameZh,
    pkg.summary,
    pkg.summaryZh,
    ...(aliases ?? []),
    ...keywords,
    ...(searchPhrases ?? []),
    ...audience,
    ...standards,
    ...((Array.isArray(facets.domains) ? facets.domains : [])),
    ...((Array.isArray(facets.tasks) ? facets.tasks : [])),
  ].filter((value) => typeof value === 'string' && value.length > 0).join('\n')
  return {
    name: pkg.npm,
    displayName: pkg.displayName,
    displayNameZh: pkg.displayNameZh,
    summary: pkg.summary,
    summaryZh: pkg.summaryZh,
    aliases: aliases ?? [],
    keywordsZh: keywords.filter((/** @type {any} */ keyword) => CJK.test(keyword)),
    keywordsEn: keywords.filter((/** @type {any} */ keyword) => !CJK.test(keyword)),
    searchPhrases,
    audience,
    facets: {
      domains: Array.isArray(facets.domains) ? facets.domains : [],
      subdomains: Array.isArray(facets.subdomains) ? facets.subdomains : [],
      tasks: Array.isArray(facets.tasks) ? facets.tasks : [],
      artifacts: Array.isArray(facets.artifacts) ? facets.artifacts : [],
      jurisdictions: Array.isArray(facets.jurisdictions) ? facets.jurisdictions : [],
      standards,
    },
    maturity,
    maintenance: pkg.status ?? 'unknown',
    coverage,
    related: record?.related ?? [],
    demoPrompt: record?.demoPrompt ?? null,
    lang: [pkg.summaryZh ? 'zh' : '', pkg.summary ? 'en' : ''].filter(Boolean),
    updatedAt: snapByName.get(pkg.npm)?.updatedAt ?? null,
    source: record ? 'discovery' : 'catalog',
    searchText,
  }
})

const index = {
  schemaVersion: 1,
  generatedBy: 'scripts/build-discovery.mjs',
  // No timestamp: the index is rebuilt from data/ and must be byte-reproducible.
  source: { discovery: discovery.length, packages: packages.length },
  count: items.length,
  items,
}

const json = `${JSON.stringify(index, null, 2)}\n`
await mkdir(`${base}/artifacts/v1`, { recursive: true })
await writeFile(`${base}/artifacts/v1/search-index.json`, json)
await mkdir(`${base}/deploy/artifacts/v1`, { recursive: true })
await writeFile(`${base}/deploy/artifacts/v1/search-index.json`, json)
// The deploy/ folder must be self-contained: ship the runtime-neutral search
// core next to the index so the Deno and Cloudflare workers import it locally.
const core = await readFile(`${base}/lib/search-core.mjs`, 'utf8')
await writeFile(`${base}/deploy/search-core.mjs`, core)
console.log(`built search index: ${items.length} items (${discovery.length} with discovery metadata) -> artifacts/v1/search-index.json + deploy/ copy (+ search-core.mjs)`)
