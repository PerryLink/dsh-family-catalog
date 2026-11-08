// Offline replay of the DSH Desktop catalog search over the generated payload.
//
// Desktop's `matchesCatalogQuery` (dsh-community-market/src/catalog/service.ts,
// read 2026-11-01) does one thing: lower-case a fixed field list and test
// `includes(query)`. It does NOT tokenize, rank, stem, or look at
// displayNameZh / summaryZh / group / categories.
//
//   normalizedSearchText(item) =
//     [id, name, displayName, summary, description ?? '',
//      publisher?.name ?? '', ...(keywords ?? [])].join('\n')
//
// This script reproduces exactly that, in payload order (Desktop returns the
// filtered list in source order for `sort: relevance`), and scores the 26
// queries in data/discovery-bench.json.
//
// Usage:
//   node scripts/discovery-bench.mjs                 # replay deploy/ payload
//   node scripts/discovery-bench.mjs --source=data   # build items from data/ in memory
//   node scripts/discovery-bench.mjs --json          # machine-readable summary
//
// Exit code is 0 even when the score is low: P0 records the number, P1 sets a
// threshold. The `--fail-under=<n>` flag exists for the later CI gate.

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
const failUnder = Number(args.find((value) => value.startsWith('--fail-under='))?.slice('--fail-under='.length) ?? Number.NaN)

const bench = JSON.parse(stripBom(await readFile(`${base}/data/discovery-bench.json`, 'utf8')))

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

/** Build payload-shaped items from data/packages.json + data/npm-snapshot.json,
 *  mirroring scripts/build-catalog.mjs. Kept independent on purpose: the bench
 *  must be able to score the data before the deploy artifacts are rebuilt. */
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

const loaded = sourceArg === 'data' ? { items: await itemsFromData(), total: undefined } : await itemsFromPayload()
const items = /** @type {any[]} */ (loaded.items)
/** @type {{ item: any, text: string }[]} */
const indexed = items.map((item) => ({ item, text: normalizedSearchText(item) }))

const results = []
for (const entry of bench.queries) {
  const query = entry.query.toLocaleLowerCase('en-US')
  const hits = indexed.filter((row) => row.text.includes(query)).map((row) => row.item.name)
  const expected = entry.expected[0]
  const rank = hits.indexOf(expected) + 1
  results.push({
    id: entry.id,
    domain: entry.domain,
    query: entry.query,
    expected,
    rank: rank === 0 ? null : rank,
    top1: rank === 1,
    top3: rank >= 1 && rank <= 3,
    zero: hits.length === 0,
    top5: hits.slice(0, 5),
  })
}

const total = results.length
const top1 = results.filter((result) => result.top1).length
const top3 = results.filter((result) => result.top3).length
const zero = results.filter((result) => result.zero).length
const summary = {
  source: sourceArg === 'data' ? 'data/packages.json' : (payloadArg ?? 'deploy/artifacts/v1/plugins.json'),
  items: items.length,
  pageTotal: loaded.total,
  queries: total,
  top1,
  top3,
  zero,
  top3Rate: Number(((top3 / total) * 100).toFixed(1)),
  mrr5: Number((results.reduce((sum, result) => sum + (result.rank !== null && result.rank <= 5 ? 1 / result.rank : 0), 0) / total).toFixed(3)),
  misses: results.filter((result) => !result.top3).map((result) => result.id),
}

if (asJson) {
  console.log(JSON.stringify({ summary, results }, null, 2))
} else {
  console.log(`discovery-bench: ${summary.source} — ${items.length} items`)
  console.log(`top1 ${top1}/${total} · top3 ${top3}/${total} (${summary.top3Rate}%) · zero-result ${zero}/${total} · MRR@5 ${summary.mrr5}`)
  console.log('')
  for (const result of results) {
    const mark = result.top1 ? 'HIT1' : result.top3 ? 'HIT3' : result.zero ? 'ZERO' : `RANK${result.rank ?? '-'}`
    const shown = result.top5.length ? result.top5.join(', ') : '(no match)'
    console.log(`${mark.padEnd(6)} ${result.id.padEnd(18)} ${result.query.padEnd(22)} expected=${result.expected}  top5=[${shown}]`)
  }
  console.log('')
  console.log(`misses (not top3): ${summary.misses.length ? summary.misses.join(', ') : '(none)'}`)
}

if (Number.isFinite(failUnder) && summary.top3Rate < failUnder) {
  console.error(`discovery-bench: top3 rate ${summary.top3Rate}% is below --fail-under=${failUnder}%`)
  process.exit(1)
}
