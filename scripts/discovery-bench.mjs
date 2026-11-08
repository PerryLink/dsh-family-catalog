// Offline replay of the discovery bench in two modes.
//
//   --source=payload  DSH Desktop's real search logic: normalizedSearchText +
//                     whole-string `includes` over deploy/artifacts/v1/plugins.json
//                     (id/name/displayName/summary/description/publisher/keywords).
//   --source=data     Same logic, but items are assembled from data/ in memory.
//   --source=index    P1 search index (search.mjs): Chinese n-grams + synonyms +
//                     weighted fields over deploy/artifacts/v1/search-index.json.
//
// Usage:
//   node scripts/discovery-bench.mjs                      # Desktop replay
//   node scripts/discovery-bench.mjs --source=index       # sidecar index
//   node scripts/discovery-bench.mjs --json
//   node scripts/discovery-bench.mjs --fail-under=85      # CI gate (top3 %)
//
// Exit code is 0 unless --fail-under is given and the top3 rate is below it.

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
/** @param {string} value */
const stripBom = (value) => value.replace(/^\uFEFF/, '')

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const sourceArg = args.find((value) => value.startsWith('--source='))?.slice('--source='.length) ?? 'payload'
const payloadArg = args.find((value) => value.startsWith('--payload='))?.slice('--payload='.length)
const benchArg = args.find((value) => value.startsWith('--bench-file='))?.slice('--bench-file='.length)
const failUnder = Number(args.find((value) => value.startsWith('--fail-under='))?.slice('--fail-under='.length) ?? Number.NaN)

const benchFile = benchArg ?? `${base}/data/discovery-bench.json`
const bench = JSON.parse(stripBom(await readFile(benchFile.startsWith('/') ? benchFile : `${base}/${benchFile}`, 'utf8')))

/** Desktop's normalized search blob. @param {any} item */
const normalizedSearchText = (item) => [
  item.id,
  item.name,
  item.displayName,
  item.summary,
  item.description ?? '',
  item.publisher?.name ?? '',
  ...(item.keywords ?? []),
].join('\n').toLocaleLowerCase('en-US')

/** Build payload-shaped items from data/, mirroring scripts/build-catalog.mjs. */
async function itemsFromData() {
  const packages = /** @type {any[]} */ (JSON.parse(stripBom(await readFile(`${base}/data/packages.json`, 'utf8'))))
  const snapshot = /** @type {any[]} */ (JSON.parse(stripBom(await readFile(`${base}/data/npm-snapshot.json`, 'utf8'))))
  const byName = new Map(snapshot.map((entry) => [entry.name, entry]))
  return packages.map((pkg) => {
    const npm = byName.get(pkg.npm) ?? {}
    return {
      id: pkg.npm.startsWith('@') ? pkg.npm.slice(1) : pkg.npm,
      name: pkg.npm,
      displayName: pkg.displayName,
      summary: pkg.summary ?? npm.description ?? `${pkg.displayName}: DeepSeek Harness (dsh) plugin.`,
      description: pkg.description,
      keywords: pkg.keywords,
      publisher: { name: 'PerryLink' },
    }
  })
}

async function itemsFromPayload() {
  const file = payloadArg ?? `${base}/deploy/artifacts/v1/plugins.json`
  if (!existsSync(file)) throw new Error(`payload not found: ${file} (run scripts/build-catalog.mjs <origin> first)`)
  const page = JSON.parse(stripBom(await readFile(file, 'utf8')))
  return { items: page.items, total: page.page?.total }
}

/** @param {any[]} results @param {string} source @param {number|undefined} pageTotal @param {number} items */
function summarize(results, source, pageTotal, items) {
  const total = results.length
  const top1 = results.filter((result) => result.rank === 1).length
  const top3 = results.filter((result) => result.rank !== null && result.rank <= 3).length
  const zero = results.filter((result) => result.zero).length
  const mrr5 = Number((results.reduce((sum, result) => sum + (result.rank !== null && result.rank <= 5 ? 1 / result.rank : 0), 0) / total).toFixed(3))
  return {
    source,
    items,
    pageTotal,
    queries: total,
    top1,
    top3,
    zero,
    top3Rate: Number(((top3 / total) * 100).toFixed(1)),
    mrr5,
    misses: results.filter((result) => result.rank === null || result.rank > 3).map((result) => result.id),
  }
}

/** @param {any} summary @param {any[]} results */
function report(summary, results) {
  console.log(`discovery-bench: ${summary.source} — ${summary.items} items, ${summary.queries} queries (${benchFile.split('/').pop()})`)
  console.log(`top1 ${summary.top1}/${summary.queries} · top3 ${summary.top3}/${summary.queries} (${summary.top3Rate}%) · zero-result ${summary.zero}/${summary.queries} · MRR@5 ${summary.mrr5}`)
  console.log('')
  for (const result of results) {
    const mark = result.rank === 1 ? 'HIT1' : result.rank !== null && result.rank <= 3 ? 'HIT3' : result.zero ? 'ZERO' : `RANK${result.rank ?? '-'}`
    const shown = result.top5.length ? result.top5.join(', ') : '(no match)'
    console.log(`${mark.padEnd(6)} ${result.id.padEnd(18)} ${result.query.padEnd(24)} expected=${result.expected}  top5=[${shown}]`)
  }
  console.log('')
  console.log(`misses (not top3): ${summary.misses.length ? summary.misses.join(', ') : '(none)'}`)
}

/** @type {any[]} */
let results
let items
let pageTotal

if (sourceArg === 'index') {
  const { search, loadIndex } = await import('./search.mjs')
  const index = await loadIndex()
  items = index.items.length
  results = []
  for (const entry of bench.queries) {
    const response = search(entry.query, { index, limit: 5 })
    const names = response.results.map((hit) => hit.name)
    const position = names.indexOf(entry.expected[0]) + 1
    results.push({
      id: entry.id,
      domain: entry.domain,
      query: entry.query,
      expected: entry.expected[0],
      rank: position === 0 ? null : position,
      zero: response.results.length === 0,
      top5: names,
    })
  }
} else {
  const loaded = sourceArg === 'data' ? { items: await itemsFromData(), total: undefined } : await itemsFromPayload()
  const loadedItems = /** @type {any[]} */ (loaded.items)
  items = loadedItems.length
  pageTotal = loaded.total
  /** @type {{ item: any, text: string }[]} */
  const indexed = loadedItems.map((item) => ({ item, text: normalizedSearchText(item) }))
  results = []
  for (const entry of bench.queries) {
    const query = entry.query.toLocaleLowerCase('en-US')
    const hits = indexed.filter((row) => row.text.includes(query)).map((row) => row.item.name)
    const position = hits.indexOf(entry.expected[0]) + 1
    results.push({
      id: entry.id,
      domain: entry.domain,
      query: entry.query,
      expected: entry.expected[0],
      rank: position === 0 ? null : position,
      zero: hits.length === 0,
      top5: hits.slice(0, 5),
    })
  }
}

const source = sourceArg === 'index' ? 'search-index.json (P1 index)' : sourceArg === 'data' ? 'data/packages.json' : (payloadArg ?? 'deploy/artifacts/v1/plugins.json')
const summary = summarize(results, source, pageTotal, items)

if (asJson) {
  console.log(JSON.stringify({ summary, results }, null, 2))
} else {
  report(summary, results)
}

if (Number.isFinite(failUnder) && summary.top3Rate < failUnder) {
  console.error(`discovery-bench: top3 rate ${summary.top3Rate}% is below --fail-under=${failUnder}%`)
  process.exit(1)
}
