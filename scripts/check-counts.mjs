// One source of truth for the family size: data/packages.json.
//
// The repository states that number in several human-readable places (README
// summaries, the manifest description) and in two machine-read ones (the page's
// items/page.total, the deploy live-smoke lower bound). It drifted once — the
// README and the manifest claimed 44 packages while the shipped page carried 43
// — because every site was hand-maintained. This script derives the count from
// data/packages.json and holds every site to it, so the number is produced by a
// script rather than typed:
//
//   node scripts/check-counts.mjs          # verify (CI + pre-push gate)
//   node scripts/check-counts.mjs --write   # rewrite the README sites from the source
//
// Read-only unless --write is passed; --write touches README.md only (the deploy
// artifacts belong to scripts/build-catalog.mjs, which writes them from the same
// source).

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
const write = process.argv.includes('--write')
const asJson = process.argv.includes('--json')
/** @param {string} value */
const stripBom = (value) => value.replace(/^\uFEFF/, '')
/** @param {string} relative */
const readText = async (relative) => stripBom(await readFile(`${base}/${relative}`, 'utf8'))
/** @param {string} relative */
const readJson = async (relative) => JSON.parse(await readText(relative))

/** @type {string[]} */
const failures = []
const packages = await readJson('data/packages.json')
const count = packages.length
// The manifest and the Chinese README state the family/third-party split in
// prose too; derive it from the same source instead of typing it.
const familyRows = packages.filter((/** @type {{ repo?: unknown }} */ row) => typeof row.repo === 'string' && row.repo.startsWith('PerryLink/')).length

// 1. The shipped payload (deploy/ mirrors) must carry exactly the source count.
const page = await readJson('deploy/artifacts/v1/plugins.json')
if (page.items.length !== count) {
  failures.push(`deploy/artifacts/v1/plugins.json: ${page.items.length} items != ${count} rows in data/packages.json`)
}
if (page.page.total !== count) {
  failures.push(`deploy/artifacts/v1/plugins.json: page.total ${page.page.total} != ${count} rows in data/packages.json`)
}

// 2. Chinese metadata moved to the display sidecar when the provider page was
//    made strictly 1.0.0-conformant (the item schema has no displayNameZh /
//    summaryZh). The ratio still has one source of truth: a row in
//    data/packages.json, and display.json must carry all of them.
/** @param {{ displayNameZh?: unknown, summaryZh?: unknown }} row */
const hasZh = (row) =>
  typeof row.displayNameZh === 'string' && row.displayNameZh.length > 0 &&
  typeof row.summaryZh === 'string' && row.summaryZh.length > 0
const display = await readJson('deploy/artifacts/v1/display.json')
const zhRows = packages.filter(hasZh).length
const zhItems = display.items.filter(hasZh).length
if (zhRows !== count) {
  failures.push(`data/packages.json: ${zhRows} of ${count} rows carry both displayNameZh and summaryZh; the family rule (2026-10-13) is all of them`)
}
if (zhItems !== zhRows) {
  failures.push(
    `deploy/artifacts/v1/display.json: ${zhItems} rows carry both Chinese fields but data/packages.json has ${zhRows} — rebuild with node scripts/build-catalog.mjs <deployOrigin>`,
  )
}
// The page itself must still show Chinese: displayName is bilingual.
const zhNames = page.items.filter((/** @type {{ displayName?: unknown }} */ item) =>
  typeof item.displayName === 'string' && /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u.test(item.displayName)).length
if (zhNames !== count) failures.push(`deploy/artifacts/v1/plugins.json: ${zhNames} of ${count} displayName values carry CJK`)

// 3. The manifest description states the count in prose.
const manifest = await readJson('deploy/catalog-source.json')
if (!new RegExp(`\\b${count}-package\\b`).test(manifest.description ?? '')) {
  failures.push(
    `deploy/catalog-source.json: description must state the derived ${count}-package count (got "${manifest.description}")`,
  )
}

// 3. README count sites. `--write` rewrites each site from the source; the
//    check mode fails instead. A site whose pattern no longer matches is a hard
//    failure: silent pattern drift would turn this gate green while the number
//    rots again.
/**
 * @typedef {object} CountSite
 * @property {string} name
 * @property {RegExp} pattern
 * @property {(match: string, ...groups: string[]) => string} replace
 * @property {(match: RegExpMatchArray) => string | undefined} [stale]
 */

/** @type {CountSite[]} */
const readmeSites = [
  {
    name: 'README.md bounded page note (EN)',
    pattern: /(serves the complete )(\d+)(-item catalog in cursor pages)/,
    replace: (match, before, _stale, after) => `${before}${count}${after}`,
  },
  {
    name: 'README.md Chinese source note (ZH)',
    pattern: /(：)(\d+)( 个 npm 包（)(\d+)( 个 PerryLink 仓)/,
    replace: (match, before, _stale, middle, _staleFamily, after) => `${before}${count}${middle}${familyRows}${after}`,
    stale: (match) => {
      if (match[2] === String(count) && match[4] === String(familyRows)) return undefined
      return `states ${match[2]} packages / ${match[4]} family repos`
    },
  },
]

let readme = await readText('README.md')
let rewritten = false
for (const site of readmeSites) {
  const match = readme.match(site.pattern)
  if (!match) {
    failures.push(
      `${site.name}: count site not found — update the pattern in scripts/check-counts.mjs if the wording changed`,
    )
    continue
  }
  const stale = site.stale ? site.stale(match) : (match[2] === String(count) ? undefined : `states ${match[2]}`)
  if (stale === undefined) continue
  if (write) {
    readme = readme.replace(site.pattern, site.replace)
    rewritten = true
  } else {
    failures.push(`${site.name}: ${stale}, derived count is ${count}`)
  }
}

// 4. The deploy live-smoke asserts a lower bound on the served item count. The
//    bound may lag the roster (it is a floor, not the count), but it must never
//    exceed what the roster can deliver or the smoke would be unsatisfiable.
const deployWorkflow = await readText('.github/workflows/deploy.yml')
const bound = deployWorkflow.match(/items\.length<(\d+)/)
if (!bound) {
  failures.push('.github/workflows/deploy.yml: live-smoke item-count lower bound not found — update the pattern')
} else if (Number(bound[1]) > count) {
  failures.push(
    `.github/workflows/deploy.yml: live-smoke lower bound ${bound[1]} exceeds the derived count ${count}`,
  )
}

if (failures.length) {
  console.error(`FAIL ${failures.length} count checks:\n- ${failures.join('\n- ')}`)
  if (!write) {
    console.error('\nhint: node scripts/check-counts.mjs --write rewrites the README count sites from data/packages.json')
  }
  process.exit(1)
}

if (asJson && failures.length === 0) {
  console.log(JSON.stringify({ items: count, zh: zhRows }, null, 2))
} else if (write && rewritten) {
  await writeFile(`${base}/README.md`, readme)
  console.log(`counts written: README count sites now state ${count} (source: data/packages.json)`)
} else {
  console.log(
    `counts ok: ${count} packages derived from data/packages.json; README, manifest description and shipped page agree`,
  )
}
