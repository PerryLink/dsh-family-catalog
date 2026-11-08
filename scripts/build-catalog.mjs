// Build the DSH Community Market standard-source artifacts from the npm
// snapshot (data/npm-snapshot.json) and the local table (data/packages.json).
// Usage: node scripts/build-catalog.mjs [deployOrigin]
// Outputs: artifacts/v1/plugins.json (provider page), catalog-source.json
// (manifest; endpoint = deployOrigin/v1/plugins, or an explicit placeholder
// when deployOrigin is omitted).
//
// ⚠️ Every item also carries the Chinese pair (`displayNameZh` / `summaryZh`) when
// data/packages.json declares it, so the market can render a Chinese name for a
// Chinese reader. Those two fields were in data/packages.json long before this
// generator read them; until 2026-10-13 it dropped them, which is why the live
// endpoint served 0 Chinese names for 96 items. `scripts/check-counts.mjs` now
// holds the ratio, so the drop cannot come back silently.
//
// 2026-11-08 (discoverability P0): the item also carries the two contract fields
// Desktop actually indexes for search — `keywords` and `description` (the 1.0.0
// item schema allows both; `displayNameZh`/`summaryZh` are display-only and are
// NOT searched). They are read from data/packages.json, so a row that has not
// been written yet emits no empty array/string. Desktop's `normalizedSearchText`
// joins id/name/displayName/summary/description/publisher/keywords, so a Chinese
// domain word reaches search only through these three text fields.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/** One row of data/npm-snapshot.json; only the fields this script reads. */
/** @typedef {{ name: string, description?: string, homepage?: string, license?: string, latest?: string, updatedAt?: string }} SnapshotRow */

const base = fileURLToPath(new URL('..', import.meta.url))
const deployOrigin = process.argv[2] ?? 'https://replace-with-deploy-origin.invalid'

/** @param {string} value */
const stripBom = (value) => value.replace(/^\uFEFF/, '')
const packages = JSON.parse(stripBom(await readFile(`${base}/data/packages.json`, 'utf8')))
const snapshot = JSON.parse(stripBom(await readFile(`${base}/data/npm-snapshot.json`, 'utf8')))
const byName = new Map(snapshot.map((/** @type {SnapshotRow} */ entry) => [entry.name, entry]))

// Strip control characters and bidi controls: the wire schema rejects them.
// Every call site passes a string (the `??` chain always ends in a literal);
// the internal typeof guard stays as the runtime safety net.
/** @param {string} value @returns {string} */
const clean = (value) => {
  if (typeof value !== 'string') return value
  return value.replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, ' ')
}
const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u

// 1.0.0 item schema: keywords is an array of ≤64 unique strings, each 1..64 chars.
// Data rows are hand-written, so normalize here rather than trusting every row:
// drop non-strings/empties, clean, trim, cap each item, de-duplicate, cap the list.
/** @param {unknown} value @returns {string[]|undefined} */
const keywordsOf = (value) => {
  if (!Array.isArray(value)) return undefined
  const seen = new Set()
  const out = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const keyword = clean(entry).trim().slice(0, 64)
    if (keyword.length === 0 || seen.has(keyword)) continue
    seen.add(keyword)
    out.push(keyword)
    if (out.length === 64) break
  }
  return out.length > 0 ? out : undefined
}

// description is optional on the wire (no minLength); drop an empty string so a
// blank row does not put an empty field on the page.
/** @param {unknown} value @returns {string|undefined} */
const descriptionOf = (value) => {
  if (typeof value !== 'string') return undefined
  const description = clean(value).slice(0, 5000)
  return description.length > 0 ? description : undefined
}

/** @type {any[]} */
const items = []
/** @type {any[]} */
const displayItems = []
for (const pkg of packages) {
  const npm = byName.get(pkg.npm)
  if (!npm) throw new Error(`npm snapshot missing for ${pkg.npm}`)
  const repositoryUrl = `https://github.com/${pkg.repo}`
  const iconSlug = pkg.npm.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '-')
  const displayName = clean(pkg.displayName)
  const displayNameZh = typeof pkg.displayNameZh === 'string' && pkg.displayNameZh.length > 0 ? clean(pkg.displayNameZh) : undefined
  const summaryZh = typeof pkg.summaryZh === 'string' && pkg.summaryZh.length > 0 ? clean(pkg.summaryZh).slice(0, 1000) : undefined
  const englishSummary = clean(pkg.summary ?? npm.description ?? `${pkg.displayName}: DeepSeek Harness (dsh) plugin.`).slice(0, 1000)
  // 1.0.0 has no displayNameZh/summaryZh. Put the Chinese name inside the
  // schema-valid displayName ("English — 中文") and, when the English summary is
  // Latin-only, prepend summaryZh. Chinese therefore stays visible AND searchable
  // without an extension field; the pure Chinese pair moves to display.json.
  const nameSuffix = displayNameZh === undefined ? '' : ` — ${displayNameZh}`
  const displayNameWithZh = displayName.length + nameSuffix.length <= 120 ? `${displayName}${nameSuffix}` : displayName
  const summary = summaryZh !== undefined && !CJK.test(englishSummary)
    ? `${summaryZh} ${englishSummary}`.slice(0, 1000)
    : englishSummary
  // The public httpsUri pattern rejects fragments; npm homepages often end in #readme.
  const rawHomepage = npm.homepage && /^https:/.test(npm.homepage) ? npm.homepage : repositoryUrl
  const homepage = rawHomepage.split('#')[0]
  const keywords = keywordsOf(pkg.keywords)
  const description = descriptionOf(pkg.description)
  const item = {
    id: pkg.npm.startsWith('@') ? pkg.npm.slice(1) : pkg.npm,
    name: pkg.npm,
    displayName: displayNameWithZh,
    summary,
    ...(description === undefined ? {} : { description }),
    ...(keywords === undefined ? {} : { keywords }),
    homepage,
    latestVersion: npm.latest,
    license: typeof npm.license === 'string' && npm.license.length <= 80 ? npm.license : undefined,
    categories: pkg.categories,
    repository: { url: repositoryUrl },
    package: { registry: 'npm', name: pkg.npm },
    publisher: { name: 'PerryLink', url: 'https://github.com/PerryLink' },
    media: { icon: { url: `${deployOrigin}/icons/${iconSlug}.png`, alt: (displayNameZh ?? displayName).slice(0, 120) } },
    updatedAt: npm.updatedAt,
  }
  items.push(item)
  // Display/status metadata that the 1.0.0 item schema does not allow. It is
  // served as a separate sidecar so nothing is lost while the provider page stays
  // strictly conformant.
  displayItems.push({
    name: pkg.npm,
    ...(displayNameZh === undefined ? {} : { displayNameZh }),
    ...(summaryZh === undefined ? {} : { summaryZh }),
    ...(pkg.status === undefined ? {} : { status: pkg.status }),
    ...(pkg.group === undefined ? {} : { group: pkg.group }),
    ...(pkg.requires === undefined ? {} : { requires: pkg.requires }),
    ...(pkg.difficulty === undefined ? {} : { difficulty: pkg.difficulty }),
    ...(pkg.conflicts === undefined ? {} : { conflicts: pkg.conflicts }),
  })
}

const page = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  revision: `perrylink-dsh-catalog-${new Date().toISOString().slice(0, 10)}`,
  items,
  page: { total: items.length },
}

// The manifest description states the count in prose, so it must also state what the
// count is OF: `check-counts.mjs` holds the `N-package` token to data/packages.json's
// row count, and the composition is derived here rather than typed, because one row in
// this table is a third-party package (`Phocinae/dsh-phocinae`) and calling all 96
// "PerryLink" would overstate the family.
const familyRows = packages.filter((/** @type {{ repo: string }} */ pkg) => pkg.repo.startsWith('PerryLink/')).length
const thirdPartyRows = packages.length - familyRows

const manifest = {
  manifestVersion: '1.0.0',
  providerId: 'com.perrylink.dsh-catalog',
  name: 'PerryLink DSH Catalog',
  description:
    `Official catalog of the ${packages.length}-package PerryLink DeepSeek Harness plugin family on npm: ` +
    `${familyRows} family repositories plus ${thirdPartyRows} third-party package catalogued alongside them.`,
  homepage: 'https://github.com/PerryLink/dsh-family-catalog',
  attribution: { name: 'PerryLink', url: 'https://github.com/PerryLink' },
  transport: { kind: 'https-json', endpoint: `${deployOrigin}/v1/plugins`, method: 'GET' },
  // The runtime scans with limit=100 and rejects a page over the effective
  // limit, so the catalog is served in 100-item cursor pages.
  query: { supported: ['cursor', 'limit'], defaultLimit: 100, maxLimit: 100, sorts: /** @type {string[]} */ ([]) },
}

const display = {
  schemaVersion: 1,
  note: 'Display/status metadata that the public 1.0.0 item schema does not allow. Keyed by npm name; not part of /v1/plugins.',
  items: displayItems,
}

await mkdir(`${base}/artifacts/v1`, { recursive: true })
await writeFile(`${base}/artifacts/v1/plugins.json`, `${JSON.stringify(page, null, 2)}\n`)
await writeFile(`${base}/artifacts/v1/display.json`, `${JSON.stringify(display, null, 2)}\n`)
await writeFile(`${base}/catalog-source.json`, `${JSON.stringify(manifest, null, 2)}\n`)
// The deploy unit (deploy/deno-worker.js) imports its payload with
// ./-relative specifiers, so it must be self-contained: mirror both
// artifacts into deploy/ so any Deno Deploy project rooted at deploy/
// (or the whole repo) serves the same content.
await mkdir(`${base}/deploy/artifacts/v1`, { recursive: true })
await writeFile(`${base}/deploy/artifacts/v1/plugins.json`, `${JSON.stringify(page, null, 2)}\n`)
await writeFile(`${base}/deploy/artifacts/v1/display.json`, `${JSON.stringify(display, null, 2)}\n`)
await writeFile(`${base}/deploy/catalog-source.json`, `${JSON.stringify(manifest, null, 2)}\n`)
// Runtime-neutral pagination helper used by both workers and the Pages Function.
const pageCore = await readFile(`${base}/lib/catalog-page.mjs`, 'utf8')
await writeFile(`${base}/deploy/catalog-page.mjs`, pageCore)
console.log(`built ${items.length} items -> artifacts/v1/plugins.json + deploy/ copies (endpoint ${deployOrigin}/v1/plugins)`)
